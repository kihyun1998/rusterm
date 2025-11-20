# RusTerm IPC 기능 기획

**Version**: 0.2
**Date**: 2025-11-19
**Status**: Planning

---

## 1. 목적 및 핵심 개념

### 1.1 핵심 목적

- 외부 애플리케이션에서 RusTerm의 탭(Tab)을 제어할 수 있는 IPC API 제공
- SSH 접속 정보를 안전하게 전달 (CLI 인자로 노출하지 않음)
- 플랫폼별 최적화된 IPC 메커니즘으로 프로세스 간 통신
- **프로토콜 문서화를 통해 누구나 클라이언트 구현 가능**

### 1.2 사용 시나리오

```
[외부 앱] → Named Pipe/Socket → [RusTerm IPC Server] → [Tab 생성]
                                        ↓
                                 RusTerm이 없으면 자동 실행
```

**예시:**
- DevOps 도구가 서버 목록에서 SSH 버튼 클릭 → RusTerm에 SSH 탭 자동 생성
- 프로젝트 관리 툴에서 "Open Terminal" → RusTerm에 로컬 탭 생성
- 파일 매니저에서 SFTP 연결 → RusTerm에 SFTP 탭 생성 (향후)

---

## 2. 플랫폼별 IPC 메커니즘

| 플랫폼 | IPC 방식 | 경로/이름 | 권한 |
|--------|---------|----------|------|
| Windows | Named Pipes | `\\.\pipe\rusterm-{user}` | ACL: 현재 사용자만 |
| Linux | Unix Domain Socket | `/tmp/rusterm-{uid}.sock` | chmod 0600 |
| macOS | Unix Domain Socket | `/tmp/rusterm-{uid}.sock` | chmod 0600 |

**{user} / {uid}**: 사용자별 격리로 충돌 방지

---

## 3. 아키텍처

### 3.1 전체 구조

```
┌─────────────────────────┐
│   External Application  │
│   (Any Language)        │
└───────────┬─────────────┘
            │ 1. Check if RusTerm is running
            │    → Connect to IPC endpoint
            │    → If fail: Launch RusTerm & retry
            │
            │ 2. Send IPC Request (JSON)
            ↓
    ┌───────────────────────┐
    │  Named Pipe / Socket  │
    └───────────┬───────────┘
                │
                ↓
    ┌───────────────────────────┐
    │  RusTerm IPC Server       │
    │  (백그라운드 스레드)        │
    │  - Token 검증              │
    │  - 요청 라우팅             │
    └───────────┬───────────────┘
                │
    ┌───────────┴───────────┬──────────────┬──────────────┐
    │                       │              │              │
    ↓                       ↓              ↓              ↓
[add_ssh_tab]       [add_local_tab]  [close_tab]   [list_tabs]
    │                       │              │              │
    └───────────┬───────────┴──────────────┴──────────────┘
                │
                ↓
    ┌───────────────────────────┐
    │  Tab Store (Zustand)      │
    │  UI 업데이트               │
    └───────────────────────────┘
```

### 3.2 IPC 서버 라이프사이클

```
Tauri App Start
    │
    ├─> Main Thread (GUI)
    │
    └─> Background Thread (IPC Server)
            │
            ├─> Initialize Named Pipe/Socket
            ├─> Listen for connections
            ├─> Handle requests
            │
            └─> On App Shutdown:
                    ├─> Stop accepting new connections
                    ├─> Close active connections
                    ├─> Clean up socket file (Unix)
                    └─> Thread join
```

**중요 구현 사항:**

1. **백그라운드 실행**
   - IPC 서버는 Tokio async runtime에서 별도 태스크로 실행
   - GUI 스레드를 블로킹하지 않음
   - `tokio::spawn()` 사용

2. **Graceful Shutdown**
   - Tauri의 `on_window_event` 또는 `on_app_exit` 훅 활용
   - `tokio::sync::oneshot` 채널로 종료 신호 전달
   - 활성 연결 정리 후 종료

3. **비정상 종료 처리**
   - Unix: Socket 파일 자동 정리 (`Drop` trait 구현)
   - Windows: Named Pipe는 프로세스 종료 시 OS가 자동 정리
   - 재시작 시 기존 socket 파일 존재하면 삭제 후 재생성

---

## 4. IPC API 명세

### 4.1 Request 포맷

```json
{
  "token": "optional-auth-token",
  "command": "add_ssh_tab",
  "params": { ... }
}
```

### 4.2 Response 포맷

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

### 4.3 지원 명령어

#### 4.3.1 `ping` - RusTerm 실행 확인

