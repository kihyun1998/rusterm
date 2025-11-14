use super::types::{PtyError, PtyExitEvent, PtyOutputEvent};
use portable_pty::{Child, CommandBuilder, MasterPty, PtySize};
use std::io::{Read, Write};
use std::sync::Arc;
use std::thread;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

/// 개별 PTY 세션
pub struct PtySession {
    #[allow(dead_code)]
    pub pty_id: String,
    pub pid: u32,
    pub shell: String,
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    #[allow(dead_code)]
    child: Arc<Mutex<Box<dyn Child + Send>>>,
}

impl PtySession {
    /// 새 PTY 세션 생성
    pub fn new(
        pty_id: String,
        shell: Option<String>,
        cwd: Option<String>,
        env: Option<std::collections::HashMap<String, String>>,
        cols: u16,
        rows: u16,
        app_handle: AppHandle,
    ) -> Result<Self, PtyError> {
        // PTY 시스템 생성
        let pty_system = portable_pty::native_pty_system();

        // PTY 크기 설정
        let pty_size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };

        // PTY 페어 생성
        let pty_pair = pty_system
            .openpty(pty_size)
            .map_err(|e| PtyError::CreationFailed(e.to_string()))?;

        // Shell 결정 (기본값: 시스템 shell)
        let shell_path = shell.unwrap_or_else(|| Self::default_shell());

        // 커맨드 빌더 생성
        let mut cmd = CommandBuilder::new(&shell_path);

        // 작업 디렉토리 설정
        if let Some(cwd_path) = cwd {
            cmd.cwd(cwd_path);
        }

        // 환경 변수 설정
        if let Some(env_vars) = env {
            for (key, value) in env_vars {
                cmd.env(key, value);
            }
        }

        // PTY에서 자식 프로세스 실행
        let child = pty_pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| PtyError::CreationFailed(e.to_string()))?;

        let pid = child
            .process_id()
            .ok_or_else(|| PtyError::CreationFailed("Failed to get PID".to_string()))?;

        // Reader 생성 (출력 읽기용)
        let reader = pty_pair
            .master
            .try_clone_reader()
            .map_err(|e| PtyError::CreationFailed(e.to_string()))?;

        // Writer 생성 (입력 쓰기용)
        let writer = pty_pair
            .master
            .take_writer()
            .map_err(|e| PtyError::CreationFailed(e.to_string()))?;

        let writer = Arc::new(Mutex::new(writer));

        // Reader 스레드 시작 (출력을 읽어서 이벤트 발행)
        let pty_id_clone = pty_id.clone();
        let app_handle_clone = app_handle.clone();
        thread::spawn(move || {
            Self::read_output(pty_id_clone, reader, app_handle_clone);
        });

        Ok(PtySession {
            pty_id,
            pid,
            shell: shell_path,
            master: Arc::new(Mutex::new(pty_pair.master)),
            writer,
            child: Arc::new(Mutex::new(child)),
        })
    }

    /// PTY에 데이터 쓰기
    pub async fn write(&self, data: &str) -> Result<(), PtyError> {
        let mut writer = self.writer.lock().await;
        writer
            .write_all(data.as_bytes())
            .map_err(|e| PtyError::WriteFailed(e.to_string()))?;
        writer
            .flush()
            .map_err(|e| PtyError::WriteFailed(e.to_string()))?;
        Ok(())
    }

    /// PTY 크기 조정
    pub async fn resize(&self, cols: u16, rows: u16) -> Result<(), PtyError> {
        let pty_size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };
        self.master
            .lock()
            .await
            .resize(pty_size)
            .map_err(|e| PtyError::ResizeFailed(e.to_string()))?;
        Ok(())
    }

    /// 출력 읽기 스레드 함수
    fn read_output(pty_id: String, mut reader: Box<dyn Read + Send>, app_handle: AppHandle) {
        let mut buf = [0u8; 8192];

        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    // EOF - 프로세스 종료
                    let _ = app_handle.emit(
                        &format!("pty-exit-{}", pty_id),
                        PtyExitEvent {
                            pty_id: pty_id.clone(),
                            exit_code: Some(0),
                        },
                    );
                    break;
                }
                Ok(n) => {
                    // 데이터 수신 - UTF-8로 변환하여 이벤트 발행
                    if let Ok(data) = String::from_utf8(buf[..n].to_vec()) {
                        let _ = app_handle.emit(
                            &format!("pty-output-{}", pty_id),
                            PtyOutputEvent {
                                pty_id: pty_id.clone(),
                                data,
                            },
                        );
                    }
                }
                Err(e) => {
                    // 에러 발생 - 종료
                    eprintln!("PTY read error: {}", e);
                    let _ = app_handle.emit(
                        &format!("pty-exit-{}", pty_id),
                        PtyExitEvent {
                            pty_id: pty_id.clone(),
                            exit_code: None,
                        },
                    );
                    break;
                }
            }
        }
    }

    /// 기본 shell 경로 반환
    fn default_shell() -> String {
        #[cfg(target_os = "windows")]
        {
            "powershell.exe".to_string()
        }
        #[cfg(not(target_os = "windows"))]
        {
            std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
        }
    }
}
