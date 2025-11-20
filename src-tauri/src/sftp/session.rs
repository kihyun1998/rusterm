use super::types::{FileEntry, SftpConfig, SftpError};
use crate::ssh::types::AuthMethod;
use ssh2::{Session, Sftp};
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::Path;

/// SFTP 세션
pub struct SftpSession {
    #[allow(dead_code)]
    session_id: String,
    #[allow(dead_code)]
    config: SftpConfig,
    _session: Session, // Keep session alive
    sftp: Sftp,
}

impl SftpSession {
    /// 새 SFTP 세션 생성 및 연결
    pub fn new(session_id: String, config: SftpConfig) -> Result<Self, SftpError> {
        // TCP 연결 생성
        let tcp = TcpStream::connect(format!("{}:{}", config.host, config.port))
            .map_err(|e| SftpError::ConnectionFailed(format!("TCP connection failed: {}", e)))?;

        // SSH 세션 생성 및 핸드셰이크
        let mut session = Session::new()
            .map_err(|e| SftpError::SshError(format!("Failed to create session: {}", e)))?;
        session.set_tcp_stream(tcp);
        session
            .handshake()
            .map_err(|e| SftpError::ConnectionFailed(format!("SSH handshake failed: {}", e)))?;

        // 인증
        Self::authenticate(&mut session, &config)?;

        // SFTP 채널 열기
        let sftp = session
            .sftp()
            .map_err(|e| SftpError::ConnectionFailed(format!("Failed to open SFTP channel: {}", e)))?;

        Ok(Self {
            session_id,
            config,
            _session: session,
            sftp,
        })
    }

    /// SSH 인증 수행
    fn authenticate(session: &mut Session, config: &SftpConfig) -> Result<(), SftpError> {
        match &config.auth_method {
            Some(AuthMethod::Password { password }) => {
                session
                    .userauth_password(&config.username, password)
                    .map_err(|e| {
                        SftpError::AuthenticationFailed(format!("Password auth failed: {}", e))
                    })?;
            }
            Some(AuthMethod::PrivateKey { path, passphrase }) => {
                session
                    .userauth_pubkey_file(
                        &config.username,
                        None,
                        Path::new(path),
                        passphrase.as_deref(),
                    )
                    .map_err(|e| {
                        SftpError::AuthenticationFailed(format!("Private key auth failed: {}", e))
                    })?;
            }
            None => {
                // Try SSH agent authentication
                session.userauth_agent(&config.username).map_err(|e| {
                    SftpError::AuthenticationFailed(format!(
                        "Agent auth failed: {}. Please provide password or private key.",
                        e
                    ))
                })?;
            }
        }

        if !session.authenticated() {
            return Err(SftpError::AuthenticationFailed(
                "Authentication failed".to_string(),
            ));
        }

        Ok(())
    }

    /// 디렉토리 목록 조회
    pub fn list_directory(&self, path: &str) -> Result<Vec<FileEntry>, SftpError> {
        let entries = self
            .sftp
            .readdir(Path::new(path))
            .map_err(|e| SftpError::FileOperationFailed(e.to_string()))?;

        let mut result = Vec::new();
        for (path, stat) in entries {
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("?")
                .to_string();

            result.push(FileEntry {
                name: name.clone(),
                path: path.to_string_lossy().to_string(),
                is_dir: stat.is_dir(),
                size: stat.size.unwrap_or(0),
                modified: stat.mtime.unwrap_or(0),
                permissions: format!("{:o}", stat.perm.unwrap_or(0)),
            });
        }

        // Sort: directories first, then by name
        result.sort_by(|a, b| match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        });

        Ok(result)
    }

    /// 파일 업로드
    pub fn upload_file(&self, local_path: &str, remote_path: &str) -> Result<(), SftpError> {
        let mut local_file = std::fs::File::open(local_path)
            .map_err(|e| SftpError::FileOperationFailed(format!("Failed to open local file: {}", e)))?;

        let mut remote_file = self
            .sftp
            .create(Path::new(remote_path))
            .map_err(|e| SftpError::FileOperationFailed(format!("Failed to create remote file: {}", e)))?;

        let mut buffer = vec![0u8; 8192];
        loop {
            let n = local_file
                .read(&mut buffer)
                .map_err(|e| SftpError::IoError(e))?;
            if n == 0 {
                break;
            }
            remote_file
                .write_all(&buffer[..n])
                .map_err(|e| SftpError::IoError(e))?;
        }

        Ok(())
    }

    /// 파일 다운로드
    pub fn download_file(&self, remote_path: &str, local_path: &str) -> Result<(), SftpError> {
        let mut remote_file = self
            .sftp
            .open(Path::new(remote_path))
            .map_err(|e| SftpError::FileOperationFailed(format!("Failed to open remote file: {}", e)))?;

        let mut local_file = std::fs::File::create(local_path)
            .map_err(|e| SftpError::FileOperationFailed(format!("Failed to create local file: {}", e)))?;

        let mut buffer = vec![0u8; 8192];
        loop {
            let n = remote_file
                .read(&mut buffer)
                .map_err(|e| SftpError::IoError(e))?;
            if n == 0 {
                break;
            }
            local_file
                .write_all(&buffer[..n])
                .map_err(|e| SftpError::IoError(e))?;
        }

        Ok(())
    }

    /// 디렉토리 생성
    pub fn create_directory(&self, path: &str) -> Result<(), SftpError> {
        self.sftp
            .mkdir(Path::new(path), 0o755)
            .map_err(|e| SftpError::FileOperationFailed(e.to_string()))
    }

    /// 파일/디렉토리 삭제
    pub fn delete_path(&self, path: &str, is_dir: bool) -> Result<(), SftpError> {
        if is_dir {
            self.sftp
                .rmdir(Path::new(path))
                .map_err(|e| SftpError::FileOperationFailed(e.to_string()))
        } else {
            self.sftp
                .unlink(Path::new(path))
                .map_err(|e| SftpError::FileOperationFailed(e.to_string()))
        }
    }

    /// 파일/디렉토리 이름 변경
    pub fn rename_path(&self, old_path: &str, new_path: &str) -> Result<(), SftpError> {
        self.sftp
            .rename(Path::new(old_path), Path::new(new_path), None)
            .map_err(|e| SftpError::FileOperationFailed(e.to_string()))
    }

    pub fn session_id(&self) -> &str {
        &self.session_id
    }
}
