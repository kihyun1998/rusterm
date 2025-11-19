use tokio::sync::oneshot;
use tokio::io::AsyncBufReadExt;

use crate::ipc::{IpcError, handler, platform};

/// IPC 서버 구조체
pub struct IpcServer {
    shutdown_tx: Option<oneshot::Sender<()>>,
}

impl IpcServer {
    /// IPC 서버 시작 (백그라운드 태스크)
    pub async fn start() -> Result<Self, IpcError> {
        let (shutdown_tx, shutdown_rx) = oneshot::channel();

        // 백그라운드 태스크 생성
        tokio::spawn(async move {
            if let Err(e) = run_server(shutdown_rx).await {
                eprintln!("IPC server error: {}", e);
            }
        });

        Ok(IpcServer {
            shutdown_tx: Some(shutdown_tx),
        })
    }

    /// IPC 서버 종료
    pub fn shutdown(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

impl Drop for IpcServer {
    fn drop(&mut self) {
        self.shutdown();
        platform::cleanup_socket();
    }
}

/// 서버 메인 루프 (Unix)
#[cfg(unix)]
async fn run_server(mut shutdown_rx: oneshot::Receiver<()>) -> Result<(), IpcError> {
    let listener = platform::create_listener().await?;

    loop {
        tokio::select! {
            // 종료 신호 대기
            _ = &mut shutdown_rx => {
                println!("IPC server shutting down...");
                break;
            }
            // 연결 수락
            result = platform::accept_connection(&listener) => {
                match result {
                    Ok(stream) => {
                        tokio::spawn(handle_connection_unix(stream));
                    }
                    Err(e) => {
                        eprintln!("Failed to accept connection: {}", e);
                    }
                }
            }
        }
    }

    platform::cleanup_socket();
    Ok(())
}

/// 서버 메인 루프 (Windows)
#[cfg(windows)]
async fn run_server(mut shutdown_rx: oneshot::Receiver<()>) -> Result<(), IpcError> {
    use std::sync::Arc;
    use interprocess::TryClone;

    let listener = platform::create_listener().await?;
    let listener = Arc::new(listener);

    loop {
        tokio::select! {
            // 종료 신호 대기
            _ = &mut shutdown_rx => {
                println!("IPC server shutting down...");
                break;
            }
            // 연결 수락 (blocking이므로 spawn_blocking 필요)
            result = tokio::task::spawn_blocking({
                let listener_ref = Arc::clone(&listener);
                move || platform::accept_connection(&listener_ref)
            }) => {
                match result {
                    Ok(Ok(stream)) => {
                        tokio::task::spawn_blocking(move || {
                            handle_connection_windows(stream);
                        });
                    }
                    Ok(Err(e)) => {
                        eprintln!("Failed to accept connection: {}", e);
                    }
                    Err(e) => {
                        eprintln!("Task join error: {}", e);
                    }
                }
            }
        }
    }

    platform::cleanup_socket();
    Ok(())
}

/// Unix 연결 처리 (async)
#[cfg(unix)]
async fn handle_connection_unix(stream: tokio::net::UnixStream) {
    use tokio::io::{AsyncWriteExt, BufReader};

    let (reader, mut writer) = stream.into_split();
    let mut reader = BufReader::new(reader);
    let mut line = String::new();

    loop {
        line.clear();

        match reader.read_line(&mut line).await {
            Ok(0) => break, // EOF
            Ok(_) => {
                let response = process_request(&line).await;
                let response_json = serde_json::to_string(&response).unwrap() + "\n";

                if let Err(e) = writer.write_all(response_json.as_bytes()).await {
                    eprintln!("Failed to write response: {}", e);
                    break;
                }
            }
            Err(e) => {
                eprintln!("Failed to read from connection: {}", e);
                break;
            }
        }
    }
}

/// Windows 연결 처리 (blocking)
#[cfg(windows)]
fn handle_connection_windows(stream: interprocess::local_socket::prelude::LocalSocketStream) {
    use std::io::{BufRead, BufReader, Write};
    use interprocess::TryClone;

    let mut reader = BufReader::new(stream.try_clone().unwrap());
    let mut writer = stream;
    let mut line = String::new();

    loop {
        line.clear();

        match reader.read_line(&mut line) {
            Ok(0) => break, // EOF
            Ok(_) => {
                // blocking 환경에서 async 실행
                let runtime = tokio::runtime::Runtime::new().unwrap();
                let response = runtime.block_on(process_request(&line));
                let response_json = serde_json::to_string(&response).unwrap() + "\n";

                if let Err(e) = writer.write_all(response_json.as_bytes()) {
                    eprintln!("Failed to write response: {}", e);
                    break;
                }
            }
            Err(e) => {
                eprintln!("Failed to read from connection: {}", e);
                break;
            }
        }
    }
}

/// 요청 처리 (공통)
async fn process_request(line: &str) -> crate::ipc::IpcResponse {
    use crate::ipc::{IpcRequest, IpcResponse};

    let line = line.trim();
    if line.is_empty() {
        return IpcResponse::error("Empty request");
    }

    match serde_json::from_str::<IpcRequest>(line) {
        Ok(request) => handler::handle_request(request).await,
        Err(e) => IpcResponse::error(format!("Invalid JSON: {}", e)),
    }
}
