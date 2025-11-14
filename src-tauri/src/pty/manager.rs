use super::session::PtySession;
use super::types::{CreatePtyResponse, PtyError};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::Mutex;
use uuid::Uuid;

/// PTY 세션 관리자
pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

impl PtyManager {
    /// 새 PTY Manager 생성
    pub fn new() -> Self {
        PtyManager {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// PTY 세션 생성
    pub async fn create_session(
        &self,
        shell: Option<String>,
        cwd: Option<String>,
        env: Option<HashMap<String, String>>,
        cols: u16,
        rows: u16,
        app_handle: AppHandle,
    ) -> Result<CreatePtyResponse, PtyError> {
        // 고유 PTY ID 생성
        let pty_id = Uuid::new_v4().to_string();

        // PTY 세션 생성
        let session = PtySession::new(
            pty_id.clone(),
            shell,
            cwd,
            env,
            cols,
            rows,
            app_handle,
        )?;

        let response = CreatePtyResponse {
            pty_id: pty_id.clone(),
            pid: session.pid,
            shell: session.shell.clone(),
        };

        // 세션 맵에 추가
        let mut sessions = self.sessions.lock().await;
        sessions.insert(pty_id, session);

        Ok(response)
    }

    /// PTY에 데이터 쓰기
    pub async fn write_to_session(&self, pty_id: &str, data: &str) -> Result<(), PtyError> {
        let sessions = self.sessions.lock().await;
        let session = sessions
            .get(pty_id)
            .ok_or_else(|| PtyError::SessionNotFound(pty_id.to_string()))?;

        session.write(data).await
    }

    /// PTY 크기 조정
    pub async fn resize_session(&self, pty_id: &str, cols: u16, rows: u16) -> Result<(), PtyError> {
        let sessions = self.sessions.lock().await;
        let session = sessions
            .get(pty_id)
            .ok_or_else(|| PtyError::SessionNotFound(pty_id.to_string()))?;

        session.resize(cols, rows).await
    }

    /// PTY 세션 종료
    pub async fn close_session(&self, pty_id: &str) -> Result<(), PtyError> {
        let mut sessions = self.sessions.lock().await;
        sessions
            .remove(pty_id)
            .ok_or_else(|| PtyError::SessionNotFound(pty_id.to_string()))?;

        Ok(())
    }
}

impl Default for PtyManager {
    fn default() -> Self {
        Self::new()
    }
}
