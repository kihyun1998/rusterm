use serde::{Deserialize, Serialize};
use thiserror::Error;

/// 파일/폴더 정보
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: u64, // bytes
    pub modified: u64, // timestamp (milliseconds since epoch)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permissions: Option<String>, // e.g., "rwxr-xr-x"
}

/// 디렉토리 목록 응답
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileListResponse {
    pub path: String,
    pub files: Vec<FileInfo>,
}

/// 파일 시스템 에러
#[derive(Debug, Error)]
pub enum FsError {
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

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

impl From<FsError> for String {
    fn from(err: FsError) -> Self {
        err.to_string()
    }
}
