use serde::{Deserialize, Serialize};
use thiserror::Error;

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

/// SFTP 인증 방법
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AuthMethod {
    #[serde(rename = "password")]
    Password { password: String },
    #[serde(rename = "privateKey")]
    PrivateKey {
        path: String,
        passphrase: Option<String>,
    },
}

/// 파일/폴더 정보 (원격)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permissions: Option<String>,
}

/// SFTP 세션 생성 응답
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSftpResponse {
    pub session_id: String,
    pub host: String,
    pub username: String,
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

    #[error("Path not found: {0}")]
    PathNotFound(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Failed to read directory: {0}")]
    ReadDirFailed(String),

    #[error("Failed to create directory: {0}")]
    CreateDirFailed(String),

    #[error("Failed to delete file: {0}")]
    DeleteFileFailed(String),

    #[error("Failed to delete directory: {0}")]
    DeleteDirFailed(String),

    #[error("Failed to rename item: {0}")]
    RenameFailed(String),

    #[error("Failed to upload file: {0}")]
    UploadFailed(String),

    #[error("Failed to download file: {0}")]
    DownloadFailed(String),

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

/// 업로드 진행률 페이로드 (Tauri Event로 전송)
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadProgressPayload {
    pub transfer_id: String,
    pub bytes: u64,
    pub total_bytes: u64,
    pub percentage: u8,
}

/// 다운로드 진행률 페이로드 (Tauri Event로 전송)
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgressPayload {
    pub transfer_id: String,
    pub bytes: u64,
    pub total_bytes: u64,
    pub percentage: u8,
}
