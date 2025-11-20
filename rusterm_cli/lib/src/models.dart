/// IPC 프로토콜 모델 정의

/// IPC 요청
class IpcRequest {
  final String command;
  final Map<String, dynamic>? params;

  IpcRequest({
    required this.command,
    this.params,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{'command': command};
    if (params != null) {
      json['params'] = params;
    }
    return json;
  }
}

/// IPC 응답
class IpcResponse {
  final bool success;
  final Map<String, dynamic>? data;
  final String? error;

  IpcResponse({
    required this.success,
    this.data,
    this.error,
  });

  factory IpcResponse.fromJson(Map<String, dynamic> json) {
    return IpcResponse(
      success: json['success'] as bool,
      data: json['data'] as Map<String, dynamic>?,
      error: json['error'] as String?,
    );
  }
}

/// Ping 응답
class PingResponse {
  final String version;
  final int pid;

  PingResponse({
    required this.version,
    required this.pid,
  });

  factory PingResponse.fromJson(Map<String, dynamic> json) {
    return PingResponse(
      version: json['version'] as String,
      pid: json['pid'] as int,
    );
  }

  @override
  String toString() => 'Version: $version, PID: $pid';
}

/// 탭 정보
class TabInfo {
  final String tabId;
  final String type;
  final String title;
  final bool active;

  TabInfo({
    required this.tabId,
    required this.type,
    required this.title,
    required this.active,
  });

  factory TabInfo.fromJson(Map<String, dynamic> json) {
    return TabInfo(
      tabId: json['tabId'] as String,
      type: json['type'] as String,
      title: json['title'] as String,
      active: json['active'] as bool,
    );
  }

  @override
  String toString() => '[$type] $title (ID: ${tabId.substring(0, 8)}...)';
}

/// SSH 설정
class SshConfig {
  final String host;
  final int port;
  final String username;
  final String? password;
  final String? privateKey;
  final String? passphrase;

  SshConfig({
    required this.host,
    required this.port,
    required this.username,
    this.password,
    this.privateKey,
    this.passphrase,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'host': host,
      'port': port,
      'username': username,
    };

    if (password != null) {
      json['authMethod'] = {
        'type': 'password',
        'password': password,
      };
    } else if (privateKey != null) {
      json['authMethod'] = {
        'type': 'privateKey',
        'path': privateKey,
        if (passphrase != null) 'passphrase': passphrase,
      };
    }

    return json;
  }
}

/// Local 탭 생성 응답
class CreateLocalTabResponse {
  final String ptyId;
  final int pid;
  final String shell;

  CreateLocalTabResponse({
    required this.ptyId,
    required this.pid,
    required this.shell,
  });

  factory CreateLocalTabResponse.fromJson(Map<String, dynamic> json) {
    return CreateLocalTabResponse(
      ptyId: json['ptyId'] as String,
      pid: json['pid'] as int,
      shell: json['shell'] as String,
    );
  }

  @override
  String toString() => 'PTY ID: $ptyId, PID: $pid, Shell: $shell';
}

/// SSH 탭 생성 응답
class CreateSshTabResponse {
  final String sessionId;
  final String host;
  final String username;

  CreateSshTabResponse({
    required this.sessionId,
    required this.host,
    required this.username,
  });

  factory CreateSshTabResponse.fromJson(Map<String, dynamic> json) {
    return CreateSshTabResponse(
      sessionId: json['session_id'] as String? ?? json['sessionId'] as String,
      host: json['host'] as String,
      username: json['username'] as String,
    );
  }

  @override
  String toString() => 'Session ID: $sessionId, $username@$host';
}
