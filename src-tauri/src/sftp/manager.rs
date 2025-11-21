use super::session::SftpSession;
use super::types::{CreateSftpResponse, FileEntry, SftpConfig, SftpError};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

/// SFTP 세션 관리자
#[derive(Clone)]
pub struct SftpManager {
    sessions: Arc<Mutex<HashMap<String, SftpSession>>>,
}

impl SftpManager {
    /// 새 SFTP Manager 생성
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// SFTP 세션 생성
    pub async fn create_session(
        &self,
        session_id: String,
        config: SftpConfig,
    ) -> Result<CreateSftpResponse, SftpError> {
        // SFTP 세션 생성 (동기 작업이므로 tokio::task::spawn_blocking 사용)
        let session_id_clone = session_id.clone();
        let config_clone = config.clone();

        let (session, initial_path) = tokio::task::spawn_blocking(move || {
            let session = SftpSession::new(session_id_clone, config_clone)?;
            // Try to get home directory, fallback to "/" if it fails
            let home_path = session.get_home_directory().unwrap_or_else(|e| {
                eprintln!("Failed to get home directory, using '/': {}", e);
                "/".to_string()
            });
            Ok::<_, SftpError>((session, home_path))
        })
        .await
        .map_err(|e| SftpError::ConnectionFailed(format!("Task join error: {}", e)))??;

        let response = CreateSftpResponse {
            session_id: session_id.clone(),
            host: config.host.clone(),
            username: config.username.clone(),
            initial_path,
        };

        // 세션 맵에 추가
        self.sessions.lock().await.insert(session_id, session);

        Ok(response)
    }

    /// 세션 가져오기 (helper)
    async fn get_session(&self, session_id: &str) -> Result<SftpSession, SftpError> {
        // SftpSession이 Clone이 아니므로, 세션을 복제할 수 없습니다.
        // 대신 참조를 사용하거나, Arc로 감싸야 합니다.
        // 여기서는 간단하게 세션을 일시적으로 제거했다가 다시 넣는 방식을 사용합니다.
        let mut sessions = self.sessions.lock().await;
        sessions
            .remove(session_id)
            .ok_or_else(|| SftpError::SessionNotFound(session_id.to_string()))
    }

    /// 세션을 다시 저장 (helper)
    async fn return_session(&self, session_id: String, session: SftpSession) {
        self.sessions.lock().await.insert(session_id, session);
    }

    /// 디렉토리 목록 조회
    pub async fn list_directory(
        &self,
        session_id: &str,
        path: &str,
    ) -> Result<Vec<FileEntry>, SftpError> {
        let session = self.get_session(session_id).await?;
        let path = path.to_string();

        let (result, session) = tokio::task::spawn_blocking(move || {
            let result = session.list_directory(&path);
            (result, session)
        })
            .await
            .map_err(|e| SftpError::FileOperationFailed(format!("Task join error: {}", e)))?;

        self.return_session(session_id.to_string(), session).await;

        Ok(result?)
    }

    /// 파일 업로드
    pub async fn upload_file(
        &self,
        session_id: &str,
        local_path: &str,
        remote_path: &str,
    ) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        let local_path = local_path.to_string();
        let remote_path = remote_path.to_string();

        let (result, session) = tokio::task::spawn_blocking(move || {
            let result = session.upload_file(&local_path, &remote_path);
            (result, session)
        })
            .await
            .map_err(|e| SftpError::FileOperationFailed(format!("Task join error: {}", e)))?;

        self.return_session(session_id.to_string(), session).await;

        Ok(result?)
    }

    /// 파일 다운로드
    pub async fn download_file(
        &self,
        session_id: &str,
        remote_path: &str,
        local_path: &str,
    ) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        let remote_path = remote_path.to_string();
        let local_path = local_path.to_string();

        let (result, session) = tokio::task::spawn_blocking(move || {
            let result = session.download_file(&remote_path, &local_path);
            (result, session)
        })
            .await
            .map_err(|e| SftpError::FileOperationFailed(format!("Task join error: {}", e)))?;

        self.return_session(session_id.to_string(), session).await;

        Ok(result?)
    }

    /// 디렉토리 생성
    pub async fn create_directory(
        &self,
        session_id: &str,
        path: &str,
    ) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        let path = path.to_string();

        let (result, session) = tokio::task::spawn_blocking(move || {
            let result = session.create_directory(&path);
            (result, session)
        })
            .await
            .map_err(|e| SftpError::FileOperationFailed(format!("Task join error: {}", e)))?;

        self.return_session(session_id.to_string(), session).await;

        Ok(result?)
    }

    /// 파일/디렉토리 삭제
    pub async fn delete_path(
        &self,
        session_id: &str,
        path: &str,
        is_dir: bool,
    ) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        let path = path.to_string();

        let (result, session) = tokio::task::spawn_blocking(move || {
            let result = session.delete_path(&path, is_dir);
            (result, session)
        })
            .await
            .map_err(|e| SftpError::FileOperationFailed(format!("Task join error: {}", e)))?;

        self.return_session(session_id.to_string(), session).await;

        Ok(result?)
    }

    /// 파일/디렉토리 이름 변경
    pub async fn rename_path(
        &self,
        session_id: &str,
        old_path: &str,
        new_path: &str,
    ) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        let old_path = old_path.to_string();
        let new_path = new_path.to_string();

        let (result, session) = tokio::task::spawn_blocking(move || {
            let result = session.rename_path(&old_path, &new_path);
            (result, session)
        })
            .await
            .map_err(|e| SftpError::FileOperationFailed(format!("Task join error: {}", e)))?;

        self.return_session(session_id.to_string(), session).await;

        Ok(result?)
    }

    /// 세션 종료
    pub async fn close_session(&self, session_id: &str) -> Result<(), SftpError> {
        self.sessions
            .lock()
            .await
            .remove(session_id)
            .ok_or_else(|| SftpError::SessionNotFound(session_id.to_string()))?;

        Ok(())
    }

    /// 모든 SFTP 세션 ID 목록 반환
    pub async fn list_sessions(&self) -> Vec<String> {
        self.sessions.lock().await.keys().cloned().collect()
    }
}

impl Default for SftpManager {
    fn default() -> Self {
        Self::new()
    }
}