**Request:**
```json
{
  "command": "ping"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "0.1.0",
    "pid": 12345
  }
}
```

#### 4.3.2 `add_ssh_tab` - SSH 탭 추가

**Request:**
```json
{
  "command": "add_ssh_tab",
  "params": {
    "host": "example.com",
    "port": 22,
    "username": "user",
    "authMethod": {
      "type": "password",
      "password": "secret123"
    },
    "cols": 80,
    "rows": 24
  }
}
```

**Auth Method 옵션:**
```json
// Password
{
  "type": "password",
  "password": "secret123"
}

// Private Key
{
  "type": "privateKey",
  "path": "/path/to/key",
  "passphrase": "optional"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tabId": "tab-uuid-1234",
    "sessionId": "ssh-session-uuid-5678"
  }
}
```

#### 4.3.3 `add_local_tab` - 로컬 터미널 탭 추가

**Request:**
```json
{
  "command": "add_local_tab",
  "params": {
    "cols": 80,
    "rows": 24,
    "cwd": "/optional/working/dir"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tabId": "tab-uuid-2345",
    "sessionId": "pty-session-uuid-6789"
  }
}
```

#### 4.3.4 `close_tab` - 탭 닫기

**Request:**
```json
{
  "command": "close_tab",
  "params": {
    "tabId": "tab-uuid-1234"
  }
}
```

**Response:**
```json
{
  "success": true
}
```

#### 4.3.5 `list_tabs` - 현재 탭 목록 조회

**Request:**
```json
{
  "command": "list_tabs"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tabs": [
      {
        "tabId": "tab-uuid-1234",
        "type": "ssh",
        "title": "user@example.com",
        "active": true
      },
      {
        "tabId": "tab-uuid-2345",
        "type": "local",
        "title": "Terminal",
        "active": false
      }
    ]
  }
}
```

#### 4.3.6 (향후) 확장 가능한 명령어

```json
{
  "command": "add_sftp_tab",
  "params": { ... }
}

{
  "command": "add_rdp_tab",
  "params": { ... }
}
```

---

## 5. Rust 구현 구조

### 5.1 디렉토리 구조

```
src-tauri/src/
├── ipc/
│   ├── mod.rs              # Public exports
│   ├── server.rs           # IPC 서버 (Named Pipe/Socket)
│   ├── handler.rs          # 요청 라우팅 및 처리
│   ├── protocol.rs         # Request/Response 타입 정의
│   ├── lifecycle.rs        # Shutdown 관리
│   ├── platform/
│   │   ├── mod.rs
│   │   ├── windows.rs      # Named Pipes 구현
│   │   └── unix.rs         # Unix Domain Socket 구현
│   └── auth.rs             # Token 관리 (Optional)
```

### 5.2 데이터 타입 정의

```rust
// src-tauri/src/ipc/protocol.rs

use serde::{Deserialize, Serialize};
use crate::ssh::SshConfig;

#[derive(Debug, Deserialize)]
pub struct IpcRequest {
    pub token: Option<String>,
    pub command: String,
    pub params: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct IpcResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "command", rename_all = "snake_case")]
pub enum IpcCommand {
    Ping,
    AddSshTab {
        params: AddSshTabParams,
    },
    AddLocalTab {
        params: AddLocalTabParams,
    },
    CloseTab {
        params: CloseTabParams,
    },
    ListTabs,
}

#[derive(Debug, Deserialize)]
pub struct AddSshTabParams {
    #[serde(flatten)]
    pub config: SshConfig,  // 기존 SshConfig 재사용
    pub cols: u16,
    pub rows: u16,
}

#[derive(Debug, Deserialize)]
pub struct AddLocalTabParams {
    pub cols: u16,
    pub rows: u16,
    pub cwd: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CloseTabParams {
    pub tab_id: String,
}
```

### 5.3 IPC 서버 라이프사이클 구현

```rust
// src-tauri/src/ipc/server.rs

use tokio::sync::oneshot;

pub struct IpcServer {
    shutdown_tx: Option<oneshot::Sender<()>>,
}

impl IpcServer {
    pub async fn start() -> Result<Self, IpcError> {
        let (shutdown_tx, shutdown_rx) = oneshot::channel();

        tokio::spawn(async move {
            // IPC 서버 실행
            run_server(shutdown_rx).await
        });

        Ok(IpcServer {
            shutdown_tx: Some(shutdown_tx),
        })
    }

    pub fn shutdown(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

impl Drop for IpcServer {
    fn drop(&mut self) {
        self.shutdown();
    }
}

async fn run_server(shutdown_rx: oneshot::Receiver<()>) {
    // Platform-specific listener
    let listener = create_listener().await.unwrap();

    loop {
        tokio::select! {
            // 종료 신호 대기
            _ = &mut shutdown_rx => {
                println!("IPC server shutting down...");
                break;
            }
            // 연결 수락
            Ok(stream) = listener.accept() => {
                tokio::spawn(handle_connection(stream));
            }
        }
    }

    // Cleanup
    cleanup_socket();
}
```

