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
                "cwd": "/home/user"
            }
        }"#;
        let req: IpcRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.command, "add_local_tab");
    }
}
