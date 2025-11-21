use super::types::{AuthMethod, FileInfo, SftpConfig, SftpError};
use ssh2::{Session, Sftp};
use std::net::TcpStream;
use std::path::Path;
use std::sync::{Arc, Mutex};

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

            let full_path = path.to_string_lossy().to_string();
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

    /// 디렉토리 생성
    pub fn create_directory(&self, path: &str) -> Result<(), SftpError> {
        let sftp = self.sftp.lock().unwrap();
        sftp.mkdir(Path::new(path), 0o755)
            .map_err(|e| SftpError::CreateDirFailed(format!("{}: {}", path, e)))
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
    pub fn upload_file(&self, local_path: &str, remote_path: &str) -> Result<(), SftpError> {
        let sftp = self.sftp.lock().unwrap();

        // 로컬 파일 읽기
        let mut local_file = std::fs::File::open(local_path).map_err(|e| {
            SftpError::UploadFailed(format!("Failed to open local file {}: {}", local_path, e))
        })?;

        // 원격 파일 생성
        let mut remote_file = sftp.create(Path::new(remote_path)).map_err(|e| {
            SftpError::UploadFailed(format!(
                "Failed to create remote file {}: {}",
                remote_path, e
            ))
        })?;

        // 복사
        std::io::copy(&mut local_file, &mut remote_file).map_err(|e| {
            SftpError::UploadFailed(format!("Failed to upload {}: {}", local_path, e))
        })?;

        Ok(())
    }

    /// 파일 다운로드 (원격 → 로컬)
    pub fn download_file(&self, remote_path: &str, local_path: &str) -> Result<(), SftpError> {
        let sftp = self.sftp.lock().unwrap();

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

        // 복사
        std::io::copy(&mut remote_file, &mut local_file).map_err(|e| {
            SftpError::DownloadFailed(format!("Failed to download {}: {}", remote_path, e))
        })?;

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
            path: path.to_string(),
            is_directory,
            size,
            modified,
            permissions,
        })
    }
}
