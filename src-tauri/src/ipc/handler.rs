use crate::ipc::protocol::{
    AddLocalTabParams, AddSshTabParams, CloseTabParams, IpcRequest, IpcResponse, ListTabsResponse,
    PingResponse, TabInfo,
};
use crate::ipc::events::{TabCreatedPayload, TabClosedPayload};
use crate::pty::PtyManager;
use crate::ssh::{SshManager, SshOutputEvent};
use tauri::{AppHandle, Manager, Emitter};
use uuid::Uuid;

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
/// Option B: 탭을 먼저 생성하고, SSH 연결 실패 시 탭 내부에 에러 표시
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

    // 세션 ID 미리 생성
    let session_id = Uuid::new_v4().to_string();

    // 프론트엔드에 탭 생성 이벤트 먼저 emit (연결 전)
    let payload = TabCreatedPayload {
        tab_id: session_id.clone(),
        tab_type: "ssh".to_string(),
        title: format!("{}@{}", params.config.username, params.config.host),
        pty_id: None,
        session_id: Some(session_id.clone()),
    };

    if let Err(e) = app_handle.emit("tab-created", payload) {
        eprintln!("Failed to emit tab-created event: {}", e);
        return IpcResponse::error(format!("Failed to emit tab-created event: {}", e));
    }

    // 응답 생성 (즉시 반환)
    let response = serde_json::json!({
        "session_id": session_id.clone(),
        "host": params.config.host.clone(),
        "username": params.config.username.clone(),
    });

    // SshManager 가져오기 (clone으로 소유권 확보)
    let ssh_manager = app_handle.state::<SshManager>().inner().clone();
    let config = params.config.clone();
    let cols = params.cols;
    let rows = params.rows;
    let app_handle_clone = app_handle.clone();
    let session_id_clone = session_id.clone();

    // 백그라운드에서 SSH 연결 시도
    tauri::async_runtime::spawn(async move {
        match ssh_manager
            .create_session_with_id(
                Some(session_id_clone.clone()),
                config.clone(),
                cols,
                rows,
                app_handle_clone.clone(),
            )
            .await
        {
            Ok(_) => {
                // 연결 성공 - SSH 세션이 자동으로 출력 이벤트 전송
                eprintln!("[IPC] SSH session created successfully: {}", session_id_clone);
            }
            Err(e) => {
                // 연결 실패 - 탭에 에러 메시지 표시
                eprintln!("[IPC] SSH connection failed: {}", e);
                let error_msg = format!("\r\n\x1b[1;31m[SSH Connection Failed: {}]\x1b[0m\r\n\r\nConnection details:\r\n  Host: {}:{}\r\n  User: {}\r\n",
                    e, config.host, config.port, config.username);

                // SSH 출력 이벤트로 에러 메시지 전송
                let _ = app_handle_clone.emit(
                    &format!("ssh://output/{}", session_id_clone),
                    SshOutputEvent {
                        session_id: session_id_clone.clone(),
                        data: error_msg,
                    },
                );
            }
        }
    });

    // 즉시 성공 응답 반환 (연결 완료 대기 안 함)
    IpcResponse::success(response)
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
    let mut tabs = Vec::new();

    // PTY 세션 목록 가져오기
    let pty_manager = app_handle.state::<PtyManager>();
    let pty_sessions = pty_manager.list_sessions().await;
    for pty_id in pty_sessions {
        tabs.push(TabInfo {
            tab_id: pty_id.clone(),
            tab_type: "local".to_string(),
            title: format!("Terminal {}", &pty_id[..8]), // 짧은 ID 표시
            active: false, // IPC에서는 active 상태를 알 수 없음
        });
    }

    // SSH 세션 목록 가져오기
    let ssh_manager = app_handle.state::<SshManager>();
    let ssh_sessions = ssh_manager.list_sessions().await;
    for session_id in ssh_sessions {
        tabs.push(TabInfo {
            tab_id: session_id.clone(),
            tab_type: "ssh".to_string(),
            title: format!("SSH {}", &session_id[..8]), // 짧은 ID 표시
            active: false, // IPC에서는 active 상태를 알 수 없음
        });
    }

    let response = ListTabsResponse { tabs };

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