### 5.4 Tauri 통합

```rust
// src-tauri/src/lib.rs

use ipc::IpcServer;

pub fn run() {
    let settings_manager = SettingsManager::new()
        .expect("Failed to initialize settings manager");

    // IPC 서버 상태 관리
    let ipc_server = Arc::new(Mutex::new(None::<IpcServer>));
    let ipc_server_clone = ipc_server.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(PtyManager::new())
        .manage(SshManager::new())
        .manage(settings_manager)
        .setup(|app| {
            // IPC 서버 시작
            let runtime = tokio::runtime::Runtime::new().unwrap();
            runtime.block_on(async {
                match IpcServer::start().await {
                    Ok(server) => {
                        *ipc_server_clone.lock().unwrap() = Some(server);
                        println!("IPC server started");
                    }
                    Err(e) => {
                        eprintln!("Failed to start IPC server: {}", e);
                    }
                }
            });

            Ok(())
        })
        .on_window_event(move |window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // 앱 종료 시 IPC 서버 종료
                if let Some(mut server) = ipc_server.lock().unwrap().take() {
                    server.shutdown();
                    println!("IPC server stopped");
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            // ... existing commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## 6. 보안 설계

### 6.1 로컬 전용 통신

- IPC는 같은 머신 내 프로세스만 접근 가능
- 네트워크 노출 없음

### 6.2 파일시스템 권한 (Linux/macOS)

- Socket 파일 권한: `0600` (소유자만 읽기/쓰기)
- `/tmp/rusterm-{uid}.sock` - UID 기반 격리

```rust
// Unix socket 생성 예시
use std::os::unix::fs::PermissionsExt;

let listener = UnixListener::bind(socket_path)?;
let mut perms = std::fs::metadata(&socket_path)?.permissions();
perms.set_mode(0o600);
std::fs::set_permissions(&socket_path, perms)?;
```

### 6.3 ACL 설정 (Windows)

- Named Pipe에 현재 사용자만 접근 가능하도록 ACL 설정
- `SECURITY_ATTRIBUTES` 사용

```rust
// Windows Named Pipe 보안 설정 (예시)
use windows_sys::Win32::Security::*;

let security_descriptor = create_user_only_security_descriptor();
let mut sa = SECURITY_ATTRIBUTES {
    nLength: std::mem::size_of::<SECURITY_ATTRIBUTES>() as u32,
    lpSecurityDescriptor: security_descriptor,
    bInheritHandle: 0,
};
```

### 6.4 (Optional) Token 인증

- 첫 연결 시 토큰 발급
- 이후 요청에 토큰 포함 필요
- 토큰 만료 시간: 설정 가능

---

## 7. Auto-Launch 메커니즘

### 7.1 외부 앱에서 RusTerm 자동 실행

**Python 예시:**
```python
import subprocess
import socket
import time
import os

def connect_to_rusterm():
    sock_path = f"/tmp/rusterm-{os.getuid()}.sock"

    # 1. 연결 시도
    try:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.connect(sock_path)
        return sock
    except:
        pass

    # 2. RusTerm 실행
    subprocess.Popen(["rusterm"], start_new_session=True)

    # 3. 연결 재시도 (최대 5초)
    for _ in range(50):
        try:
            sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            sock.connect(sock_path)
            return sock
        except:
            time.sleep(0.1)

    raise Exception("Failed to connect to RusTerm")

