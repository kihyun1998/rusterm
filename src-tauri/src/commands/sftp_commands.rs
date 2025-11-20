use crate::sftp::{CreateSftpResponse, FileEntry, SftpConfig, SftpManager};
use tauri::State;

/// SFTP 세션 생성 커맨드
#[tauri::command]
pub async fn create_sftp_session(
    state: State<'_, SftpManager>,
    config: SftpConfig,
    session_id: String,
) -> Result<CreateSftpResponse, String> {
    state
        .create_session(session_id, config)
        .await
        .map_err(|e| e.to_string())
}

/// 디렉토리 목록 조회 커맨드
#[tauri::command]
pub async fn sftp_list_directory(
    state: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<Vec<FileEntry>, String> {
    state
        .list_directory(&session_id, &path)
        .await
        .map_err(|e| e.to_string())
}

/// 파일 업로드 커맨드
#[tauri::command]
pub async fn sftp_upload_file(
    state: State<'_, SftpManager>,
    session_id: String,
    local_path: String,
    remote_path: String,
) -> Result<(), String> {
    state
        .upload_file(&session_id, &local_path, &remote_path)
        .await
        .map_err(|e| e.to_string())
}

/// 파일 다운로드 커맨드
#[tauri::command]
pub async fn sftp_download_file(
    state: State<'_, SftpManager>,
    session_id: String,
    remote_path: String,
    local_path: String,
) -> Result<(), String> {
    state
        .download_file(&session_id, &remote_path, &local_path)
        .await
        .map_err(|e| e.to_string())
}

/// 디렉토리 생성 커맨드
#[tauri::command]
pub async fn sftp_create_directory(
    state: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<(), String> {
    state
        .create_directory(&session_id, &path)
        .await
        .map_err(|e| e.to_string())
}

/// 파일/디렉토리 삭제 커맨드
#[tauri::command]
pub async fn sftp_delete_path(
    state: State<'_, SftpManager>,
    session_id: String,
    path: String,
    is_dir: bool,
) -> Result<(), String> {
    state
        .delete_path(&session_id, &path, is_dir)
        .await
        .map_err(|e| e.to_string())
}

/// 파일/디렉토리 이름 변경 커맨드
#[tauri::command]
pub async fn sftp_rename_path(
    state: State<'_, SftpManager>,
    session_id: String,
    old_path: String,
    new_path: String,
) -> Result<(), String> {
    state
        .rename_path(&session_id, &old_path, &new_path)
        .await
        .map_err(|e| e.to_string())
}

/// SFTP 세션 종료 커맨드
#[tauri::command]
pub async fn close_sftp_session(
    state: State<'_, SftpManager>,
    session_id: String,
) -> Result<(), String> {
    state
        .close_session(&session_id)
        .await
        .map_err(|e| e.to_string())
}
