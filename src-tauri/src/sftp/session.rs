use super::types::{AuthMethod, FileInfo, SftpConfig, SftpError, UploadProgressPayload};
use ssh2::{Session, Sftp};
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::Emitter;

/// SFTP 세션
#[derive(Clone)]
pub struct SftpSession {
    session_id: String,
    config: SftpConfig,
    ssh_session: Arc<Mutex<Session>>,
    sftp: Arc<Mutex<Sftp>>,
}

impl SftpSession {
    /// 새 SFTP 세션 생성
    pub fn new(session_id: String, config: SftpConfig) -> Result<Self, SftpError> {
        // TCP 연결
        let tcp = TcpStream::connect(format!("{}:{}", config.host, config.port)).map_err(
            |e| SftpError::ConnectionFailed(format!("TCP connection failed: {}", e)),
        )?;

        // SSH 세션 생성
        let mut sess = Session::new().map_err(|e| {
            SftpError::ConnectionFailed(format!("SSH session creation failed: {}", e))
        })?;

        sess.set_tcp_stream(tcp);
        sess.handshake().map_err(|e| {
            SftpError::ConnectionFailed(format!("SSH handshake failed: {}", e))
        })?;

        // 인증
        if let Some(auth_method) = &config.auth_method {
            match auth_method {
                AuthMethod::Password { password } => {
                    sess.userauth_password(&config.username, password).map_err(
                        |e| {
                            SftpError::AuthenticationFailed(format!(
                                "Password auth failed: {}",
                                e
                            ))
                        },
                    )?;
                }
                AuthMethod::PrivateKey { path, passphrase } => {
                    sess.userauth_pubkey_file(
                        &config.username,
                        None,
                        Path::new(path),
                        passphrase.as_deref(),
                    )
                    .map_err(|e| {
                        SftpError::AuthenticationFailed(format!("Key auth failed: {}", e))
                    })?;
                }
            }
        } else {
            // Interactive authentication or agent
            return Err(SftpError::AuthenticationFailed(
                "No auth method provided".to_string(),
            ));
        }

        if !sess.authenticated() {
            return Err(SftpError::AuthenticationFailed(
                "Authentication failed".to_string(),
            ));
        }

        // SFTP 채널 생성
        let sftp = sess.sftp().map_err(|e| {
            SftpError::ConnectionFailed(format!("SFTP channel creation failed: {}", e))
        })?;

        Ok(SftpSession {
            session_id,
            config,
            ssh_session: Arc::new(Mutex::new(sess)),
            sftp: Arc::new(Mutex::new(sftp)),
        })
    }

    /// 세션 ID 조회
    pub fn session_id(&self) -> &str {
        &self.session_id
    }

    /// 원격 홈 디렉토리 조회
    pub fn get_remote_home(&self) -> Result<String, SftpError> {
        let sftp = self.sftp.lock().unwrap();
        let home_path = sftp
            .realpath(Path::new("."))
            .map_err(|e| SftpError::SshError(format!("Failed to get home path: {}", e)))?;

        home_path
            .to_str()
            .map(|s| s.to_string())
            .ok_or_else(|| SftpError::SshError("Invalid UTF-8 in path".to_string()))
    }

    /// 디렉토리 목록 조회
    pub fn list_directory(&self, path: &str) -> Result<Vec<FileInfo>, SftpError> {
        let sftp = self.sftp.lock().unwrap();
        let remote_path = Path::new(path);

        let entries = sftp
            .readdir(remote_path)
            .map_err(|e| SftpError::ReadDirFailed(format!("{}: {}", path, e)))?;

        let mut files = Vec::new();

        for (path, stat) in entries {
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();

            // SFTP는 항상 Unix-style path 사용 (Windows 서버도 C:/Users/... 형식)
            let full_path = path.to_string_lossy().replace('\\', "/");
            let is_directory = stat.is_dir();
            let size = stat.size.unwrap_or(0);
            let modified = stat.mtime.unwrap_or(0) as u64 * 1000; // sec to ms

            // Unix 권한
            let permissions = stat.perm.map(|p| format!("{:o}", p));

            files.push(FileInfo {
                name,
                path: full_path,
                is_directory,
                size,
                modified,
                permissions,
            });
        }

        // 폴더 먼저, 그 다음 파일
        files.sort_by(|a, b| match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        });

