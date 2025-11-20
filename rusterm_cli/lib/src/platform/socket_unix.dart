import 'dart:io';
import 'dart:convert';

/// Unix Domain Socket IPC 연결 (Linux/macOS)
class UnixSocketConnection {
  Socket? _socket;
  final String socketPath;

  UnixSocketConnection(this.socketPath);

  /// 소켓 연결
  Future<void> connect() async {
    try {
      _socket = await Socket.connect(
        InternetAddress(socketPath, type: InternetAddressType.unix),
        0,
      );
    } catch (e) {
      throw Exception('Failed to connect to Unix socket: $e');
    }
  }

  /// 요청 전송 및 응답 수신
  Future<String> sendRequest(String request) async {
    if (_socket == null) {
      throw Exception('Socket not connected');
    }

    try {
      // 요청 전송 (줄바꿈 포함)
      _socket!.write('$request\n');
      await _socket!.flush();

      // 응답 수신
      final completer = Completer<String>();
      final buffer = StringBuffer();

      _socket!.listen(
        (data) {
          buffer.write(utf8.decode(data));
          // 줄바꿈을 만나면 응답 완료
          final str = buffer.toString();
          if (str.contains('\n')) {
            completer.complete(str.trim());
          }
        },
        onError: (error) {
          completer.completeError(error);
        },
        cancelOnError: true,
      );

      return await completer.future.timeout(
        const Duration(seconds: 5),
        onTimeout: () => throw TimeoutException('Request timeout'),
      );
    } catch (e) {
      throw Exception('Failed to send request: $e');
    }
  }

  /// 연결 종료
  Future<void> close() async {
    await _socket?.close();
    _socket = null;
  }
}
