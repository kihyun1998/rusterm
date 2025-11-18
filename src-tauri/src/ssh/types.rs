use serde::{Deserialize, Serialize};
use thiserror::Error;

/// SSH 연결 설정
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SshConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: AuthMethod,
}

/// SSH 인증 방법
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AuthMethod {
    #[serde(rename = "password")]
    Password { password: String },
    #[serde(rename = "privateKey")]
    PrivateKey { path: String, passphrase: Option<String> },
}

/// SSH 세션 생성 응답
#[derive(Debug, Serialize)]
pub struct CreateSshResponse {
    pub session_id: String,
    pub host: String,
    pub username: String,
}

/// SSH 세션 생성 요청
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct CreateSshRequest {
    pub config: SshConfig,
    pub cols: u16,
    pub rows: u16,
}

/// SSH 입력 쓰기 요청
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct WriteSshRequest {
    pub session_id: String,
    pub data: String,
}

/// SSH 리사이즈 요청
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct ResizeSshRequest {
    pub session_id: String,
    pub cols: u16,
    pub rows: u16,
}

/// SSH 출력 이벤트 페이로드
#[derive(Debug, Clone, Serialize)]
pub struct SshOutputEvent {
    pub session_id: String,
    pub data: String,
}

/// SSH 연결 종료 이벤트 페이로드
#[derive(Debug, Clone, Serialize)]
pub struct SshExitEvent {
    pub session_id: String,
    pub reason: String,
}

/// SSH 에러 타입
#[derive(Debug, Error)]
pub enum SshError {
    #[error("Session not found: {0}")]
    SessionNotFound(String),

    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),

    #[error("Failed to write to SSH session: {0}")]
    WriteFailed(String),

    #[error("Failed to resize SSH session: {0}")]
    ResizeFailed(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("SSH error: {0}")]
    SshError(String),
}

impl From<SshError> for String {
    fn from(err: SshError) -> Self {
        err.to_string()
    }
}
