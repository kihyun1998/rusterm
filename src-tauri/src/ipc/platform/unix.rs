use std::path::PathBuf;
use tokio::net::{UnixListener, UnixStream};
use std::os::unix::fs::PermissionsExt;

use crate::ipc::IpcError;

/// Unix Socket 경로 생성
pub fn get_socket_path() -> PathBuf {
    let uid = unsafe { libc::getuid() };
    PathBuf::from(format!("/tmp/rusterm-{}.sock", uid))
}

/// Unix Socket 리스너 생성
pub async fn create_listener() -> Result<UnixListener, IpcError> {
    let socket_path = get_socket_path();

    // 기존 socket 파일 확인 및 제거
    if socket_path.exists() {
        // TODO: 향후 프로세스 존재 여부 확인 로직 추가
        std::fs::remove_file(&socket_path).map_err(|e| {
            IpcError::BindFailed(format!("Failed to remove existing socket: {}", e))
        })?;
    }

    // Unix socket 생성
    let listener = UnixListener::bind(&socket_path).map_err(|e| {
        IpcError::BindFailed(format!("Failed to bind to {}: {}", socket_path.display(), e))
    })?;

    // 권한 설정: 0600 (소유자만 읽기/쓰기)
    let metadata = std::fs::metadata(&socket_path).map_err(|e| {
        IpcError::BindFailed(format!("Failed to get socket metadata: {}", e))
    })?;

    let mut perms = metadata.permissions();
    perms.set_mode(0o600);
    std::fs::set_permissions(&socket_path, perms).map_err(|e| {
        IpcError::BindFailed(format!("Failed to set socket permissions: {}", e))
    })?;

    println!("IPC server listening on: {}", socket_path.display());

    Ok(listener)
}

/// 연결 수락
pub async fn accept_connection(listener: &UnixListener) -> Result<UnixStream, IpcError> {
    let (stream, _addr) = listener
        .accept()
        .await
        .map_err(|e| IpcError::AcceptFailed(e.to_string()))?;

    Ok(stream)
}

/// Socket 파일 정리
pub fn cleanup_socket() {
    let socket_path = get_socket_path();
    if socket_path.exists() {
        let _ = std::fs::remove_file(&socket_path);
        println!("Cleaned up socket file: {}", socket_path.display());
    }
}
