use tokio::sync::oneshot;
use tokio::io::AsyncBufReadExt;
use tauri::AppHandle;

use crate::ipc::{IpcError, handler, platform};

/// IPC 서버 구조체
pub struct IpcServer {
    shutdown_tx: Option<oneshot::Sender<()>>,
}

impl IpcServer {
    /// IPC 서버 시작 (백그라운드 태스크)
    pub async fn start(app_handle: AppHandle) -> Result<Self, IpcError> {
        let (shutdown_tx, shutdown_rx) = oneshot::channel();

        // 백그라운드 태스크 생성
        tokio::spawn(async move {
            if let Err(e) = run_server(shutdown_rx, app_handle).await {
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
async fn run_server(mut shutdown_rx: oneshot::Receiver<()>, app_handle: AppHandle) -> Result<(), IpcError> {
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
                        let app = app_handle.clone();
                        tokio::spawn(async move {
                            handle_connection_unix(stream, app).await;
                        });
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
async fn run_server(mut shutdown_rx: oneshot::Receiver<()>, app_handle: AppHandle) -> Result<(), IpcError> {
    println!("[DEBUG] run_server started (Windows)");
    let mut server = platform::create_listener().await?;

    println!("[DEBUG] Entering accept loop...");
    loop {
        println!("[DEBUG] Waiting for connection...");
        tokio::select! {
            // 종료 신호 대기
            _ = &mut shutdown_rx => {
                println!("IPC server shutting down...");
                break;
            }
            // 연결 수락 (이제 async!)
            result = platform::accept_connection(&mut server) => {
                match result {
                    Ok(_) => {
                        println!("[DEBUG] Connection accepted! Spawning handler...");

                        // 현재 server를 핸들러로 넘기고, 다음 클라이언트를 위한 새 인스턴스 생성
                        let current_server = server;
                        let app = app_handle.clone();

                        tokio::spawn(async move {
                            handle_connection_windows(current_server, app).await;
                        });

                        // 다음 클라이언트를 위한 새 파이프 인스턴스 생성
                        match platform::create_next_instance().await {
                            Ok(new_server) => {
                                server = new_server;
                                println!("[DEBUG] New pipe instance created for next client");
                            }
                            Err(e) => {
                                eprintln!("Failed to create next pipe instance: {}", e);
                                break;
                            }
                        }
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

/// Unix 연결 처리 (async)
#[cfg(unix)]
async fn handle_connection_unix(stream: tokio::net::UnixStream, app_handle: AppHandle) {
    use tokio::io::{AsyncWriteExt, BufReader};

    let (reader, mut writer) = stream.into_split();
    let mut reader = BufReader::new(reader);
    let mut line = String::new();

    loop {
        line.clear();

        match reader.read_line(&mut line).await {
            Ok(0) => break, // EOF
            Ok(_) => {
                let response = process_request(&line, &app_handle).await;
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

/// Windows 연결 처리 (async)
#[cfg(windows)]
async fn handle_connection_windows(server: tokio::net::windows::named_pipe::NamedPipeServer, app_handle: AppHandle) {
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

    let mut reader = BufReader::new(server);
    let mut line = String::new();

    loop {
        line.clear();

        match reader.read_line(&mut line).await {
            Ok(0) => break, // EOF
            Ok(_) => {
                let response = process_request(&line, &app_handle).await;
                let response_json = serde_json::to_string(&response).unwrap() + "\n";

                if let Err(e) = reader.get_mut().write_all(response_json.as_bytes()).await {
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
async fn process_request(line: &str, app_handle: &AppHandle) -> crate::ipc::IpcResponse {
    use crate::ipc::{IpcRequest, IpcResponse};

    let line = line.trim();
    if line.is_empty() {
        return IpcResponse::error("Empty request");
    }

    match serde_json::from_str::<IpcRequest>(line) {
        Ok(request) => handler::handle_request(request, app_handle).await,
        Err(e) => IpcResponse::error(format!("Invalid JSON: {}", e)),
    }
}
