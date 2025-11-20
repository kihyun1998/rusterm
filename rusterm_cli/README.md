# RusTerm IPC CLI

Dart로 작성된 RusTerm IPC 클라이언트 CLI 도구입니다.

## 개요

이 프로젝트는 두 가지 목적이 있습니다:

1. **CLI 도구**: RusTerm IPC 서버를 테스트하기 위한 명령줄 도구
2. **Flutter 라이브러리**: Flutter 앱에서 재사용할 수 있는 IPC 클라이언트 라이브러리

## 설치

```bash
# 의존성 설치
dart pub get

# 실행 가능한 바이너리 컴파일 (선택사항)
dart compile exe bin/rusterm_cli.dart -o rusterm_cli
```

## 사용법

### 기본 명령어

```bash
# Ping 테스트
dart run bin/rusterm_cli.dart ping

# Local 터미널 탭 추가
dart run bin/rusterm_cli.dart add-local
dart run bin/rusterm_cli.dart add-local --cols 120 --rows 30
dart run bin/rusterm_cli.dart add-local --cwd /home/user/projects

# SSH 터미널 탭 추가
dart run bin/rusterm_cli.dart add-ssh --host localhost --user admin
dart run bin/rusterm_cli.dart add-ssh -H example.com -u root -p 2222 --password mypass
dart run bin/rusterm_cli.dart add-ssh -H example.com -u dev --key ~/.ssh/id_rsa

# 탭 목록 조회
dart run bin/rusterm_cli.dart list

# 탭 닫기
dart run bin/rusterm_cli.dart close <tab-id>
```

### 컴파일 후 사용

```bash
# 컴파일
dart compile exe bin/rusterm_cli.dart -o rusterm_cli

# 실행
./rusterm_cli ping
./rusterm_cli add-local
./rusterm_cli list
```

## Flutter 통합

이 라이브러리는 Flutter 앱에서 직접 사용할 수 있습니다:

```dart
import 'package:rusterm_cli/rusterm_ipc.dart';

// IPC 클라이언트 생성
final client = RustermIpcClient();

// 연결
await client.connect();

// Ping
final pingResponse = await client.ping();
print('Version: ${pingResponse.version}, PID: ${pingResponse.pid}');

// Local 탭 추가
final localTab = await client.addLocalTab(cols: 80, rows: 24);
print('Created local tab: ${localTab.ptyId}');

// SSH 탭 추가
final sshTab = await client.addSshTab(
  host: 'example.com',
  username: 'user',
  password: 'password',
);
print('Created SSH tab: ${sshTab.sessionId}');

// 탭 목록
final tabs = await client.listTabs();
for (var tab in tabs) {
  print('Tab: ${tab.title} (${tab.type})');
}

// 탭 닫기
await client.closeTab(tabs.first.tabId);

// 연결 종료
await client.close();
```

## 아키텍처

### 디렉토리 구조

```
rusterm_cli/
├── lib/
│   ├── rusterm_ipc.dart           # 라이브러리 엔트리
│   └── src/
│       ├── client.dart            # IPC 클라이언트 (재사용 가능)
│       ├── models.dart            # 데이터 모델
│       └── platform/
│           ├── pipe_windows.dart  # Windows Named Pipe (FFI)
│           └── socket_unix.dart   # Unix Domain Socket
├── bin/
│   └── rusterm_cli.dart           # CLI 엔트리 포인트
├── pubspec.yaml
└── README.md
```

### 플랫폼 지원

- **Windows**: Named Pipes (`\\.\pipe\rusterm-<username>`)
  - FFI를 사용한 Windows API 호출
  - `CreateFile`, `ReadFile`, `WriteFile`, `CloseHandle`

- **Linux/macOS**: Unix Domain Sockets (`/tmp/rusterm-<uid>.sock`)
  - Dart 네이티브 `Socket` API 사용

## IPC 프로토콜

### 요청 형식

```json
{
  "command": "ping|add_local_tab|add_ssh_tab|close_tab|list_tabs",
  "params": { ... }
}
```

### 응답 형식

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

### 명령어

#### 1. ping
- 요청: `{"command": "ping"}`
- 응답: `{"success": true, "data": {"version": "0.1.0", "pid": 12345}}`

#### 2. add_local_tab
- 요청: `{"command": "add_local_tab", "params": {"cols": 80, "rows": 24, "cwd": "/path"}}`
- 응답: `{"success": true, "data": {"ptyId": "...", "pid": 12345, "shell": "/bin/bash"}}`

#### 3. add_ssh_tab
- 요청:
  ```json
  {
    "command": "add_ssh_tab",
    "params": {
      "host": "localhost",
      "port": 22,
      "username": "user",
      "authMethod": {"type": "password", "password": "pass"},
      "cols": 80,
      "rows": 24
    }
  }
  ```
- 응답: `{"success": true, "data": {"session_id": "...", "host": "localhost", "username": "user"}}`

#### 4. close_tab
- 요청: `{"command": "close_tab", "params": {"tabId": "..."}}`
- 응답: `{"success": true}`

#### 5. list_tabs
- 요청: `{"command": "list_tabs"}`
- 응답:
  ```json
  {
    "success": true,
    "data": {
      "tabs": [
        {"tabId": "...", "type": "local", "title": "Terminal ...", "active": false}
      ]
    }
  }
  ```

## 개발

```bash
# 의존성 설치
dart pub get

# 실행
dart run bin/rusterm_cli.dart --help

# 린트
dart analyze

# 포맷
dart format .
```

## 라이선스

이 프로젝트는 RusTerm 프로젝트의 일부입니다.