        Ok(files)
    }

    /// 디렉토리 생성 (재귀적)
    /// 부모 디렉토리가 없으면 자동으로 생성 (mkdir -p와 동일)
    pub fn create_directory(&self, path: &str) -> Result<(), SftpError> {
        let sftp = self.sftp.lock().unwrap();

        // 경로 정규화 (백슬래시를 슬래시로 변환)
        let normalized_path = path.replace('\\', "/");

        // 빈 경로는 무시
        if normalized_path.is_empty() || normalized_path == "/" {
            return Ok(());
        }

        // 경로를 '/'로 분할
        let parts: Vec<&str> = normalized_path.split('/').collect();

        // 누적 경로를 만들면서 각 레벨의 디렉토리 생성
        let mut current_path = String::new();

        for (i, part) in parts.iter().enumerate() {
            // 빈 부분은 스킵 (절대 경로의 경우 첫 번째가 빈 문자열)
            if part.is_empty() {
                if i == 0 {
                    // 절대 경로의 루트
                    current_path.push('/');
                }
                continue;
            }

            // 현재 경로에 부분 추가
            if current_path == "/" {
                current_path.push_str(part);
            } else if current_path.is_empty() {
                current_path = part.to_string();
            } else {
                current_path.push('/');
                current_path.push_str(part);
            }

            // 디렉토리 생성 시도
            match sftp.mkdir(Path::new(&current_path), 0o755) {
                Ok(_) => {
                    // 성공
                }
                Err(e) => {
                    // 이미 존재하는지 확인
                    match sftp.stat(Path::new(&current_path)) {
                        Ok(stat) => {
                            // 경로가 존재함
                            if !stat.is_dir() {
                                // 파일이 존재하는 경우 에러
                                return Err(SftpError::CreateDirFailed(format!(
                                    "{}: Path exists but is not a directory",
                                    current_path
                                )));
                            }
                            // 디렉토리가 이미 존재하면 무시하고 계속
                        }
                        Err(_) => {
                            // stat 실패 = 디렉토리가 존재하지 않음
                            // mkdir도 실패했으므로 권한 문제 등의 에러
                            return Err(SftpError::CreateDirFailed(format!(
                                "{}: {}",
                                current_path, e
                            )));
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// 파일 삭제
    pub fn delete_file(&self, path: &str) -> Result<(), SftpError> {
        let sftp = self.sftp.lock().unwrap();
        sftp.unlink(Path::new(path))
            .map_err(|e| SftpError::DeleteFileFailed(format!("{}: {}", path, e)))
    }

    /// 디렉토리 삭제 (재귀)
    pub fn delete_directory(&self, path: &str) -> Result<(), SftpError> {
        let sftp = self.sftp.lock().unwrap();

        // 재귀적으로 삭제
        fn remove_dir_recursive(sftp: &Sftp, path: &Path) -> Result<(), SftpError> {
            let entries = sftp.readdir(path).map_err(|e| {
                SftpError::DeleteDirFailed(format!("{}: {}", path.display(), e))
            })?;

            for (entry_path, stat) in entries {
                if stat.is_dir() {
                    remove_dir_recursive(sftp, &entry_path)?;
                } else {
                    sftp.unlink(&entry_path).map_err(|e| {
                        SftpError::DeleteFileFailed(format!("{}: {}", entry_path.display(), e))
                    })?;
                }
            }

            sftp.rmdir(path)
                .map_err(|e| SftpError::DeleteDirFailed(format!("{}: {}", path.display(), e)))?;

            Ok(())
        }

        remove_dir_recursive(&sftp, Path::new(path))
    }

    /// 파일/디렉토리 이름 변경
    pub fn rename_item(&self, old_path: &str, new_path: &str) -> Result<(), SftpError> {
        let sftp = self.sftp.lock().unwrap();
        sftp.rename(Path::new(old_path), Path::new(new_path), None)
            .map_err(|e| {
                SftpError::RenameFailed(format!("{} -> {}: {}", old_path, new_path, e))
            })
    }

    /// 파일 업로드 (로컬 → 원격)
    pub fn upload_file(
        &self,
        local_path: &str,
        remote_path: &str,
        transfer_id: &str,
        app_handle: &tauri::AppHandle,
    ) -> Result<(), SftpError> {
        const CHUNK_SIZE: usize = 65536; // 64KB

        let sftp = self.sftp.lock().unwrap();

        // 로컬 파일 열기
        let mut local_file = std::fs::File::open(local_path).map_err(|e| {
            SftpError::UploadFailed(format!("Failed to open local file {}: {}", local_path, e))
        })?;

        // 파일 크기 조회
        let metadata = local_file.metadata().map_err(|e| {
            SftpError::UploadFailed(format!("Failed to get file metadata: {}", e))
        })?;
        let total_bytes = metadata.len();

        // 원격 파일 생성
        let mut remote_file = sftp.create(Path::new(remote_path)).map_err(|e| {
            SftpError::UploadFailed(format!(
                "Failed to create remote file {}: {}",
                remote_path, e
            ))
        })?;

        // 청크 단위 전송
        let mut buffer = vec![0u8; CHUNK_SIZE];
        let mut bytes_transferred: u64 = 0;
        let mut last_reported_percentage: u8 = 0;

        loop {
            let bytes_read = local_file.read(&mut buffer).map_err(|e| {
                SftpError::UploadFailed(format!("Failed to read local file: {}", e))
            })?;

            if bytes_read == 0 {
                break; // EOF
            }

            remote_file.write_all(&buffer[..bytes_read]).map_err(|e| {
                SftpError::UploadFailed(format!("Failed to write to remote file: {}", e))
            })?;

            bytes_transferred += bytes_read as u64;

            // 진행률 계산
            let percentage = if total_bytes > 0 {
                ((bytes_transferred as f64 / total_bytes as f64) * 100.0) as u8
            } else {
                100
            };

            // 진행률 이벤트 발생 (5% 단위로만 발생하거나 완료 시)
            if bytes_transferred == total_bytes
                || percentage >= last_reported_percentage + 5
                || last_reported_percentage == 0
            {
                last_reported_percentage = percentage;

                let payload = UploadProgressPayload {
                    transfer_id: transfer_id.to_string(),
                    bytes: bytes_transferred,
                    total_bytes,
                    percentage,
                };

                let _ = app_handle.emit("upload-progress", payload);
            }
        }

        Ok(())
    }

    /// 파일 다운로드 (원격 → 로컬)
    pub fn download_file(
        &self,
        remote_path: &str,
        local_path: &str,
        transfer_id: &str,
        app_handle: &tauri::AppHandle,
    ) -> Result<(), SftpError> {
        const CHUNK_SIZE: usize = 65536; // 64KB

        let sftp = self.sftp.lock().unwrap();

        // 원격 파일 정보 조회 (파일 크기)
        let stat = sftp.stat(Path::new(remote_path)).map_err(|e| {
            SftpError::DownloadFailed(format!(
                "Failed to get remote file stats {}: {}",
                remote_path, e
            ))
        })?;
        let total_bytes = stat.size.unwrap_or(0);

        // 원격 파일 열기
        let mut remote_file = sftp.open(Path::new(remote_path)).map_err(|e| {
            SftpError::DownloadFailed(format!(
                "Failed to open remote file {}: {}",
                remote_path, e
            ))
        })?;

        // 로컬 파일 생성
        let mut local_file = std::fs::File::create(local_path).map_err(|e| {
            SftpError::DownloadFailed(format!(
                "Failed to create local file {}: {}",
                local_path, e
            ))
        })?;

        // 청크 단위 전송
        let mut buffer = vec![0u8; CHUNK_SIZE];
        let mut bytes_transferred: u64 = 0;
        let mut last_reported_percentage: u8 = 0;

        loop {
            let bytes_read = remote_file.read(&mut buffer).map_err(|e| {
                SftpError::DownloadFailed(format!("Failed to read remote file: {}", e))
            })?;

            if bytes_read == 0 {
                break; // EOF
            }

            local_file.write_all(&buffer[..bytes_read]).map_err(|e| {
                SftpError::DownloadFailed(format!("Failed to write to local file: {}", e))
            })?;

            bytes_transferred += bytes_read as u64;

            // 진행률 계산
            let percentage = if total_bytes > 0 {
                ((bytes_transferred as f64 / total_bytes as f64) * 100.0) as u8
            } else {
                100
            };

            // 진행률 이벤트 발생 (5% 단위로만 발생하거나 완료 시)
            if bytes_transferred == total_bytes
                || percentage >= last_reported_percentage + 5
                || last_reported_percentage == 0
            {
                last_reported_percentage = percentage;

                let payload = super::types::DownloadProgressPayload {
                    transfer_id: transfer_id.to_string(),
                    bytes: bytes_transferred,
                    total_bytes,
                    percentage,
                };

                let _ = app_handle.emit("download-progress", payload);
            }
        }

        Ok(())
    }

    /// 파일 정보 조회
    pub fn get_file_info(&self, path: &str) -> Result<FileInfo, SftpError> {
        let sftp = self.sftp.lock().unwrap();
        let remote_path = Path::new(path);

        let stat = sftp
            .stat(remote_path)
            .map_err(|e| SftpError::PathNotFound(format!("{}: {}", path, e)))?;

        let name = remote_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        let is_directory = stat.is_dir();
        let size = stat.size.unwrap_or(0);
        let modified = stat.mtime.unwrap_or(0) as u64 * 1000;
        let permissions = stat.perm.map(|p| format!("{:o}", p));

        Ok(FileInfo {
            name,
            path: path.replace('\\', "/"), // SFTP는 항상 Unix-style path 사용
            is_directory,
            size,
            modified,
            permissions,
        })
    }
}
