use super::types::{AuthMethod, SshConfig, SshError, SshExitEvent, SshOutputEvent};
use ssh2::Session;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::thread;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;

/// SSH 채널 작업 명령
enum SshCommand {
    Write(String),
    Resize(u16, u16),
}

/// SSH 세션
pub struct SshSession {
    #[allow(dead_code)]
    session_id: String,
    #[allow(dead_code)]
    config: SshConfig,
    command_tx: mpsc::UnboundedSender<SshCommand>,
}

impl SshSession {
    /// 새 SSH 세션 생성 및 연결
    pub fn new(
        session_id: String,
        config: SshConfig,
        cols: u16,
        rows: u16,
        app_handle: AppHandle,
    ) -> Result<Self, SshError> {
        // TCP 연결 생성
        let tcp = TcpStream::connect(format!("{}:{}", config.host, config.port))
            .map_err(|e| SshError::ConnectionFailed(format!("TCP connection failed: {}", e)))?;

        // SSH 세션 생성 및 핸드셰이크
        let mut session = Session::new()
            .map_err(|e| SshError::SshError(format!("Failed to create session: {}", e)))?;
        session.set_tcp_stream(tcp);
        session
            .handshake()
            .map_err(|e| SshError::ConnectionFailed(format!("SSH handshake failed: {}", e)))?;

        // 인증
        Self::authenticate(&mut session, &config)?;

        // 채널 생성 및 PTY 요청
        let mut channel = session
            .channel_session()
            .map_err(|e| SshError::SshError(format!("Failed to open channel: {}", e)))?;

        channel
            .request_pty("xterm-256color", None, Some((cols as u32, rows as u32, 0, 0)))
            .map_err(|e| SshError::SshError(format!("Failed to request PTY: {}", e)))?;

        channel
            .shell()
            .map_err(|e| SshError::SshError(format!("Failed to start shell: {}", e)))?;

        // mpsc 채널 생성 (쓰기 및 리사이즈 명령 전송용)
        let (command_tx, command_rx) = mpsc::unbounded_channel();

        // 백그라운드 I/O 스레드 시작 (읽기/쓰기 모두 처리)
        Self::start_io_thread(session_id.clone(), session, channel, command_rx, app_handle);

        Ok(Self {
            session_id,
            config,
            command_tx,
        })
    }

    /// SSH 인증 수행
    fn authenticate(session: &mut Session, config: &SshConfig) -> Result<(), SshError> {
        match &config.auth_method {
            AuthMethod::Password { password } => {
                session
                    .userauth_password(&config.username, password)
                    .map_err(|e| {
                        SshError::AuthenticationFailed(format!("Password auth failed: {}", e))
                    })?;
            }
            AuthMethod::PrivateKey { path, passphrase } => {
                session
                    .userauth_pubkey_file(
                        &config.username,
                        None,
                        std::path::Path::new(path),
                        passphrase.as_deref(),
                    )
                    .map_err(|e| {
                        SshError::AuthenticationFailed(format!("Private key auth failed: {}", e))
                    })?;
            }
        }

        if !session.authenticated() {
            return Err(SshError::AuthenticationFailed(
                "Authentication failed".to_string(),
            ));
        }

        Ok(())
    }

    /// 백그라운드 스레드에서 SSH I/O 처리 (읽기/쓰기 통합)
    ///
    /// 동일한 SSH 채널에서 읽기와 쓰기를 모두 처리합니다.
    /// - 읽기: 지속적으로 SSH 출력을 읽어 Tauri 이벤트로 전송
    /// - 쓰기: command_rx를 통해 받은 명령(Write, Resize) 처리
    fn start_io_thread(
        session_id: String,
        session: Session,
        mut channel: ssh2::Channel,
        mut command_rx: mpsc::UnboundedReceiver<SshCommand>,
        app_handle: AppHandle,
    ) {
        thread::spawn(move || {
            // 세션을 논블로킹 모드로 설정 (채널도 자동으로 논블로킹이 됨)
            session.set_blocking(false);
            
            // Session을 유지해야 연결이 유지됨
            let _session = session;

            let mut buffer = [0u8; 4096];

            loop {
                // 1. 쓰기/리사이즈 명령 처리 (non-blocking)
                while let Ok(cmd) = command_rx.try_recv() {
                    match cmd {
                        SshCommand::Write(data) => {
                            if let Err(e) = channel.write_all(data.as_bytes()) {
                                eprintln!("SSH write error: {}", e);
                            }
                            if let Err(e) = channel.flush() {
                                eprintln!("SSH flush error: {}", e);
                            }
                        }
                        SshCommand::Resize(cols, rows) => {
                            if let Err(e) =
                                channel.request_pty_size(cols as u32, rows as u32, None, None)
                            {
                                eprintln!("SSH resize error: {}", e);
                            }
                        }
                    }
                }

                // 2. 읽기 처리
                match channel.read(&mut buffer) {
                    Ok(0) => {
                        // EOF - 연결 종료
                        let _ = app_handle.emit(
                            &format!("ssh://exit/{}", session_id),
                            SshExitEvent {
                                session_id: session_id.clone(),
                                reason: "Connection closed".to_string(),
                            },
                        );
                        break;
                    }
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                        let _ = app_handle.emit(
                            &format!("ssh://output/{}", session_id),
                            SshOutputEvent {
                                session_id: session_id.clone(),
                                data,
                            },
                        );
                    }
                    Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                        // 데이터 없음, 잠시 대기
                        thread::sleep(std::time::Duration::from_millis(10));
                    }
                    Err(e) => {
                        eprintln!("SSH read error: {}", e);
                        let _ = app_handle.emit(
                            &format!("ssh://exit/{}", session_id),
                            SshExitEvent {
                                session_id: session_id.clone(),
                                reason: format!("Read error: {}", e),
                            },
                        );
                        break;
                    }
                }
            }
        });
    }

    /// SSH 세션에 데이터 쓰기
    pub async fn write(&self, data: &str) -> Result<(), SshError> {
        self.command_tx
            .send(SshCommand::Write(data.to_string()))
            .map_err(|_| SshError::WriteFailed("Failed to send write command".to_string()))?;
        Ok(())
    }

    /// SSH PTY 크기 조정
    pub async fn resize(&self, cols: u16, rows: u16) -> Result<(), SshError> {
        self.command_tx
            .send(SshCommand::Resize(cols, rows))
            .map_err(|_| SshError::ResizeFailed("Failed to send resize command".to_string()))?;
        Ok(())
    }
}
