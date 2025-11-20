# RusTerm IPC Phase 2 구현 계획

**Version**: 1.0
**Date**: 2025-11-19
**Phase**: Phase 2 - Tab Management API 구현

---

## 목차

1. [구현 개요](#구현-개요)
2. [아키텍처 설계](#아키텍처-설계)
3. [Task별 상세 구현 계획](#task별-상세-구현-계획)
4. [통합 체크리스트](#통합-체크리스트)

---

## 구현 개요

### Phase 2의 목표

- **add_ssh_tab**: IPC를 통해 SSH 탭 생성
- **add_local_tab**: IPC를 통해 로컬 터미널 탭 생성
- **close_tab**: IPC를 통해 탭 닫기
- **list_tabs**: 현재 열린 탭 목록 조회

### 핵심 과제

**문제:** IPC 서버는 별도 백그라운드 태스크에서 실행되므로 `tauri::State`에 직접 접근할 수 없음

**해결 방법:**
1. `AppHandle`을 IPC 서버로 전달
2. IPC 핸들러에서 `app_handle.state::<PtyManager>()`로 접근
3. 프론트엔드에 Tauri 이벤트를 emit하여 탭 생성 알림

---

## 아키텍처 설계

### 기존 구조 분석

#### 1. PtyManager / SshManager
```rust
// src-tauri/src/lib.rs
.manage(PtyManager::new())
.manage(SshManager::new())

// Tauri 커맨드에서 접근
#[tauri::command]
pub async fn create_pty(
    state: State<'_, PtyManager>,
    app_handle: AppHandle,
    // ...
) -> Result<CreatePtyResponse, String>
```

**특징:**
- `tauri::State`로 관리
- Tauri 커맨드에서 `State<'_, PtyManager>` 파라미터로 접근
- 세션 생성 시 `AppHandle`을 전달 (이벤트 emit용)

#### 2. 프론트엔드 Tab Store
```typescript
// src/stores/use-tab-store.ts
export interface Tab {
  id: string;
  title: string;
  type: TabType;  // 'home' | 'terminal'
  closable: boolean;
  ptyId?: number;
  isActive: boolean;
  connectionType?: ConnectionType;  // 'local' | 'ssh'
  connectionProfileId?: string;
}
```

**특징:**
- Zustand store로 탭 상태 관리
- `ptyId`로 PTY 세션과 연결
- `connectionType`으로 로컬/SSH 구분

---

### Phase 2 아키텍처

```
┌─────────────────┐
│  External App   │
│  (Python/Node)  │
└────────┬────────┘
         │ IPC (Named Pipe / Unix Socket)
         ▼
┌─────────────────────────────────────┐
│  IPC Server (Background Thread)     │
│  ┌──────────────────────────────┐   │
│  │  handler.rs                  │   │
│  │  - handle_request()          │   │
│  │    - "add_ssh_tab" ──────────┼───┼──┐
│  │    - "add_local_tab" ────────┼───┼──┼──┐
│  │    - "close_tab" ────────────┼───┼──┼──┼──┐
│  │    - "list_tabs" ────────────┼───┼──┼──┼──┼──┐
│  └──────────────────────────────┘   │  │  │  │  │
└─────────────────────────────────────┘  │  │  │  │
                                         │  │  │  │
         ┌───────────────────────────────┘  │  │  │
         │  app_handle.state::<SshManager>()│  │  │
         ▼                                  ▼  │  │
┌─────────────────┐              ┌─────────────────┐
│  SshManager     │              │  PtyManager     │
│  - create_session() ────────┐  │  - create_session() ─────┐
│  - close_session()  ◄───────┼──┼  - close_session() ◄─────┼──┐
└─────────────────┘           │  └─────────────────┘        │  │
                              │                             │  │
         ┌────────────────────┴────────────────────────────┴──┴──┐
         │  app_handle.emit("tab-created", TabCreatedPayload)   │
         │  app_handle.emit("tab-closed", TabClosedPayload)     │
         └────────────────────┬─────────────────────────────────┘
                              ▼
                   ┌────────────────────┐
                   │  Frontend (React)  │
                   │  - useTabStore()   │
                   │  - listen("tab-created") │
                   │  - addTab()        │
                   └────────────────────┘
```

**핵심 흐름:**
1. 외부 앱이 IPC로 `add_ssh_tab` 요청
2. IPC 핸들러가 `AppHandle`을 통해 `SshManager.create_session()` 호출
3. 세션 생성 성공 시 `app_handle.emit("tab-created", {...})` 이벤트 발송
4. 프론트엔드가 이벤트를 받아 `useTabStore().addTab()` 호출
5. IPC 응답으로 `{ success: true, data: { sessionId, ... } }` 반환

---

## Task별 상세 구현 계획

---

### Task 2.1: IPC 서버에 AppHandle 전달

#### 목적
IPC 핸들러에서 `PtyManager`, `SshManager`에 접근하기 위해 `AppHandle` 필요

#### 수정 파일

**1. src-tauri/src/ipc/server.rs**

**변경 전:**
```rust
pub struct IpcServer {
    shutdown_tx: Option<oneshot::Sender<()>>,
}

impl IpcServer {
    pub async fn start() -> Result<Self, IpcError> {
        let (shutdown_tx, shutdown_rx) = oneshot::channel();

        tokio::spawn(async move {
            if let Err(e) = run_server(shutdown_rx).await {
                eprintln!("IPC server error: {}", e);
            }
        });

        Ok(IpcServer {
            shutdown_tx: Some(shutdown_tx),
        })
    }
}

async fn run_server(mut shutdown_rx: oneshot::Receiver<()>) -> Result<(), IpcError> {
    // ...
}
```

**변경 후:**
```rust
use tauri::AppHandle;

pub struct IpcServer {
    shutdown_tx: Option<oneshot::Sender<()>>,
}

impl IpcServer {
    pub async fn start(app_handle: AppHandle) -> Result<Self, IpcError> {
        let (shutdown_tx, shutdown_rx) = oneshot::channel();

        tokio::spawn(async move {
            if let Err(e) = run_server(shutdown_rx, app_handle).await {
                eprintln!("IPC server error: {}", e);
            }
        });

        Ok(IpcServer {
            shutdown_tx: Some(shutdown_tx),
        })
    }
}

async fn run_server(
    mut shutdown_rx: oneshot::Receiver<()>,
    app_handle: AppHandle,
) -> Result<(), IpcError> {
    let listener = platform::create_listener().await?;

    loop {
        tokio::select! {
            _ = &mut shutdown_rx => {
                println!("IPC server shutting down...");
                break;
            }
            // Unix: async accept
            #[cfg(unix)]
            result = platform::accept_connection(&mut listener) => {
                match result {
                    Ok(_) => {
                        let app = app_handle.clone();
                        let server = listener;
                        tokio::spawn(async move {
                            handle_connection_unix(server, app).await;
                        });
                        // 다음 인스턴스 생성
                        listener = platform::create_next_instance().await?;
                    }
                    Err(e) => {
                        eprintln!("Failed to accept connection: {}", e);
                    }
                }
            }
            // Windows: async accept
            #[cfg(windows)]
            result = platform::accept_connection(&mut listener) => {
                match result {
                    Ok(_) => {
                        let app = app_handle.clone();
                        let server = listener;
                        tokio::spawn(async move {
                            handle_connection_windows(server, app).await;
                        });
                        // 다음 인스턴스 생성
                        listener = platform::create_next_instance().await?;
                    }
                    Err(e) => {
                        eprintln!("Failed to accept connection: {}", e);
                    }
                }
            }
        }
    }

    platform::cleanup_socket();
    Ok(())
}

// Unix 연결 처리 - AppHandle 추가
#[cfg(unix)]
async fn handle_connection_unix(
    server: tokio::net::windows::named_pipe::NamedPipeServer,
    app_handle: AppHandle,
) {
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

    let mut reader = BufReader::new(server);
    let mut line = String::new();

    loop {
        line.clear();

        match reader.read_line(&mut line).await {
            Ok(0) => break,
            Ok(_) => {
                let response = process_request(&line, &app_handle).await;
                let response_json = serde_json::to_string(&response).unwrap() + "\n";

                if let Err(e) = reader.get_mut().write_all(response_json.as_bytes()).await {
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

// Windows 연결 처리 - AppHandle 추가
#[cfg(windows)]
async fn handle_connection_windows(
    server: tokio::net::windows::named_pipe::NamedPipeServer,
    app_handle: AppHandle,
) {
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

    let mut reader = BufReader::new(server);
    let mut line = String::new();

    loop {
        line.clear();

        match reader.read_line(&mut line).await {
            Ok(0) => break,
            Ok(_) => {
                let response = process_request(&line, &app_handle).await;
                let response_json = serde_json::to_string(&response).unwrap() + "\n";

                if let Err(e) = reader.get_mut().write_all(response_json.as_bytes()).await {
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

// process_request에 AppHandle 추가
async fn process_request(line: &str, app_handle: &AppHandle) -> crate::ipc::IpcResponse {
    use crate::ipc::{IpcRequest, IpcResponse};

    let line = line.trim();
    if line.is_empty() {
        return IpcResponse::error("Empty request");
    }

    match serde_json::from_str::<IpcRequest>(line) {
        Ok(request) => handler::handle_request(request, app_handle).await,
        Err(e) => IpcResponse::error(format!("Invalid JSON: {}", e)),
    }
}
```

**2. src-tauri/src/lib.rs**

**변경 전:**
```rust
.setup(move |_app| {
    let ipc_clone = ipc_server_clone.clone();
    tauri::async_runtime::spawn(async move {
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
```

**변경 후:**
```rust
.setup(move |app| {
    let ipc_clone = ipc_server_clone.clone();
    let app_handle = app.handle().clone();

    tauri::async_runtime::spawn(async move {
        match IpcServer::start(app_handle).await {
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
```

---

### Task 2.2: Tauri 이벤트 타입 정의

#### 목적
프론트엔드에 탭 생성/삭제 이벤트를 전달하기 위한 타입 정의

#### 파일 생성

**src-tauri/src/ipc/events.rs**

```rust
use serde::Serialize;

/// 탭 생성 이벤트 페이로드
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TabCreatedPayload {
    pub tab_id: String,
    pub tab_type: String,  // "local" | "ssh"
    pub title: String,
    pub pty_id: Option<String>,
    pub session_id: Option<String>,
}

/// 탭 종료 이벤트 페이로드
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TabClosedPayload {
    pub tab_id: String,
}
```

**src-tauri/src/ipc/mod.rs 수정:**

```rust
mod protocol;
mod server;
mod handler;
mod lifecycle;
mod platform;
mod events;  // ← 추가

pub use protocol::{IpcRequest, IpcResponse, IpcError};
pub use server::IpcServer;
pub use events::{TabCreatedPayload, TabClosedPayload};  // ← 추가
```

---

### Task 2.3: Tab Management 핸들러 구현

#### 파일 수정: src-tauri/src/ipc/handler.rs

**전체 구현:**

```rust
use crate::ipc::protocol::{
    AddLocalTabParams, AddSshTabParams, CloseTabParams, IpcRequest, IpcResponse, ListTabsResponse,
    PingResponse, TabInfo,
};
use crate::ipc::events::{TabCreatedPayload, TabClosedPayload};
use crate::pty::{CreatePtyResponse, PtyManager};
use crate::ssh::{CreateSshResponse, SshManager};
use tauri::{AppHandle, Manager};

/// IPC 요청 처리
pub async fn handle_request(request: IpcRequest, app_handle: &AppHandle) -> IpcResponse {
    match request.command.as_str() {
        "ping" => handle_ping().await,
        "add_ssh_tab" => handle_add_ssh_tab(request.params, app_handle).await,
        "add_local_tab" => handle_add_local_tab(request.params, app_handle).await,
        "close_tab" => handle_close_tab(request.params, app_handle).await,
        "list_tabs" => handle_list_tabs(app_handle).await,
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

/// add_ssh_tab 커맨드 처리
async fn handle_add_ssh_tab(
    params: Option<serde_json::Value>,
    app_handle: &AppHandle,
) -> IpcResponse {
    // 파라미터 파싱
    let params: AddSshTabParams = match params {
        Some(p) => match serde_json::from_value(p) {
            Ok(params) => params,
            Err(e) => return IpcResponse::error(format!("Invalid params: {}", e)),
        },
        None => return IpcResponse::error("Missing params for add_ssh_tab"),
    };

    // SshManager 가져오기
    let ssh_manager = app_handle.state::<SshManager>();

    // SSH 세션 생성
    match ssh_manager
        .create_session(params.config.clone(), params.cols, params.rows, app_handle.clone())
        .await
    {
        Ok(response) => {
            // 프론트엔드에 탭 생성 이벤트 emit
            let payload = TabCreatedPayload {
                tab_id: response.session_id.clone(),
                tab_type: "ssh".to_string(),
                title: format!("{}@{}", response.username, response.host),
                pty_id: None,
                session_id: Some(response.session_id.clone()),
            };

            if let Err(e) = app_handle.emit("tab-created", payload) {
                eprintln!("Failed to emit tab-created event: {}", e);
            }

            IpcResponse::success(response)
        }
        Err(e) => IpcResponse::error(format!("Failed to create SSH session: {}", e)),
    }
}

/// add_local_tab 커맨드 처리
async fn handle_add_local_tab(
    params: Option<serde_json::Value>,
    app_handle: &AppHandle,
) -> IpcResponse {
    // 파라미터 파싱
    let params: AddLocalTabParams = match params {
        Some(p) => match serde_json::from_value(p) {
            Ok(params) => params,
            Err(e) => return IpcResponse::error(format!("Invalid params: {}", e)),
        },
        None => return IpcResponse::error("Missing params for add_local_tab"),
    };

    // PtyManager 가져오기
    let pty_manager = app_handle.state::<PtyManager>();

    // PTY 세션 생성
    match pty_manager
        .create_session(
            None,  // shell: None (use default)
            None,  // args: None
            params.cwd,
            None,  // env: None
            params.cols,
            params.rows,
            app_handle.clone(),
        )
        .await
    {
        Ok(response) => {
            // 프론트엔드에 탭 생성 이벤트 emit
            let payload = TabCreatedPayload {
                tab_id: response.pty_id.clone(),
                tab_type: "local".to_string(),
                title: response.shell.clone(),
                pty_id: Some(response.pty_id.clone()),
                session_id: None,
            };

            if let Err(e) = app_handle.emit("tab-created", payload) {
                eprintln!("Failed to emit tab-created event: {}", e);
            }

            IpcResponse::success(response)
        }
        Err(e) => IpcResponse::error(format!("Failed to create PTY session: {}", e)),
    }
}

/// close_tab 커맨드 처리
async fn handle_close_tab(
    params: Option<serde_json::Value>,
    app_handle: &AppHandle,
) -> IpcResponse {
    // 파라미터 파싱
    let params: CloseTabParams = match params {
        Some(p) => match serde_json::from_value(p) {
            Ok(params) => params,
            Err(e) => return IpcResponse::error(format!("Invalid params: {}", e)),
        },
        None => return IpcResponse::error("Missing params for close_tab"),
    };

    let tab_id = &params.tab_id;

    // PTY 세션 종료 시도
    let pty_manager = app_handle.state::<PtyManager>();
    let pty_result = pty_manager.close_session(tab_id).await;

    // SSH 세션 종료 시도
    let ssh_manager = app_handle.state::<SshManager>();
    let ssh_result = ssh_manager.close_session(tab_id).await;

    // 둘 중 하나라도 성공하면 OK
    if pty_result.is_ok() || ssh_result.is_ok() {
        // 프론트엔드에 탭 종료 이벤트 emit
        let payload = TabClosedPayload {
            tab_id: tab_id.clone(),
        };

        if let Err(e) = app_handle.emit("tab-closed", payload) {
            eprintln!("Failed to emit tab-closed event: {}", e);
        }

        IpcResponse::success(serde_json::json!({
            "tab_id": tab_id,
            "closed": true
        }))
    } else {
        IpcResponse::error(format!("Tab not found: {}", tab_id))
    }
}

/// list_tabs 커맨드 처리
async fn handle_list_tabs(app_handle: &AppHandle) -> IpcResponse {
    // 현재는 백엔드에서 탭 목록을 관리하지 않으므로
    // 프론트엔드 store에서 가져와야 함
    // 임시로 빈 리스트 반환 (Phase 3에서 개선)

    let response = ListTabsResponse { tabs: vec![] };

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
        let response = handle_ping().await;
        assert!(response.success);
        assert!(response.data.is_some());
    }
}
```

**핵심 포인트:**
- `app_handle.state::<PtyManager>()` / `app_handle.state::<SshManager>()`로 접근
- 세션 생성 성공 시 `app_handle.emit("tab-created", ...)` 이벤트 발송
- `close_tab`은 PTY와 SSH 모두 시도 (둘 중 하나만 성공하면 OK)
- `list_tabs`는 현재 빈 리스트 반환 (백엔드에서 탭 목록 추적하지 않음)

---

### Task 2.4: 프론트엔드 이벤트 리스너 추가

#### 목적
IPC로 생성된 탭을 프론트엔드 store에 반영

#### 수정 파일: src/App.tsx (또는 MainLayout.tsx)

**추가할 코드:**

```typescript
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useTabStore } from '@/stores/use-tab-store';

// App 컴포넌트 또는 MainLayout 컴포넌트 내부
useEffect(() => {
  // tab-created 이벤트 리스너
  const unlistenTabCreated = listen('tab-created', (event: any) => {
    const payload = event.payload;

    useTabStore.getState().addTab({
      id: payload.tabId,
      title: payload.title,
      type: 'terminal',
      closable: true,
      ptyId: payload.ptyId ? parseInt(payload.ptyId) : undefined,
      connectionType: payload.tabType === 'ssh' ? 'ssh' : 'local',
    });
  });

  // tab-closed 이벤트 리스너
  const unlistenTabClosed = listen('tab-closed', (event: any) => {
    const payload = event.payload;

    useTabStore.getState().closeTab(payload.tabId);
  });

  // Cleanup
  return () => {
    unlistenTabCreated.then((fn) => fn());
    unlistenTabClosed.then((fn) => fn());
  };
}, []);
```

**위치:**
- `src/App.tsx`의 `useEffect` 추가
- 또는 `src/components/layout/MainLayout.tsx`에 추가

---

### Task 2.5: PowerShell 테스트 스크립트 작성

#### 파일 생성: test-ipc-add-tab.ps1

```powershell
# RusTerm IPC Tab Management Test Script
# Windows Named Pipe를 통해 탭 생성/삭제 테스트

$ErrorActionPreference = "Stop"

# Named Pipe 이름
$username = $env:USERNAME
$pipeName = "rusterm-$username"
$pipeFullPath = "\\.\pipe\$pipeName"

function Send-IpcCommand {
    param(
        [string]$Command
    )

    try {
        # Named Pipe 연결
        $pipeClient = New-Object System.IO.Pipes.NamedPipeClientStream(".", $pipeName, [System.IO.Pipes.PipeDirection]::InOut)
        $pipeClient.Connect(5000)

        $streamReader = New-Object System.IO.StreamReader($pipeClient)
        $streamWriter = New-Object System.IO.StreamWriter($pipeClient)
        $streamWriter.AutoFlush = $true

        # 요청 전송
        Write-Host "[SEND] $Command" -ForegroundColor DarkGray
        $streamWriter.WriteLine($Command)

        # 응답 받기
        $response = $streamReader.ReadLine()
        Write-Host "[RECV] $response" -ForegroundColor DarkGray

        # 정리
        $streamReader.Close()
        $streamWriter.Close()
        $pipeClient.Close()

        return $response | ConvertFrom-Json

    } catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "=== RusTerm IPC Tab Management Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Add local tab
Write-Host "[Test 1] Adding local tab..." -ForegroundColor Yellow
$addLocalCmd = @{
    command = "add_local_tab"
    params = @{
        cols = 80
        rows = 24
        cwd = $HOME
    }
} | ConvertTo-Json -Compress

$response = Send-IpcCommand -Command $addLocalCmd
if ($response.success) {
    Write-Host "[OK] Local tab created: $($response.data.pty_id)" -ForegroundColor Green
    $localTabId = $response.data.pty_id
} else {
    Write-Host "[FAIL] $($response.error)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Add SSH tab (requires SSH server)
Write-Host "[Test 2] Adding SSH tab..." -ForegroundColor Yellow
$addSshCmd = @{
    command = "add_ssh_tab"
    params = @{
        host = "localhost"
        port = 22
        username = $env:USERNAME
        authMethod = "password"
        password = "test123"  # WARNING: Test only!
        cols = 80
        rows = 24
    }
} | ConvertTo-Json -Compress

$response = Send-IpcCommand -Command $addSshCmd
if ($response.success) {
    Write-Host "[OK] SSH tab created: $($response.data.session_id)" -ForegroundColor Green
    $sshTabId = $response.data.session_id
} else {
    Write-Host "[WARN] SSH failed (expected if no SSH server): $($response.error)" -ForegroundColor Yellow
}

Write-Host ""

# Test 3: List tabs (currently returns empty)
Write-Host "[Test 3] Listing tabs..." -ForegroundColor Yellow
$listCmd = @{
    command = "list_tabs"
} | ConvertTo-Json -Compress

$response = Send-IpcCommand -Command $listCmd
if ($response.success) {
    Write-Host "[OK] Tabs: $($response.data.tabs.Count)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] $($response.error)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Close tab
if ($localTabId) {
    Write-Host "[Test 4] Closing local tab..." -ForegroundColor Yellow
    $closeCmd = @{
        command = "close_tab"
        params = @{
            tabId = $localTabId
        }
    } | ConvertTo-Json -Compress

    $response = Send-IpcCommand -Command $closeCmd
    if ($response.success) {
        Write-Host "[OK] Tab closed: $localTabId" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $($response.error)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Test Completed ===" -ForegroundColor Green
```

---

## 통합 체크리스트

### 컴파일 확인

```bash
# Rust 컴파일
cd src-tauri
cargo check
cargo build

# TypeScript 컴파일
cd ..
pnpm run build
```

### 기능 테스트

**1. 로컬 탭 생성 테스트:**
```powershell
.\test-ipc-add-tab.ps1
```

**2. 수동 테스트:**
```powershell
# PowerShell에서 직접 실행
$pipe = New-Object System.IO.Pipes.NamedPipeClientStream(".", "rusterm-$env:USERNAME", [System.IO.Pipes.PipeDirection]::InOut)
$pipe.Connect(5000)
$writer = New-Object System.IO.StreamWriter($pipe)
$writer.AutoFlush = $true
$reader = New-Object System.IO.StreamReader($pipe)

# add_local_tab
$writer.WriteLine('{"command":"add_local_tab","params":{"cols":80,"rows":24}}')
$response = $reader.ReadLine()
Write-Host $response

# close_tab
$writer.WriteLine('{"command":"close_tab","params":{"tabId":"YOUR_TAB_ID"}}')
$response = $reader.ReadLine()
Write-Host $response

$pipe.Close()
```

**3. 프론트엔드 확인:**
- RusTerm 앱 실행
- IPC로 탭 생성 후 UI에 탭이 나타나는지 확인
- 터미널이 정상 작동하는지 확인
- 탭 닫기가 정상 작동하는지 확인

### 예상 응답

**add_local_tab 성공:**
```json
{
  "success": true,
  "data": {
    "pty_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "pid": 12345,
    "shell": "powershell.exe"
  }
}
```

**add_ssh_tab 성공:**
```json
{
  "success": true,
  "data": {
    "session_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "host": "localhost",
    "username": "user"
  }
}
```

**close_tab 성공:**
```json
{
  "success": true,
  "data": {
    "tab_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "closed": true
  }
}
```

**에러 응답:**
```json
{
  "success": false,
  "error": "Tab not found: invalid-id"
}
```

---

## Phase 2 완료 기준

- [ ] `IpcServer::start()`에 `AppHandle` 전달 구현
- [ ] IPC 핸들러에서 `app_handle.state::<PtyManager>()` 접근 성공
- [ ] `add_local_tab` 구현 및 테스트 통과
- [ ] `add_ssh_tab` 구현 및 테스트 통과
- [ ] `close_tab` 구현 및 테스트 통과
- [ ] `list_tabs` 구현 (빈 리스트 반환)
- [ ] Tauri 이벤트 emit 구현
- [ ] 프론트엔드 이벤트 리스너 구현
- [ ] PowerShell 테스트 스크립트 작성 및 성공
- [ ] UI에 IPC로 생성된 탭이 나타남
- [ ] IPC로 생성된 탭이 정상 작동
- [ ] IPC로 탭 닫기 성공

---

## 주의사항

### list_tabs 제한사항

현재 백엔드는 탭 목록을 추적하지 않습니다:
- `PtyManager`는 `pty_id` → `PtySession` 매핑만 관리
- `SshManager`는 `session_id` → `SshSession` 매핑만 관리
- 탭 메타데이터(title, type, active)는 프론트엔드 store에만 존재

**Phase 2 해결책:**
- `list_tabs`는 빈 리스트 반환
- 프론트엔드가 항상 정확한 탭 목록을 가지고 있다고 가정

**Phase 3 개선 방향:**
1. 백엔드에 `TabManager` 추가
2. 탭 생성 시 `TabManager`에 등록
3. `list_tabs`에서 실제 탭 목록 반환

### 보안 고려사항

**SSH 비밀번호:**
- 테스트 스크립트에 하드코딩하지 않기
- Keyring에서 가져오거나 환경 변수 사용
- IPC 로그에 비밀번호가 노출되지 않도록 주의

**IPC 권한:**
- Named Pipe / Unix Socket 권한은 Phase 1에서 이미 설정됨
- 같은 사용자만 접근 가능

---

**다음 단계:** Phase 3 - Example Clients (Python, Node.js)
