use super::types::{AuthMethod, SshConfig, SshError, SshExitEvent, SshOutputEvent};
use ssh2::Session;
use std::io::Read;
use std::net::TcpStream;
use std::sync::Arc;
use std::thread;
use tauri::AppHandle;
use tokio::sync::Mutex;

/// SSH 세션
pub struct SshSession {
    #[allow(dead_code)]
    session_id: String,
    #[allow(dead_code)]
    config: SshConfig,
    writer: Arc<Mutex<ssh2::Channel>>,
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

        let writer = Arc::new(Mutex::new(channel));

        // 백그라운드 읽기 스레드 시작
        Self::start_read_thread(session_id.clone(), session, writer.clone(), app_handle);

        Ok(Self {
            session_id,
            config,
            writer,
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

    /// 백그라운드 스레드에서 SSH 출력 읽기
    ///
    /// TODO (Phase 3): 현재 구현은 불완전합니다.
    /// - 읽기와 쓰기를 위해 동일한 채널을 공유해야 함
    /// - 현재는 새로운 채널을 생성하고 있어 실제로 작동하지 않음
    /// - Arc<Mutex<Channel>>을 사용하거나 채널 복제 방법 개선 필요
    #[allow(unused_variables)]
    fn start_read_thread(
        session_id: String,
        mut session: Session,
        writer: Arc<Mutex<ssh2::Channel>>,
        app_handle: AppHandle,
    ) {
        thread::spawn(move || {
            // TODO: Phase 3에서 올바른 채널 공유 방식으로 수정
            let mut channel = match session.channel_session() {
                Ok(ch) => ch,
                Err(e) => {
                    eprintln!("Failed to create read channel: {}", e);
                    return;
                }
            };

            let mut buffer = [0u8; 4096];
            loop {
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
        use std::io::Write;

        let mut channel = self.writer.lock().await;
        channel
            .write_all(data.as_bytes())
            .map_err(|e| SshError::WriteFailed(format!("Write failed: {}", e)))?;
        channel
            .flush()
            .map_err(|e| SshError::WriteFailed(format!("Flush failed: {}", e)))?;

        Ok(())
    }

    /// SSH PTY 크기 조정
    pub async fn resize(&self, cols: u16, rows: u16) -> Result<(), SshError> {
        let channel = self.writer.lock().await;
        channel
            .request_pty_size(cols as u32, rows as u32, None, None)
            .map_err(|e| SshError::ResizeFailed(format!("Resize failed: {}", e)))?;

        Ok(())
    }
}
