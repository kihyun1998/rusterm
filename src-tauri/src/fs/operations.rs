use super::types::{FileInfo, FsError};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// 사용자 홈 디렉토리 조회
pub fn get_user_home() -> Result<String, FsError> {
    dirs::home_dir()
        .and_then(|p| p.to_str().map(|s| s.to_string()))
        .ok_or_else(|| FsError::PathNotFound("Home directory not found".to_string()))
}

/// 디렉토리 목록 조회
pub fn list_directory(path: &str) -> Result<Vec<FileInfo>, FsError> {
    let path_buf = PathBuf::from(path);

    if !path_buf.exists() {
        return Err(FsError::PathNotFound(path.to_string()));
    }

    if !path_buf.is_dir() {
        return Err(FsError::ReadDirFailed(format!(
            "{} is not a directory",
            path
        )));
    }

    let entries = fs::read_dir(&path_buf)
        .map_err(|e| FsError::ReadDirFailed(format!("{}: {}", path, e)))?;

    let mut files = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| FsError::ReadDirFailed(e.to_string()))?;
        let metadata = entry
            .metadata()
            .map_err(|e| FsError::ReadDirFailed(e.to_string()))?;

        let name = entry.file_name().to_string_lossy().to_string();
        let full_path = entry.path().to_string_lossy().to_string();
        let is_directory = metadata.is_dir();
        let size = if is_directory { 0 } else { metadata.len() };

        let modified = metadata
            .modified()
            .unwrap_or(SystemTime::UNIX_EPOCH)
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        // Unix 권한 (선택 사항)
        #[cfg(unix)]
        let permissions = {
            use std::os::unix::fs::PermissionsExt;
            Some(format!("{:o}", metadata.permissions().mode() & 0o777))
        };

        #[cfg(not(unix))]
        let permissions = None;

        files.push(FileInfo {
            name,
            path: full_path,
            is_directory,
            size,
            modified,
            permissions,
        });
    }

    // 폴더 먼저, 그 다음 파일 (알파벳 순)
    files.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(files)
}

/// 파일 정보 조회
pub fn get_file_info(path: &str) -> Result<FileInfo, FsError> {
    let path_buf = Path::new(path);

    if !path_buf.exists() {
        return Err(FsError::PathNotFound(path.to_string()));
    }

    let metadata =
        fs::metadata(path_buf).map_err(|e| FsError::ReadDirFailed(e.to_string()))?;

    let name = path_buf
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let is_directory = metadata.is_dir();
    let size = if is_directory { 0 } else { metadata.len() };

    let modified = metadata
        .modified()
        .unwrap_or(SystemTime::UNIX_EPOCH)
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    #[cfg(unix)]
    let permissions = {
        use std::os::unix::fs::PermissionsExt;
        Some(format!("{:o}", metadata.permissions().mode() & 0o777))
    };

    #[cfg(not(unix))]
    let permissions = None;

    Ok(FileInfo {
        name,
        path: path.to_string(),
        is_directory,
        size,
        modified,
        permissions,
    })
}

/// 디렉토리 생성
pub fn create_directory(path: &str) -> Result<(), FsError> {
    fs::create_dir_all(path)
        .map_err(|e| FsError::CreateDirFailed(format!("{}: {}", path, e)))
}

/// 파일 삭제
pub fn delete_file(path: &str) -> Result<(), FsError> {
    fs::remove_file(path).map_err(|e| FsError::DeleteFileFailed(format!("{}: {}", path, e)))
}

/// 디렉토리 삭제 (재귀)
pub fn delete_directory(path: &str) -> Result<(), FsError> {
    fs::remove_dir_all(path)
        .map_err(|e| FsError::DeleteDirFailed(format!("{}: {}", path, e)))
}

/// 파일/디렉토리 이름 변경
pub fn rename_item(old_path: &str, new_path: &str) -> Result<(), FsError> {
    fs::rename(old_path, new_path).map_err(|e| {
        FsError::RenameFailed(format!("{} -> {}: {}", old_path, new_path, e))
    })
}
