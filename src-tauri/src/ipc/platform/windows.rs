use tokio::net::windows::named_pipe::{NamedPipeServer, ServerOptions};
use crate::ipc::IpcError;

/// Named Pipe 이름 생성
pub fn get_pipe_name() -> String {
    let username = std::env::var("USERNAME").unwrap_or_else(|_| "default".to_string());
    format!("rusterm-{}", username)
}

/// Named Pipe 전체 경로 생성
pub fn get_pipe_path() -> String {
    let pipe_name = get_pipe_name();
    format!(r"\\.\pipe\{}", pipe_name)
}

/// Named Pipe 서버 생성
pub async fn create_listener() -> Result<NamedPipeServer, IpcError> {
    let pipe_path = get_pipe_path();

    let server = ServerOptions::new()
        .first_pipe_instance(true)
        .create(&pipe_path)
        .map_err(|e| {
            IpcError::BindFailed(format!("Failed to create pipe '{}': {}", pipe_path, e))
        })?;

    println!("IPC server listening on: {}", pipe_path);

    Ok(server)
}

/// 연결 수락 (async)
pub async fn accept_connection(
    server: &mut NamedPipeServer,
) -> Result<(), IpcError> {
    server
        .connect()
        .await
        .map_err(|e| IpcError::AcceptFailed(e.to_string()))?;

    Ok(())
}

/// 다음 클라이언트를 위한 새 파이프 인스턴스 생성
pub async fn create_next_instance() -> Result<NamedPipeServer, IpcError> {
    let pipe_path = get_pipe_path();

    let server = ServerOptions::new()
        .create(&pipe_path)
        .map_err(|e| {
            IpcError::BindFailed(format!("Failed to create next pipe instance: {}", e))
        })?;

    Ok(server)
}

/// Cleanup (Windows는 프로세스 종료 시 자동 정리)
pub fn cleanup_socket() {
    // Windows Named Pipe는 OS가 자동으로 정리
    println!("Named Pipe will be cleaned up by OS");
}
