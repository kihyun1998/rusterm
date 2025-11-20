import 'dart:io';
import 'dart:convert';
import 'models.dart';
import 'platform/socket_unix.dart';
import 'platform/pipe_windows.dart';

/// 플랫폼 독립적인 RusTerm IPC 클라이언트
class RustermIpcClient {
  dynamic _connection;
  bool _isConnected = false;

  /// IPC 서버에 연결
  Future<void> connect() async {
    if (Platform.isWindows) {
      // Windows: Named Pipe
      final username = Platform.environment['USERNAME'] ?? 'User';
      final pipeName = r'\\.\pipe\rusterm-' + username;
      _connection = WindowsNamedPipeConnection(pipeName);
    } else {
      // Unix: Domain Socket
      final userId = Platform.environment['UID'] ?? '1000';
      final socketPath = '/tmp/rusterm-$userId.sock';
      _connection = UnixSocketConnection(socketPath);
    }

    await _connection.connect();
    _isConnected = true;
  }

  /// 연결 종료
  Future<void> close() async {
    if (_connection != null) {
      await _connection.close();
      _isConnected = false;
    }
  }

  /// 원시 요청 전송
  Future<IpcResponse> _sendRequest(IpcRequest request) async {
    if (!_isConnected) {
      throw Exception('Not connected to IPC server');
    }

    final requestJson = jsonEncode(request.toJson());
    final responseJson = await _connection.sendRequest(requestJson);
    final responseMap = jsonDecode(responseJson) as Map<String, dynamic>;

    return IpcResponse.fromJson(responseMap);
  }

  /// Ping 명령
  Future<PingResponse> ping() async {
    final request = IpcRequest(command: 'ping');
    final response = await _sendRequest(request);

    if (!response.success) {
      throw Exception('Ping failed: ${response.error}');
    }

    return PingResponse.fromJson(response.data!);
  }

  /// Local 탭 추가
  Future<CreateLocalTabResponse> addLocalTab({
    String? cwd,
  }) async {
    final params = <String, dynamic>{};

    if (cwd != null) {
      params['cwd'] = cwd;
    }

    final request = IpcRequest(
      command: 'add_local_tab',
      params: params,
    );

    final response = await _sendRequest(request);

    if (!response.success) {
      throw Exception('Failed to add local tab: ${response.error}');
    }

    return CreateLocalTabResponse.fromJson(response.data!);
  }

  /// SSH 탭 추가
  Future<CreateSshTabResponse> addSshTab({
    required String host,
    required String username,
    int port = 22,
    String? password,
    String? privateKey,
    String? passphrase,
    int cols = 80,
    int rows = 24,
  }) async {
    final sshConfig = SshConfig(
      host: host,
      port: port,
      username: username,
      password: password,
      privateKey: privateKey,
      passphrase: passphrase,
    );

    final params = {
      ...sshConfig.toJson(),
      'cols': cols,
      'rows': rows,
    };

    final request = IpcRequest(
      command: 'add_ssh_tab',
      params: params,
    );

    final response = await _sendRequest(request);

    if (!response.success) {
      throw Exception('Failed to add SSH tab: ${response.error}');
    }

    return CreateSshTabResponse.fromJson(response.data!);
  }

  /// 탭 닫기
  Future<void> closeTab(String tabId) async {
    final request = IpcRequest(
      command: 'close_tab',
      params: {'tabId': tabId},
    );

    final response = await _sendRequest(request);

    if (!response.success) {
      throw Exception('Failed to close tab: ${response.error}');
    }
  }

  /// 탭 목록 조회
  Future<List<TabInfo>> listTabs() async {
    final request = IpcRequest(command: 'list_tabs');
    final response = await _sendRequest(request);

    if (!response.success) {
      throw Exception('Failed to list tabs: ${response.error}');
    }

    final tabs = response.data!['tabs'] as List<dynamic>;
    return tabs
        .map((tab) => TabInfo.fromJson(tab as Map<String, dynamic>))
        .toList();
  }
}
