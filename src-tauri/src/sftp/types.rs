use serde::{Deserialize, Serialize};
use thiserror::Error;

// AuthMethod는 SSH 타입 재사용 (public re-export를 통해)
use crate::ssh::AuthMethod;

/// SFTP 연결 설정
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SftpConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auth_method: Option<AuthMethod>,
}

/// SFTP 세션 생성 응답
#[derive(Debug, Serialize)]
pub struct CreateSftpResponse {
    pub session_id: String,
    pub host: String,
    pub username: String,
    pub initial_path: String,
}

/// 파일/디렉토리 엔트리
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64,
    pub permissions: String,
}

/// SFTP 에러 타입
#[derive(Debug, Error)]
pub enum SftpError {
    #[error("Session not found: {0}")]
    SessionNotFound(String),

    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),

    #[error("File operation failed: {0}")]
    FileOperationFailed(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("SSH error: {0}")]
    SshError(String),
}

impl From<SftpError> for String {
    fn from(err: SftpError) -> Self {
        err.to_string()
    }
}
