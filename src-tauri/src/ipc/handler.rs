use crate::ipc::protocol::{
    AddLocalTabParams, AddSshTabParams, CloseTabParams, IpcRequest, IpcResponse, ListTabsResponse,
    PingResponse,
};
use crate::ipc::events::{TabCreatedPayload, TabClosedPayload};
use crate::pty::PtyManager;
use crate::ssh::SshManager;
use tauri::{AppHandle, Manager, Emitter};

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
async fn handle_list_tabs(_app_handle: &AppHandle) -> IpcResponse {
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
