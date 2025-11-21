use crate::fs::{
    create_directory, delete_directory, delete_file, get_file_info, get_user_home,
    list_directory, rename_item, FileInfo,
};

/// 사용자 홈 디렉토리 조회 커맨드
#[tauri::command]
pub fn get_user_home_dir() -> Result<String, String> {
    get_user_home().map_err(|e| e.to_string())
}

/// 로컬 디렉토리 목록 조회 커맨드
#[tauri::command]
pub fn list_local_directory(path: String) -> Result<Vec<FileInfo>, String> {
    list_directory(&path).map_err(|e| e.to_string())
}

/// 로컬 파일 정보 조회 커맨드
#[tauri::command]
pub fn get_local_file_stats(path: String) -> Result<FileInfo, String> {
    get_file_info(&path).map_err(|e| e.to_string())
}

/// 로컬 디렉토리 생성 커맨드
#[tauri::command]
pub fn create_local_directory(path: String) -> Result<(), String> {
    create_directory(&path).map_err(|e| e.to_string())
}

/// 로컬 파일 삭제 커맨드
#[tauri::command]
pub fn delete_local_file(path: String) -> Result<(), String> {
    delete_file(&path).map_err(|e| e.to_string())
}

/// 로컬 디렉토리 삭제 커맨드
#[tauri::command]
pub fn delete_local_directory(path: String) -> Result<(), String> {
    delete_directory(&path).map_err(|e| e.to_string())
}

/// 로컬 파일/디렉토리 이름 변경 커맨드
#[tauri::command]
pub fn rename_local_item(old_path: String, new_path: String) -> Result<(), String> {
    rename_item(&old_path, &new_path).map_err(|e| e.to_string())
}
