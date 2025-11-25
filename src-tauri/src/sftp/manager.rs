use super::session::SftpSession;
use super::types::{CreateSftpResponse, FileInfo, SftpConfig, SftpError};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

/// SFTP 세션 관리자
#[derive(Clone)]
pub struct SftpManager {
    sessions: Arc<Mutex<HashMap<String, SftpSession>>>,
}

impl SftpManager {
    /// 새 SFTP Manager 생성
    pub fn new() -> Self {
        SftpManager {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// SFTP 세션 생성
    pub async fn create_session(
        &self,
        config: SftpConfig,
    ) -> Result<CreateSftpResponse, SftpError> {
        let session_id = Uuid::new_v4().to_string();

        // SFTP 세션 생성 (blocking)
        let session = tokio::task::spawn_blocking({
            let session_id = session_id.clone();
            let config = config.clone();
            move || SftpSession::new(session_id, config)
        })
        .await
        .map_err(|e| SftpError::ConnectionFailed(format!("Task join error: {}", e)))??;

        let response = CreateSftpResponse {
            session_id: session_id.clone(),
            host: config.host.clone(),
            username: config.username.clone(),
        };

        // 세션 맵에 추가
        let mut sessions = self.sessions.lock().await;
        sessions.insert(session_id, session);

        Ok(response)
    }

    /// SFTP 세션 종료
    pub async fn close_session(&self, session_id: &str) -> Result<(), SftpError> {
        let mut sessions = self.sessions.lock().await;
        sessions
            .remove(session_id)
            .ok_or_else(|| SftpError::SessionNotFound(session_id.to_string()))?;

        Ok(())
    }

    /// 세션 조회 (내부용)
    async fn get_session(&self, session_id: &str) -> Result<SftpSession, SftpError> {
        let sessions = self.sessions.lock().await;
        sessions
            .get(session_id)
            .cloned()
            .ok_or_else(|| SftpError::SessionNotFound(session_id.to_string()))
    }

    /// 원격 홈 디렉토리 조회
    pub async fn get_remote_home(&self, session_id: &str) -> Result<String, SftpError> {
        let session = self.get_session(session_id).await?;
        tokio::task::spawn_blocking(move || session.get_remote_home())
            .await
            .map_err(|e| SftpError::SshError(format!("Task join error: {}", e)))?
    }

    /// 디렉토리 목록 조회
    pub async fn list_directory(
        &self,
        session_id: &str,
        path: &str,
    ) -> Result<Vec<FileInfo>, SftpError> {
        let session = self.get_session(session_id).await?;
        let path = path.to_string();
        tokio::task::spawn_blocking(move || session.list_directory(&path))
            .await
            .map_err(|e| SftpError::ReadDirFailed(format!("Task join error: {}", e)))?
    }

    /// 디렉토리 생성
    pub async fn create_directory(
        &self,
        session_id: &str,
        path: &str,
    ) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        let path = path.to_string();
        tokio::task::spawn_blocking(move || session.create_directory(&path))
            .await
            .map_err(|e| SftpError::CreateDirFailed(format!("Task join error: {}", e)))?
    }

    /// 파일 삭제
    pub async fn delete_file(&self, session_id: &str, path: &str) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        let path = path.to_string();
        tokio::task::spawn_blocking(move || session.delete_file(&path))
            .await
            .map_err(|e| SftpError::DeleteFileFailed(format!("Task join error: {}", e)))?
    }

    /// 디렉토리 삭제
    pub async fn delete_directory(
        &self,
        session_id: &str,
        path: &str,
    ) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        let path = path.to_string();
        tokio::task::spawn_blocking(move || session.delete_directory(&path))
            .await
            .map_err(|e| SftpError::DeleteDirFailed(format!("Task join error: {}", e)))?
    }

    /// 이름 변경
    pub async fn rename_item(
        &self,
        session_id: &str,
        old_path: &str,
        new_path: &str,
    ) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        let old_path = old_path.to_string();
        let new_path = new_path.to_string();
        tokio::task::spawn_blocking(move || session.rename_item(&old_path, &new_path))
            .await
            .map_err(|e| SftpError::RenameFailed(format!("Task join error: {}", e)))?
    }

    /// 파일 업로드
    pub async fn upload_file(
        &self,
        session_id: &str,
        local_path: &str,
        remote_path: &str,
        transfer_id: &str,
        app_handle: tauri::AppHandle,
    ) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        let local_path = local_path.to_string();
        let remote_path = remote_path.to_string();
        let transfer_id = transfer_id.to_string();

        tokio::task::spawn_blocking(move || {
            session.upload_file(&local_path, &remote_path, &transfer_id, &app_handle)
        })
        .await
        .map_err(|e| SftpError::UploadFailed(format!("Task join error: {}", e)))?
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
        tokio::task::spawn_blocking(move || session.download_file(&remote_path, &local_path))
            .await
            .map_err(|e| SftpError::DownloadFailed(format!("Task join error: {}", e)))?
    }

    /// 파일 정보 조회
    pub async fn get_file_info(
        &self,
        session_id: &str,
        path: &str,
    ) -> Result<FileInfo, SftpError> {
        let session = self.get_session(session_id).await?;
        let path = path.to_string();
        tokio::task::spawn_blocking(move || session.get_file_info(&path))
            .await
            .map_err(|e| SftpError::PathNotFound(format!("Task join error: {}", e)))?
    }
}
