use super::session::SshSession;
use super::types::{CreateSshResponse, SshConfig, SshError};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::Mutex;
use uuid::Uuid;

/// SSH 세션 관리자
#[derive(Clone)]
pub struct SshManager {
    sessions: Arc<Mutex<HashMap<String, SshSession>>>,
}

impl SshManager {
    /// 새 SSH Manager 생성
    pub fn new() -> Self {
        SshManager {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// SSH 세션 생성
    pub async fn create_session(
        &self,
        config: SshConfig,
        cols: u16,
        rows: u16,
        app_handle: AppHandle,
    ) -> Result<CreateSshResponse, SshError> {
        self.create_session_with_id(None, config, cols, rows, app_handle).await
    }

    /// SSH 세션 생성 (세션 ID 지정 가능)
    /// IPC에서 탭을 먼저 생성하고 나중에 연결할 때 사용
    pub async fn create_session_with_id(
        &self,
        session_id: Option<String>,
        config: SshConfig,
        cols: u16,
        rows: u16,
        app_handle: AppHandle,
    ) -> Result<CreateSshResponse, SshError> {
        // 세션 ID 생성 또는 사용
        let session_id = session_id.unwrap_or_else(|| Uuid::new_v4().to_string());

        // SSH 세션 생성
        let session = SshSession::new(
            session_id.clone(),
            config.clone(),
            cols,
            rows,
            app_handle,
        )?;

        let response = CreateSshResponse {
            session_id: session_id.clone(),
            host: config.host.clone(),
            username: config.username.clone(),
        };

        // 세션 맵에 추가
        let mut sessions = self.sessions.lock().await;
        sessions.insert(session_id, session);

        Ok(response)
    }

    /// SSH 세션에 데이터 쓰기
    pub async fn write_to_session(&self, session_id: &str, data: &str) -> Result<(), SshError> {
        let sessions = self.sessions.lock().await;
        let session = sessions
            .get(session_id)
            .ok_or_else(|| SshError::SessionNotFound(session_id.to_string()))?;

        session.write(data).await
    }

    /// SSH 세션 크기 조정
    pub async fn resize_session(
        &self,
        session_id: &str,
        cols: u16,
        rows: u16,
    ) -> Result<(), SshError> {
        let sessions = self.sessions.lock().await;
        let session = sessions
            .get(session_id)
            .ok_or_else(|| SshError::SessionNotFound(session_id.to_string()))?;

        session.resize(cols, rows).await
    }

    /// SSH 세션 종료
    pub async fn close_session(&self, session_id: &str) -> Result<(), SshError> {
        let mut sessions = self.sessions.lock().await;
        sessions
            .remove(session_id)
            .ok_or_else(|| SshError::SessionNotFound(session_id.to_string()))?;

        Ok(())
    }

    /// 모든 SSH 세션 ID 목록 반환
    pub async fn list_sessions(&self) -> Vec<String> {
        let sessions = self.sessions.lock().await;
        sessions.keys().cloned().collect()
    }
}

impl Default for SshManager {
    fn default() -> Self {
        Self::new()
    }
}
