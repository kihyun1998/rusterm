use crate::pty::{CreatePtyResponse, PtyManager};
use std::collections::HashMap;
use tauri::{AppHandle, State};

/// PTY 세션 생성 커맨드
#[tauri::command]
pub async fn create_pty(
    state: State<'_, PtyManager>,
    app_handle: AppHandle,
    shell: Option<String>,
    args: Option<Vec<String>>,
    cwd: Option<String>,
    env: Option<HashMap<String, String>>,
    cols: u16,
    rows: u16,
) -> Result<CreatePtyResponse, String> {
    state
        .create_session(shell, args, cwd, env, cols, rows, app_handle)
        .await
        .map_err(|e| e.to_string())
}

/// PTY에 데이터 쓰기 커맨드
#[tauri::command]
pub async fn write_to_pty(
    state: State<'_, PtyManager>,
    pty_id: String,
    data: String,
) -> Result<(), String> {
    state
        .write_to_session(&pty_id, &data)
        .await
        .map_err(|e| e.to_string())
}

/// PTY 크기 조정 커맨드
#[tauri::command]
pub async fn resize_pty(
    state: State<'_, PtyManager>,
    pty_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    state
        .resize_session(&pty_id, cols, rows)
        .await
        .map_err(|e| e.to_string())
}

/// PTY 세션 종료 커맨드
#[tauri::command]
pub async fn close_pty(state: State<'_, PtyManager>, pty_id: String) -> Result<(), String> {
    state
        .close_session(&pty_id)
        .await
        .map_err(|e| e.to_string())
}