# 사용 예시
sock = connect_to_rusterm()
request = {
    "command": "add_ssh_tab",
    "params": {
        "host": "example.com",
        "port": 22,
        "username": "user",
        "authMethod": {
            "type": "password",
            "password": "secret"
        },
        "cols": 80,
        "rows": 24
    }
}
sock.sendall(json.dumps(request).encode() + b'\n')
response = sock.recv(4096)
print(json.loads(response))
```

### 7.2 Single Instance 관리

- 이미 실행 중이면 기존 창에 탭 추가
- 실행 중이 아니면 새로 실행
- Tauri single instance plugin 활용 가능

---

## 8. 구현 단계

### Phase 1: IPC 인프라 구축
- [ ] IPC 모듈 구조 생성 (`src-tauri/src/ipc/`)
- [ ] Named Pipes 구현 (Windows)
- [ ] Unix Domain Sockets 구현 (Linux/macOS)
- [ ] Request/Response 프로토콜 정의
- [ ] 기본 핸들러 (`ping`)
- [ ] 백그라운드 스레드 실행 구조
- [ ] Graceful shutdown 구현

### Phase 2: 핵심 Tab 관리 API
- [ ] `add_ssh_tab` 구현
- [ ] `add_local_tab` 구현
- [ ] `close_tab` 구현
- [ ] `list_tabs` 구현
- [ ] Frontend Tab Store와 연동

### Phase 3: 테스트 및 문서화
- [ ] 플랫폼별 테스트 (Windows, Linux, macOS)
- [ ] IPC 프로토콜 문서 작성
- [ ] 예제 클라이언트 작성 (Python, Node.js, Rust)
- [ ] README에 IPC 사용법 추가
- [ ] 비정상 종료 시나리오 테스트

### Phase 4: 추가 기능
- [ ] Token 인증 (선택)
- [ ] 에러 핸들링 강화
- [ ] 로깅 시스템
- [ ] 성능 최적화
- [ ] 재연결 로직

---

## 9. 필요한 Rust Crates

### 필수 의존성

```toml
[dependencies]
# 기존 의존성
tauri = { version = "2", features = [] }
tokio = { version = "1", features = ["sync", "rt-multi-thread"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# IPC 관련 추가
interprocess = "2"  # Named Pipes + Unix Sockets 통합 지원
```

### 선택적 의존성

```toml
# 로깅
tracing = "0.1"
tracing-subscriber = "0.3"

# 에러 처리 (이미 사용 중)
thiserror = "1.0"
```

---

## 10. 문서화 계획

### 10.1 IPC Protocol Documentation

작성 예정: `docs/IPC_PROTOCOL.md`

**목차:**
- Connection
- Message Format
- API Reference
  - ping
  - add_ssh_tab
  - add_local_tab
  - close_tab
  - list_tabs
- Error Codes
- Client Examples
  - Python
  - Node.js
  - Rust
  - Go

### 10.2 Example Clients

작성 예정: `examples/ipc-clients/`
- `python/rusterm_client.py`
- `nodejs/rusterm-client.js`
- `rust/rusterm-client/`

---

## 11. 예상 문제 및 해결 방안

### 11.1 여러 RusTerm 인스턴스 실행 시

**문제:** 사용자가 여러 RusTerm을 실행하면 IPC 경로 충돌

**해결:**
- Option A: Single instance 강제 (Tauri plugin)
- Option B: PID 기반 경로 (`/tmp/rusterm-{uid}-{pid}.sock`)
- Option C: 환경 변수로 IPC 경로 지정 가능

### 11.2 Socket 파일 잔류

**문제:** 비정상 종료 시 socket 파일이 남아있음

**해결:**
```rust
// 시작 시 기존 socket 확인 및 제거
if socket_path.exists() {
    // 해당 PID가 실행 중인지 확인
    if !is_process_running(pid) {
        std::fs::remove_file(&socket_path)?;
    }
}
```

### 11.3 Frontend-Backend 통신

**문제:** IPC 핸들러에서 Frontend Tab Store 업데이트

**해결:**
- Tauri의 `emit` 이벤트 사용
- IPC 핸들러 → Tauri Event → Frontend 리스너

```rust
// IPC handler
app_handle.emit_all("tab-created", TabCreatedPayload {
    tab_id,
    session_id,
})?;
```

```typescript
// Frontend
listen('tab-created', (event) => {
  useTabStore.getState().addTab(event.payload);
});
```

---

## 12. 마일스톤

| Phase | 목표 | 예상 기간 |
|-------|------|----------|
| Phase 1 | IPC 인프라 구축 | 3-5일 |
| Phase 2 | Tab 관리 API | 2-3일 |
| Phase 3 | 테스트 및 문서화 | 2-3일 |
| Phase 4 | 추가 기능 | 1-2일 |

**Total**: 8-13일 (개발 시간 기준)

---

## 13. References

- [Tauri IPC Documentation](https://tauri.app/develop/calling-rust/)
- [interprocess crate](https://docs.rs/interprocess/)
- [tokio async runtime](https://docs.rs/tokio/)
- [Named Pipes (Windows)](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipes)
- [Unix Domain Sockets](https://man7.org/linux/man-pages/man7/unix.7.html)
