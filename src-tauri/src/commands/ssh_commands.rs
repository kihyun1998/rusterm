use crate::ssh::{CreateSshResponse, SshConfig, SshManager};
use tauri::{AppHandle, State};

/// SSH 세션 생성 커맨드
#[tauri::command]
pub async fn create_ssh_session(
    state: State<'_, SshManager>,
    app_handle: AppHandle,
    config: SshConfig,
    cols: u16,
    rows: u16,
) -> Result<CreateSshResponse, String> {
    state
        .create_session(config, cols, rows, app_handle)
        .await
        .map_err(|e| e.to_string())
}

/// SSH 세션에 데이터 쓰기 커맨드
#[tauri::command]
pub async fn write_to_ssh(
    state: State<'_, SshManager>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    state
        .write_to_session(&session_id, &data)
        .await
        .map_err(|e| e.to_string())
}

/// SSH 세션 크기 조정 커맨드
#[tauri::command]
pub async fn resize_ssh_session(
    state: State<'_, SshManager>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    state
        .resize_session(&session_id, cols, rows)
        .await
        .map_err(|e| e.to_string())
}

/// SSH 세션 종료 커맨드
#[tauri::command]
pub async fn close_ssh_session(
    state: State<'_, SshManager>,
    session_id: String,
) -> Result<(), String> {
    state
        .close_session(&session_id)
        .await
        .map_err(|e| e.to_string())
}
