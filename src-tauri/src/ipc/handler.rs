use crate::ipc::protocol::{IpcRequest, IpcResponse, PingResponse};

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
