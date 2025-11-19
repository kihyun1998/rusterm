use interprocess::local_socket::{
    LocalSocketListener, LocalSocketStream, NameTypeSupport,
};

use crate::ipc::IpcError;

/// Named Pipe 이름 생성
pub fn get_pipe_name() -> String {
    let username = std::env::var("USERNAME").unwrap_or_else(|_| "default".to_string());
    format!("rusterm-{}", username)
}

/// Named Pipe 리스너 생성
pub async fn create_listener() -> Result<LocalSocketListener, IpcError> {
    let pipe_name = get_pipe_name();

    // Windows에서는 '@'로 시작하면 Named Pipe
    let name = format!("@{}", pipe_name);

    let listener = match LocalSocketListener::bind(&name) {
        Ok(l) => l,
        Err(e) => {
            return Err(IpcError::BindFailed(format!(
                "Failed to bind to pipe '{}': {}",
                pipe_name, e
            )));
        }
    };

    println!("IPC server listening on: \\\\.\\pipe\\{}", pipe_name);

    Ok(listener)
}

/// 연결 수락 (blocking)
pub fn accept_connection(
    listener: &LocalSocketListener,
) -> Result<LocalSocketStream, IpcError> {
    let stream = listener
        .accept()
        .map_err(|e| IpcError::AcceptFailed(e.to_string()))?;

    Ok(stream)
}

/// Cleanup (Windows는 프로세스 종료 시 자동 정리)
pub fn cleanup_socket() {
    // Windows Named Pipe는 OS가 자동으로 정리
    println!("Named Pipe will be cleaned up by OS");
}
