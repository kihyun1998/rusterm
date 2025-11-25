use crate::sftp::{CreateSftpResponse, FileInfo, SftpConfig, SftpManager};
use tauri::State;

/// SFTP 세션 생성 커맨드
#[tauri::command]
pub async fn create_sftp_session(
    state: State<'_, SftpManager>,
    config: SftpConfig,
) -> Result<CreateSftpResponse, String> {
    state
        .create_session(config)
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

/// 원격 홈 디렉토리 조회 커맨드
#[tauri::command]
pub async fn get_remote_home_dir(
    state: State<'_, SftpManager>,
    session_id: String,
) -> Result<String, String> {
    state
        .get_remote_home(&session_id)
        .await
        .map_err(|e| e.to_string())
}

/// 원격 디렉토리 목록 조회 커맨드
#[tauri::command]
pub async fn list_remote_directory(
    state: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<Vec<FileInfo>, String> {
    state
        .list_directory(&session_id, &path)
        .await
        .map_err(|e| e.to_string())
}

/// 원격 디렉토리 생성 커맨드
#[tauri::command]
pub async fn create_remote_directory(
    state: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<(), String> {
    state
        .create_directory(&session_id, &path)
        .await
        .map_err(|e| e.to_string())
}

/// 원격 파일 삭제 커맨드
#[tauri::command]
pub async fn delete_remote_file(
    state: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<(), String> {
    state
        .delete_file(&session_id, &path)
        .await
        .map_err(|e| e.to_string())
}

/// 원격 디렉토리 삭제 커맨드
#[tauri::command]
pub async fn delete_remote_directory(
    state: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<(), String> {
    state
        .delete_directory(&session_id, &path)
        .await
        .map_err(|e| e.to_string())
}

/// 원격 파일/디렉토리 이름 변경 커맨드
#[tauri::command]
pub async fn rename_remote_item(
    state: State<'_, SftpManager>,
    session_id: String,
    old_path: String,
    new_path: String,
) -> Result<(), String> {
    state
        .rename_item(&session_id, &old_path, &new_path)
        .await
        .map_err(|e| e.to_string())
}

/// 파일 다운로드 커맨드
#[tauri::command]
pub async fn download_file(
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

/// 파일 업로드 커맨드
#[tauri::command]
pub async fn upload_file(
    state: State<'_, SftpManager>,
    app: tauri::AppHandle,
    session_id: String,
    local_path: String,
    remote_path: String,
    transfer_id: String,
) -> Result<(), String> {
    state
        .upload_file(&session_id, &local_path, &remote_path, &transfer_id, app)
        .await
        .map_err(|e| e.to_string())
}

/// 원격 파일 정보 조회 커맨드
#[tauri::command]
pub async fn get_remote_file_stats(
    state: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<FileInfo, String> {
    state
        .get_file_info(&session_id, &path)
        .await
        .map_err(|e| e.to_string())
}
