use crate::sftp::FileEntry;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// Get user's home directory path
#[tauri::command]
pub async fn get_local_home_directory() -> Result<String, String> {
    dirs::home_dir()
        .and_then(|p| p.to_str().map(|s| s.to_string()))
        .ok_or_else(|| "Failed to get home directory".to_string())
}

/// List directory contents
#[tauri::command]
pub async fn list_local_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    if !path_buf.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let entries = fs::read_dir(&path_buf)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut file_entries = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(e) => {
                eprintln!("Failed to read metadata for {:?}: {}", path, e);
                continue; // Skip files we can't read metadata for
            }
        };

        let name = entry
            .file_name()
            .to_string_lossy()
            .to_string();

        let path_str = path.to_string_lossy().to_string();
        let is_dir = metadata.is_dir();
        let size = metadata.len();

        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);

        #[cfg(unix)]
        let permissions = {
            use std::os::unix::fs::PermissionsExt;
            format!("{:o}", metadata.permissions().mode() & 0o777)
        };

        #[cfg(not(unix))]
        let permissions = if metadata.permissions().readonly() {
            "r--".to_string()
        } else {
            "rw-".to_string()
        };

        file_entries.push(FileEntry {
            name,
            path: path_str,
            is_dir,
            size,
            modified,
            permissions,
        });
    }

    // Sort: directories first, then by name
    file_entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(file_entries)
}

/// Get file or directory information
#[tauri::command]
pub async fn get_local_file_info(path: String) -> Result<FileEntry, String> {
    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let metadata = fs::metadata(&path_buf)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;

    let name = path_buf
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let path_str = path_buf.to_string_lossy().to_string();
    let is_dir = metadata.is_dir();
    let size = metadata.len();

    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    #[cfg(unix)]
    let permissions = {
        use std::os::unix::fs::PermissionsExt;
        format!("{:o}", metadata.permissions().mode() & 0o777)
    };

    #[cfg(not(unix))]
    let permissions = if metadata.permissions().readonly() {
        "r--".to_string()
    } else {
        "rw-".to_string()
    };

    Ok(FileEntry {
        name,
        path: path_str,
        is_dir,
        size,
        modified,
        permissions,
    })
}

/// Create a new directory
#[tauri::command]
pub async fn create_local_directory(path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);

    if path_buf.exists() {
        return Err(format!("Path already exists: {}", path));
    }

    fs::create_dir_all(&path_buf)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    Ok(())
}

/// Delete a file or directory
#[tauri::command]
pub async fn delete_local_path(path: String, is_dir: bool) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    if is_dir {
        fs::remove_dir_all(&path_buf)
            .map_err(|e| format!("Failed to delete directory: {}", e))?;
    } else {
        fs::remove_file(&path_buf)
            .map_err(|e| format!("Failed to delete file: {}", e))?;
    }

    Ok(())
}

/// Rename or move a file or directory
#[tauri::command]
pub async fn rename_local_path(old_path: String, new_path: String) -> Result<(), String> {
    let old_path_buf = PathBuf::from(&old_path);
    let new_path_buf = PathBuf::from(&new_path);

    if !old_path_buf.exists() {
        return Err(format!("Source path does not exist: {}", old_path));
    }

    if new_path_buf.exists() {
        return Err(format!("Destination path already exists: {}", new_path));
    }

    fs::rename(&old_path_buf, &new_path_buf)
        .map_err(|e| format!("Failed to rename/move: {}", e))?;

    Ok(())
}

/// Check if a path exists
#[tauri::command]
pub async fn local_path_exists(path: String) -> Result<bool, String> {
    let path_buf = PathBuf::from(&path);
    Ok(path_buf.exists())
}
