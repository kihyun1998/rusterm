use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

/// PTY 생성 요청 파라미터
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct CreatePtyRequest {
    pub shell: Option<String>,
    pub cwd: Option<String>,
    pub env: Option<HashMap<String, String>>,
    pub cols: u16,
    pub rows: u16,
}

/// PTY 생성 응답
#[derive(Debug, Serialize)]
pub struct CreatePtyResponse {
    pub pty_id: String,
    pub pid: u32,
    pub shell: String,
}

/// PTY 쓰기 요청
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct WritePtyRequest {
    pub pty_id: String,
    pub data: String,
}

/// PTY 리사이즈 요청
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct ResizePtyRequest {
    pub pty_id: String,
    pub cols: u16,
    pub rows: u16,
}

/// PTY 출력 이벤트 페이로드
#[derive(Debug, Clone, Serialize)]
pub struct PtyOutputEvent {
    pub pty_id: String,
    pub data: String,
}

/// PTY 종료 이벤트 페이로드
#[derive(Debug, Clone, Serialize)]
pub struct PtyExitEvent {
    pub pty_id: String,
    pub exit_code: Option<i32>,
}

/// PTY 에러 타입
#[derive(Debug, Error)]
pub enum PtyError {
    #[error("Session not found: {0}")]
    SessionNotFound(String),

    #[error("Failed to create PTY: {0}")]
    CreationFailed(String),

    #[error("Failed to write to PTY: {0}")]
    WriteFailed(String),

    #[error("Failed to resize PTY: {0}")]
    ResizeFailed(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("PTY error: {0}")]
    PtyError(String),
}

impl From<PtyError> for String {
    fn from(err: PtyError) -> Self {
        err.to_string()
    }
}
