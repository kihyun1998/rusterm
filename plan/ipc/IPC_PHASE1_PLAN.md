# RusTerm IPC Phase 1 구현 계획

**Version**: 1.0
**Date**: 2025-11-19
**Phase**: Phase 1 - IPC 인프라 구축

---

## 목차

1. [구현 개요](#구현-개요)
2. [의존성 추가](#의존성-추가)
3. [모듈 구조](#모듈-구조)
4. [Task별 상세 구현 계획](#task별-상세-구현-계획)
5. [통합 체크리스트](#통합-체크리스트)

---

## 구현 개요

### Phase 1의 목표
- IPC 서버를 백그라운드 스레드에서 실행
- 플랫폼별 IPC 메커니즘 구현 (Named Pipes for Windows, Unix Socket for Linux/macOS)
- `ping` 커맨드 처리 가능
- Graceful shutdown 지원
- Tauri 앱과 완전 통합

### 기존 코드 패턴 분석

**Manager 패턴:**
```rust
// PtyManager, SshManager와 동일한 패턴
pub struct XxxManager {
    sessions: Arc<Mutex<HashMap<String, XxxSession>>>,
}
```

**Tauri 이벤트:**
```rust
// AppHandle를 사용한 이벤트 emit
app_handle.emit("event-name", EventPayload { ... })?;
```

**Tokio 사용:**
```toml
# 현재 Cargo.toml
tokio = { version = "1", features = ["sync"] }

# 추가 필요
tokio = { version = "1", features = ["sync", "rt-multi-thread", "io-util"] }
```

---

## 의존성 추가

### Cargo.toml 수정

**파일**: `src-tauri/Cargo.toml`

**변경 전:**
```toml
[dependencies]
tokio = { version = "1", features = ["sync"] }
```

**변경 후:**
```toml
[dependencies]
tokio = { version = "1", features = ["sync", "rt-multi-thread", "io-util", "net"] }
interprocess = "2"  # Named Pipes + Unix Sockets
```

**추가 이유:**
- `rt-multi-thread`: 백그라운드 태스크 실행
- `io-util`: AsyncRead/AsyncWrite 유틸리티
- `net`: Unix Domain Socket 지원 (tokio::net::UnixListener)
- `interprocess`: 크로스 플랫폼 IPC 추상화

---

## 모듈 구조

### 디렉토리 생성

```bash
src-tauri/src/ipc/
├── mod.rs              # Public exports
├── protocol.rs         # Request/Response 타입 정의
├── server.rs           # IPC 서버 메인 로직
├── handler.rs          # 요청 처리 핸들러
├── lifecycle.rs        # Shutdown 관리
└── platform/
    ├── mod.rs          # 플랫폼별 export
    ├── unix.rs         # Unix Domain Socket (Linux/macOS)
    └── windows.rs      # Named Pipes (Windows)
```

### lib.rs 수정

**파일**: `src-tauri/src/lib.rs`

**추가할 내용:**
```rust
mod commands;
mod pty;
mod settings;
mod ssh;
mod ipc;  // ← 추가

use pty::PtyManager;
use settings::SettingsManager;
use ssh::SshManager;
use ipc::IpcServer;  // ← 추가
```

---

## Task별 상세 구현 계획

---

### Task 1.1: IPC 모듈 기본 구조 생성

#### 파일 생성 목록

1. **src-tauri/src/ipc/mod.rs**
```rust
mod protocol;
mod server;
mod handler;
mod lifecycle;
mod platform;

pub use protocol::{IpcRequest, IpcResponse, IpcCommand, IpcError};
pub use server::IpcServer;
```

2. **src-tauri/src/ipc/protocol.rs** (빈 골격)
```rust
use serde::{Deserialize, Serialize};
use thiserror::Error;

// TODO: Task 1.2에서 구현
```

3. **src-tauri/src/ipc/server.rs** (빈 골격)
```rust
use tokio::sync::oneshot;

pub struct IpcServer {
    // TODO: Task 1.6에서 구현
}

impl IpcServer {
    pub async fn start() -> Result<Self, crate::ipc::IpcError> {
        todo!("Task 1.6")
    }

    pub fn shutdown(&mut self) {
        todo!("Task 1.7")
    }
}
```

4. **src-tauri/src/ipc/handler.rs** (빈 골격)
```rust
use super::protocol::{IpcRequest, IpcResponse};

pub async fn handle_request(request: IpcRequest) -> IpcResponse {
    todo!("Task 1.5")
}
```

5. **src-tauri/src/ipc/lifecycle.rs** (빈 골격)
```rust
// Shutdown 관련 로직
// TODO: Task 1.7에서 구현
```

6. **src-tauri/src/ipc/platform/mod.rs**
```rust
#[cfg(unix)]
mod unix;
#[cfg(windows)]
mod windows;

#[cfg(unix)]
pub use unix::*;
#[cfg(windows)]
pub use windows::*;
```

7. **src-tauri/src/ipc/platform/unix.rs** (빈 골격)
```rust
// TODO: Task 1.3에서 구현
```

8. **src-tauri/src/ipc/platform/windows.rs** (빈 골격)
```rust
// TODO: Task 1.4에서 구현
```

#### lib.rs 수정

**파일**: `src-tauri/src/lib.rs`

**1번째 줄 근처에 추가:**
```rust
mod commands;
mod pty;
mod settings;
mod ssh;
mod ipc;  // ← 추가
```

---

### Task 1.2: IPC 프로토콜 타입 정의

#### 파일: src-tauri/src/ipc/protocol.rs

**전체 구현:**

```rust
use serde::{Deserialize, Serialize};
use thiserror::Error;
use crate::ssh::SshConfig;

/// IPC 요청 구조
#[derive(Debug, Deserialize)]
pub struct IpcRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
    pub command: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
}

/// IPC 응답 구조
#[derive(Debug, Serialize)]
pub struct IpcResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl IpcResponse {
    /// 성공 응답 생성
    pub fn success(data: impl Serialize) -> Self {
        IpcResponse {
            success: true,
            data: serde_json::to_value(data).ok(),
            error: None,
        }
    }

    /// 에러 응답 생성
    pub fn error(message: impl Into<String>) -> Self {
        IpcResponse {
            success: false,
            data: None,
            error: Some(message.into()),
        }
    }
}

/// IPC 커맨드 enum
#[derive(Debug, Deserialize)]
#[serde(tag = "command", rename_all = "snake_case")]
pub enum IpcCommand {
    Ping,
    AddSshTab { params: AddSshTabParams },
    AddLocalTab { params: AddLocalTabParams },
    CloseTab { params: CloseTabParams },
    ListTabs,
}

/// Ping 응답 데이터
#[derive(Debug, Serialize)]
pub struct PingResponse {
    pub version: String,
    pub pid: u32,
}

/// add_ssh_tab 파라미터
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddSshTabParams {
    #[serde(flatten)]
    pub config: SshConfig,  // 기존 SshConfig 재사용
    pub cols: u16,
    pub rows: u16,
}

/// add_local_tab 파라미터
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddLocalTabParams {
    pub cols: u16,
    pub rows: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cwd: Option<String>,
}

/// close_tab 파라미터
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloseTabParams {
    pub tab_id: String,
}

/// Tab 정보 (list_tabs 응답용)
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TabInfo {
    pub tab_id: String,
    #[serde(rename = "type")]
    pub tab_type: String,
    pub title: String,
    pub active: bool,
}

/// list_tabs 응답 데이터
#[derive(Debug, Serialize)]
pub struct ListTabsResponse {
    pub tabs: Vec<TabInfo>,
}

/// IPC 에러 타입
#[derive(Debug, Error)]
pub enum IpcError {
    #[error("Failed to start IPC server: {0}")]
    ServerStartFailed(String),

    #[error("Failed to bind to IPC endpoint: {0}")]
    BindFailed(String),

    #[error("Failed to accept connection: {0}")]
    AcceptFailed(String),

    #[error("Failed to parse request: {0}")]
    ParseError(String),

    #[error("Unknown command: {0}")]
    UnknownCommand(String),

    #[error("Invalid parameters: {0}")]
    InvalidParams(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),
}

impl From<IpcError> for String {
    fn from(err: IpcError) -> Self {
        err.to_string()
    }
}

// ============================================
// 단위 테스트
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ping_request_deserialization() {
        let json = r#"{"command":"ping"}"#;
        let req: IpcRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.command, "ping");
        assert!(req.params.is_none());
    }

    #[test]
    fn test_success_response_serialization() {
        let resp = IpcResponse::success(PingResponse {
            version: "0.1.0".to_string(),
            pid: 12345,
        });
        assert!(resp.success);
        assert!(resp.data.is_some());
        assert!(resp.error.is_none());
    }

    #[test]
    fn test_error_response_serialization() {
        let resp = IpcResponse::error("Test error");
        assert!(!resp.success);
        assert!(resp.data.is_none());
        assert_eq!(resp.error, Some("Test error".to_string()));
    }

    #[test]
    fn test_add_local_tab_request() {
        let json = r#"{
            "command": "add_local_tab",
            "params": {
                "cols": 80,
                "rows": 24,
                "cwd": "/home/user"
            }
        }"#;
        let req: IpcRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.command, "add_local_tab");
    }
}
```

**핵심 포인트:**
- `IpcResponse::success()`, `IpcResponse::error()` 헬퍼 함수
- 기존 `SshConfig` 재사용 (`#[serde(flatten)]`)
- camelCase ↔ snake_case 변환 (`#[serde(rename_all)]`)
- 단위 테스트 포함

---

### Task 1.3: Unix Domain Socket 구현 (Linux/macOS)

#### 파일: src-tauri/src/ipc/platform/unix.rs

**전체 구현:**

```rust
use std::path::PathBuf;
use tokio::net::{UnixListener, UnixStream};
use std::os::unix::fs::PermissionsExt;

use crate::ipc::IpcError;

/// Unix Socket 경로 생성
pub fn get_socket_path() -> PathBuf {
    let uid = unsafe { libc::getuid() };
    PathBuf::from(format!("/tmp/rusterm-{}.sock", uid))
}

/// Unix Socket 리스너 생성
pub async fn create_listener() -> Result<UnixListener, IpcError> {
    let socket_path = get_socket_path();

    // 기존 socket 파일 확인 및 제거
    if socket_path.exists() {
        // TODO: 향후 프로세스 존재 여부 확인 로직 추가
        std::fs::remove_file(&socket_path).map_err(|e| {
            IpcError::BindFailed(format!("Failed to remove existing socket: {}", e))
        })?;
    }

    // Unix socket 생성
    let listener = UnixListener::bind(&socket_path).map_err(|e| {
        IpcError::BindFailed(format!("Failed to bind to {}: {}", socket_path.display(), e))
    })?;

    // 권한 설정: 0600 (소유자만 읽기/쓰기)
    let metadata = std::fs::metadata(&socket_path).map_err(|e| {
        IpcError::BindFailed(format!("Failed to get socket metadata: {}", e))
    })?;

    let mut perms = metadata.permissions();
    perms.set_mode(0o600);
    std::fs::set_permissions(&socket_path, perms).map_err(|e| {
        IpcError::BindFailed(format!("Failed to set socket permissions: {}", e))
    })?;

    println!("IPC server listening on: {}", socket_path.display());

    Ok(listener)
}

/// 연결 수락
pub async fn accept_connection(listener: &UnixListener) -> Result<UnixStream, IpcError> {
    let (stream, _addr) = listener
        .accept()
        .await
        .map_err(|e| IpcError::AcceptFailed(e.to_string()))?;

    Ok(stream)
}

/// Socket 파일 정리
pub fn cleanup_socket() {
    let socket_path = get_socket_path();
    if socket_path.exists() {
        let _ = std::fs::remove_file(&socket_path);
        println!("Cleaned up socket file: {}", socket_path.display());
    }
}
```

**핵심 포인트:**
- UID 기반 socket 경로 (`/tmp/rusterm-{uid}.sock`)
- 권한 0600 설정
- 기존 socket 파일 자동 제거
- cleanup 함수로 종료 시 정리

---

### Task 1.4: Named Pipes 구현 (Windows)

#### 파일: src-tauri/src/ipc/platform/windows.rs

**전체 구현:**

```rust
use interprocess::local_socket::{
    LocalSocketListener, LocalSocketStream, NameTypeSupport,
};

use crate::ipc::IpcError;

/// Named Pipe 이름 생성
pub fn get_pipe_name() -> String {
    let username = std::env::var("USERNAME").unwrap_or_else(|_| "default".to_string());
    format!("rusterm-{}", username)
}

/// Named Pipe 리스너 생성
pub async fn create_listener() -> Result<LocalSocketListener, IpcError> {
    let pipe_name = get_pipe_name();

    // Windows에서는 '@'로 시작하면 Named Pipe
    let name = format!("@{}", pipe_name);

    let listener = match LocalSocketListener::bind(&name) {
        Ok(l) => l,
        Err(e) => {
            return Err(IpcError::BindFailed(format!(
                "Failed to bind to pipe '{}': {}",
                pipe_name, e
            )));
        }
    };

    println!("IPC server listening on: \\\\.\\pipe\\{}", pipe_name);

    Ok(listener)
}

/// 연결 수락
pub async fn accept_connection(
    listener: &LocalSocketListener,
) -> Result<LocalSocketStream, IpcError> {
    let stream = listener
        .accept()
        .map_err(|e| IpcError::AcceptFailed(e.to_string()))?;

    Ok(stream)
}

/// Cleanup (Windows는 프로세스 종료 시 자동 정리)
pub fn cleanup_socket() {
    // Windows Named Pipe는 OS가 자동으로 정리
    println!("Named Pipe will be cleaned up by OS");
}
```

**핵심 포인트:**
- `USERNAME` 환경 변수 기반 pipe 이름
- `interprocess` crate 사용
- Windows는 OS가 자동 정리

**참고:** `interprocess` crate는 blocking I/O이므로, 실제로는 `tokio::task::spawn_blocking`으로 래핑 필요 (Task 1.6에서 처리)

---

### Task 1.5: 기본 요청 핸들러 구현 (ping)

#### 파일: src-tauri/src/ipc/handler.rs

**전체 구현:**

```rust
use crate::ipc::protocol::{IpcRequest, IpcResponse, PingResponse};
use serde_json;

/// IPC 요청 처리
pub async fn handle_request(request: IpcRequest) -> IpcResponse {
    match request.command.as_str() {
        "ping" => handle_ping().await,
        _ => IpcResponse::error(format!("Unknown command: {}", request.command)),
    }
}

/// ping 커맨드 처리
async fn handle_ping() -> IpcResponse {
    let response = PingResponse {
        version: env!("CARGO_PKG_VERSION").to_string(),
        pid: std::process::id(),
    };

    IpcResponse::success(response)
}

// ============================================
// 단위 테스트
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_ping_handler() {
        let request = IpcRequest {
            token: None,
            command: "ping".to_string(),
            params: None,
        };

        let response = handle_request(request).await;
        assert!(response.success);
        assert!(response.data.is_some());
    }

    #[tokio::test]
    async fn test_unknown_command() {
        let request = IpcRequest {
            token: None,
            command: "unknown".to_string(),
            params: None,
        };

        let response = handle_request(request).await;
        assert!(!response.success);
        assert!(response.error.is_some());
    }
}
```

**핵심 포인트:**
- `env!("CARGO_PKG_VERSION")`로 버전 정보
- `std::process::id()`로 PID
- 단위 테스트 포함

---

### Task 1.6: 백그라운드 스레드 실행 구조

#### 파일: src-tauri/src/ipc/server.rs

**전체 구현:**

```rust
use tokio::sync::oneshot;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use std::sync::Arc;

use crate::ipc::{IpcError, handler, platform};

/// IPC 서버 구조체
pub struct IpcServer {
    shutdown_tx: Option<oneshot::Sender<()>>,
}

impl IpcServer {
    /// IPC 서버 시작 (백그라운드 태스크)
    pub async fn start() -> Result<Self, IpcError> {
        let (shutdown_tx, shutdown_rx) = oneshot::channel();

        // 백그라운드 태스크 생성
        tokio::spawn(async move {
            if let Err(e) = run_server(shutdown_rx).await {
                eprintln!("IPC server error: {}", e);
            }
        });

        Ok(IpcServer {
            shutdown_tx: Some(shutdown_tx),
        })
    }

    /// IPC 서버 종료
    pub fn shutdown(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

impl Drop for IpcServer {
    fn drop(&mut self) {
        self.shutdown();
        platform::cleanup_socket();
    }
}

/// 서버 메인 루프
async fn run_server(mut shutdown_rx: oneshot::Receiver<()>) -> Result<(), IpcError> {
    let listener = platform::create_listener().await?;

    loop {
        tokio::select! {
            // 종료 신호 대기
            _ = &mut shutdown_rx => {
                println!("IPC server shutting down...");
                break;
            }
            // 연결 수락 (Unix)
            #[cfg(unix)]
            result = platform::accept_connection(&listener) => {
                match result {
                    Ok(stream) => {
                        tokio::spawn(handle_connection_unix(stream));
                    }
                    Err(e) => {
                        eprintln!("Failed to accept connection: {}", e);
                    }
                }
            }
            // 연결 수락 (Windows - blocking이므로 spawn_blocking 필요)
            #[cfg(windows)]
            result = tokio::task::spawn_blocking({
                let listener = listener.try_clone().unwrap();
                move || platform::accept_connection(&listener)
            }) => {
                match result {
                    Ok(Ok(stream)) => {
                        tokio::task::spawn_blocking(move || {
                            handle_connection_windows(stream);
                        });
                    }
                    Ok(Err(e)) => {
                        eprintln!("Failed to accept connection: {}", e);
                    }
                    Err(e) => {
                        eprintln!("Task join error: {}", e);
                    }
                }
            }
        }
    }

    platform::cleanup_socket();
    Ok(())
}

/// Unix 연결 처리 (async)
#[cfg(unix)]
async fn handle_connection_unix(stream: tokio::net::UnixStream) {
    let (reader, mut writer) = stream.into_split();
    let mut reader = BufReader::new(reader);
    let mut line = String::new();

    loop {
        line.clear();

        match reader.read_line(&mut line).await {
            Ok(0) => break, // EOF
            Ok(_) => {
                let response = process_request(&line).await;
                let response_json = serde_json::to_string(&response).unwrap() + "\n";

                if let Err(e) = writer.write_all(response_json.as_bytes()).await {
                    eprintln!("Failed to write response: {}", e);
                    break;
                }
            }
            Err(e) => {
                eprintln!("Failed to read from connection: {}", e);
                break;
            }
        }
    }
}

/// Windows 연결 처리 (blocking)
#[cfg(windows)]
fn handle_connection_windows(stream: interprocess::local_socket::LocalSocketStream) {
    use std::io::{BufRead, BufReader, Write};

    let mut reader = BufReader::new(stream.try_clone().unwrap());
    let mut writer = stream;
    let mut line = String::new();

    loop {
        line.clear();

        match reader.read_line(&mut line) {
            Ok(0) => break, // EOF
            Ok(_) => {
                // blocking 환경에서 async 실행
                let runtime = tokio::runtime::Runtime::new().unwrap();
                let response = runtime.block_on(process_request(&line));
                let response_json = serde_json::to_string(&response).unwrap() + "\n";

                if let Err(e) = writer.write_all(response_json.as_bytes()) {
                    eprintln!("Failed to write response: {}", e);
                    break;
                }
            }
            Err(e) => {
                eprintln!("Failed to read from connection: {}", e);
                break;
            }
        }
    }
}

/// 요청 처리 (공통)
async fn process_request(line: &str) -> crate::ipc::IpcResponse {
    use crate::ipc::{IpcRequest, IpcResponse};

    let line = line.trim();
    if line.is_empty() {
        return IpcResponse::error("Empty request");
    }

    match serde_json::from_str::<IpcRequest>(line) {
        Ok(request) => handler::handle_request(request).await,
        Err(e) => IpcResponse::error(format!("Invalid JSON: {}", e)),
    }
}
```

**핵심 포인트:**
- `tokio::spawn()`으로 백그라운드 실행
- `tokio::select!`로 종료 신호와 연결 수락 동시 처리
- Unix: async I/O
- Windows: `spawn_blocking`으로 blocking I/O 래핑
- JSON 라인 프로토콜 (newline 구분)

---

### Task 1.7: Graceful Shutdown 구현

#### 이미 Task 1.6에서 구현됨

**구현된 내용:**
- `shutdown_tx` 채널로 종료 신호 전달
- `Drop` trait으로 자동 정리
- `tokio::select!`로 종료 신호 감지
- `platform::cleanup_socket()`으로 리소스 정리

**추가 파일**: src-tauri/src/ipc/lifecycle.rs

```rust
// 현재는 비어있음 (향후 확장 가능)
// 예: 활성 연결 추적, 통계 등
```

---

### Task 1.8: Tauri 앱 통합

#### 파일: src-tauri/src/lib.rs

**수정 내용:**

**1. 상단에 import 추가:**
```rust
mod commands;
mod pty;
mod settings;
mod ssh;
mod ipc;  // ← 추가

use pty::PtyManager;
use settings::SettingsManager;
use ssh::SshManager;
use ipc::IpcServer;  // ← 추가
use std::sync::{Arc, Mutex};  // ← 추가
```

**2. `run()` 함수 수정:**

**변경 전:**
```rust
pub fn run() {
    let settings_manager =
        SettingsManager::new().expect("Failed to initialize settings manager");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(PtyManager::new())
        .manage(SshManager::new())
        .manage(settings_manager)
        .invoke_handler(tauri::generate_handler![
            greet,
            // ... commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**변경 후:**
```rust
pub fn run() {
    let settings_manager =
        SettingsManager::new().expect("Failed to initialize settings manager");

    // IPC 서버 상태 관리
    let ipc_server: Arc<Mutex<Option<IpcServer>>> = Arc::new(Mutex::new(None));
    let ipc_server_clone = ipc_server.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(PtyManager::new())
        .manage(SshManager::new())
        .manage(settings_manager)
        .setup(move |_app| {
            // IPC 서버 시작 (비동기 실행)
            let ipc_clone = ipc_server_clone.clone();
            tokio::spawn(async move {
                match IpcServer::start().await {
                    Ok(server) => {
                        *ipc_clone.lock().unwrap() = Some(server);
                        println!("IPC server started successfully");
                    }
                    Err(e) => {
                        eprintln!("Failed to start IPC server: {}", e);
                    }
                }
            });

            Ok(())
        })
        .on_window_event(move |_window, event| {
            use tauri::WindowEvent;

            if let WindowEvent::CloseRequested { .. } = event {
                // 앱 종료 시 IPC 서버 종료
                if let Some(mut server) = ipc_server.lock().unwrap().take() {
                    server.shutdown();
                    println!("IPC server stopped");
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::pty_commands::create_pty,
            commands::pty_commands::write_to_pty,
            commands::pty_commands::resize_pty,
            commands::pty_commands::close_pty,
            commands::settings_commands::load_settings,
            commands::settings_commands::save_settings,
            commands::settings_commands::reset_settings,
            commands::keyring_commands::save_credential,
            commands::keyring_commands::get_credential,
            commands::keyring_commands::delete_credential,
            commands::ssh_commands::create_ssh_session,
            commands::ssh_commands::write_to_ssh,
            commands::ssh_commands::resize_ssh_session,
            commands::ssh_commands::close_ssh_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**핵심 포인트:**
- `Arc<Mutex<Option<IpcServer>>>`로 상태 관리
- `.setup()` 훅에서 IPC 서버 시작
- `.on_window_event()`에서 종료 처리
- `tokio::spawn()`으로 비동기 시작

---

## 통합 체크리스트

### 컴파일 확인

```bash
# 1. Cargo.toml 의존성 추가 확인
cd src-tauri
cargo update

# 2. 컴파일 (에러 없어야 함)
cargo check

# 3. 전체 빌드
cargo build

# 4. 테스트 실행
cargo test
```

### 실행 확인

```bash
# 1. 앱 실행
pnpm tauri dev

# 2. 콘솔에서 확인
# - "IPC server started successfully" 메시지
# - Socket/Pipe 경로 출력

# 3. Socket/Pipe 생성 확인
# Linux/macOS
ls -la /tmp/rusterm-*.sock
stat -c "%a %n" /tmp/rusterm-*.sock  # 600 확인

# Windows (PowerShell)
Get-ChildItem \\.\pipe\ | Where-Object { $_.Name -like "rusterm-*" }
```

### ping 테스트

```bash
# Linux/macOS
echo '{"command":"ping"}' | nc -U /tmp/rusterm-$(id -u).sock

# 예상 응답:
# {"success":true,"data":{"version":"0.1.0","pid":12345}}

# Windows (PowerShell - 별도 스크립트 필요)
# IPC_TASKS.md의 Windows 테스트 참고
```

### 종료 테스트

```bash
# 1. 앱 실행 상태에서 창 닫기
# 2. 콘솔 확인
#    - "IPC server shutting down..." 메시지
#    - "IPC server stopped" 메시지
# 3. Socket 파일 삭제 확인
ls -la /tmp/rusterm-*.sock  # 파일이 없어야 함
```

---

## 예상 이슈 및 해결 방법

### 이슈 1: tokio runtime not found

**증상:**
```
thread 'main' panicked at 'there is no reactor running'
```

**해결:**
- Cargo.toml에 `rt-multi-thread` 기능 추가 확인
- `tokio::spawn()` 호출 시점 확인 (runtime 내에서 실행되어야 함)

### 이슈 2: Socket 파일 권한 에러 (Linux/macOS)

**증상:**
```
Permission denied when accessing socket
```

**해결:**
- `chmod 600` 확인
- UID 일치 확인

### 이슈 3: Windows에서 Named Pipe 접근 불가

**증상:**
```
Access denied to named pipe
```

**해결:**
- `USERNAME` 환경 변수 확인
- 같은 사용자 계정에서 접근 중인지 확인

### 이슈 4: 앱 종료 시 Socket 파일 잔류

**증상:**
- 재시작 시 "Address already in use"

**해결:**
- `Drop` trait 구현 확인
- `cleanup_socket()` 호출 확인
- 시작 시 기존 파일 제거 로직 동작 확인

---

## Phase 1 완료 기준

- [ ] 모든 파일 생성 완료
- [ ] `cargo check` 통과
- [ ] `cargo build` 성공
- [ ] `cargo test` 모두 통과
- [ ] 앱 실행 시 IPC 서버 자동 시작
- [ ] Socket/Pipe 파일 생성 확인
- [ ] `ping` 명령어 정상 응답
- [ ] 앱 종료 시 IPC 서버 정상 종료
- [ ] Socket 파일 자동 삭제 (Unix)
- [ ] 재시작 시 정상 동작

---

**다음 단계:** [IPC_PHASE2_PLAN.md](IPC_PHASE2_PLAN.md) - Tab 관리 API 구현
