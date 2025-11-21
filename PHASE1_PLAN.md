# Phase 1: 기본 타입 및 백엔드 구조 - 상세 구현 계획

## 📋 현재 코드 구조 분석

### Frontend 타입 구조
- **파일**: `src/types/connection.ts`
- **현재 상태**: `ConnectionType = 'local' | 'ssh'`
- **필요 작업**: `'sftp'` 타입 추가 및 `SFTPConfig` 인터페이스 정의

### Rust 백엔드 구조
- **Entry Point**: `src-tauri/src/lib.rs`
- **모듈 패턴**: `mod.rs`, `types.rs`, `manager.rs`, `session.rs`
- **커맨드 패턴**: `State<Manager>` + `async fn` + `#[tauri::command]`
- **커맨드 등록**: `lib.rs`의 `invoke_handler!` 매크로

### 기존 모듈 구조 (참고용)
```
src-tauri/src/
├── ssh/
│   ├── mod.rs          (pub use manager::SshManager)
│   ├── types.rs        (SshConfig, SshError, AuthMethod)
│   ├── manager.rs      (SshManager with Arc<Mutex<HashMap>>)
│   └── session.rs      (개별 세션 구현)
└── commands/
    ├── mod.rs          (pub mod 선언)
    └── ssh_commands.rs (Tauri 커맨드들)
```

### 의존성 상태 (Cargo.toml)
```toml
dirs = "5.0"      # ✅ 이미 있음 (홈 디렉토리 조회용)
ssh2 = "0.9"      # ✅ 이미 있음 (SFTP 구현용)
tokio = { ... }   # ✅ 이미 있음 (async)
uuid = { ... }    # ✅ 이미 있음 (세션 ID)
thiserror = "1.0" # ✅ 이미 있음 (에러 처리)
```

---

## 📝 Task 1.1: TypeScript 타입 정의

### 수정할 파일: `src/types/connection.ts`

#### 1. ConnectionType 확장
```typescript
// 현재 (9번째 줄)
export type ConnectionType = 'local' | 'ssh';

// 변경 후
export type ConnectionType = 'local' | 'ssh' | 'sftp';
```

#### 2. SFTPConfig 인터페이스 추가
```typescript
// SSHConfig 다음에 추가 (29번째 줄 이후)

// SFTP connection configuration
export interface SFTPConfig {
  host: string; // Hostname or IP address
  port: number; // SFTP port (default: 22)
  username: string; // SFTP username
  password?: string; // Password authentication (optional)
  privateKey?: string; // Private key path or content (optional)
  passphrase?: string; // Passphrase for private key (optional)
}
```

#### 3. ConnectionConfig 타입 확장
```typescript
// 현재 (31번째 줄)
export type ConnectionConfig = LocalConfig | SSHConfig;

// 변경 후
export type ConnectionConfig = LocalConfig | SSHConfig | SFTPConfig;
```

#### 4. Type Guard 추가
```typescript
// isSSHConfig 다음에 추가 (77번째 줄 이후)

export function isSFTPConfig(config: ConnectionConfig): config is SFTPConfig {
  // SSH와 SFTP는 구조가 동일하므로, 타입을 명시적으로 체크하거나
  // 프로필의 type 필드를 별도로 확인해야 함
  // 여기서는 일단 구조 체크만 수행
  return 'host' in config && 'username' in config;
}
```

#### 5. StoredSFTPConfig 타입 추가
```typescript
// StoredSSHConfig 다음에 추가 (80번째 줄 이후)

// Stored SFTP config types (sensitive information excluded)
export type StoredSFTPConfig = Omit<SFTPConfig, 'password' | 'privateKey' | 'passphrase'>;
```

#### 6. StoredConnectionConfig 타입 확장
```typescript
// 현재 (82-84번째 줄)
export type StoredConnectionConfig =
  | LocalConfig // No sensitive information
  | StoredSSHConfig;

// 변경 후
export type StoredConnectionConfig =
  | LocalConfig // No sensitive information
  | StoredSSHConfig
  | StoredSFTPConfig;
```

#### 7. sanitizeProfile 함수 수정
```typescript
// 현재 함수에 SFTP 처리 추가 (92-109번째 줄)
export function sanitizeProfile(profile: ConnectionProfile): StoredConnectionProfile {
  const { config, ...rest } = profile;

  let sanitizedConfig: StoredConnectionConfig;

  if (isSSHConfig(config)) {
    const { password, privateKey, passphrase, ...sshRest } = config;
    sanitizedConfig = sshRest as StoredSSHConfig;
  } else if (isSFTPConfig(config)) {
    // SFTP 처리 추가
    const { password, privateKey, passphrase, ...sftpRest } = config;
    sanitizedConfig = sftpRest as StoredSFTPConfig;
  } else {
    // LocalConfig - no sensitive information
    sanitizedConfig = config as StoredConnectionConfig;
  }

  return {
    ...rest,
    config: sanitizedConfig,
  };
}
```

**참고**: SSH와 SFTP는 구조가 동일하므로, 실제 구분은 `ConnectionProfile.type` 필드로 해야 합니다.

---

### 신규 파일: `src/types/sftp.ts`

```typescript
/**
 * SFTP Types
 *
 * Types for SFTP file operations and transfer management
 */

// File system type ('local' | 'remote')
export type FileSystemType = 'local' | 'remote';

// File/Folder information
export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number; // bytes
  modified: number; // timestamp (milliseconds since epoch)
  permissions?: string; // e.g., "rwxr-xr-x" (display only)
}

// Directory listing response
export interface FileListResponse {
  path: string;
  files: FileInfo[];
}

// Transfer direction
export type TransferDirection = 'upload' | 'download';

// Transfer status
export type TransferStatus =
  | 'pending'
  | 'transferring'
  | 'completed'
  | 'failed'
  | 'cancelled';

// Transfer progress
export interface TransferProgress {
  bytes: number;
  totalBytes: number;
  percentage: number;
  speed?: number; // bytes/sec
}

// Transfer item
export interface TransferItem {
  id: string;
  fileName: string;
  fileSize: number;
  sourcePath: string;
  destinationPath: string;
  direction: TransferDirection;
  status: TransferStatus;
  progress: TransferProgress;
  error?: string;
}
```

---

## 📝 Task 1.2: 로컬 파일 시스템 모듈 (Rust)

### 디렉토리 생성
```bash
mkdir -p src-tauri/src/fs
```

### 파일 1: `src-tauri/src/fs/types.rs`

```rust
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// 파일/폴더 정보
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: u64, // bytes
    pub modified: u64, // timestamp (milliseconds since epoch)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permissions: Option<String>, // e.g., "rwxr-xr-x"
}

/// 디렉토리 목록 응답
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileListResponse {
    pub path: String,
    pub files: Vec<FileInfo>,
}

/// 파일 시스템 에러
#[derive(Debug, Error)]
pub enum FsError {
    #[error("Path not found: {0}")]
    PathNotFound(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Failed to read directory: {0}")]
    ReadDirFailed(String),

    #[error("Failed to create directory: {0}")]
    CreateDirFailed(String),

    #[error("Failed to delete file: {0}")]
    DeleteFileFailed(String),

    #[error("Failed to delete directory: {0}")]
    DeleteDirFailed(String),

    #[error("Failed to rename item: {0}")]
    RenameFailed(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

impl From<FsError> for String {
    fn from(err: FsError) -> Self {
        err.to_string()
    }
}
```

### 파일 2: `src-tauri/src/fs/operations.rs`

```rust
use super::types::{FileInfo, FsError};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// 사용자 홈 디렉토리 조회
pub fn get_user_home() -> Result<String, FsError> {
    dirs::home_dir()
        .and_then(|p| p.to_str().map(|s| s.to_string()))
        .ok_or_else(|| FsError::PathNotFound("Home directory not found".to_string()))
}

/// 디렉토리 목록 조회
pub fn list_directory(path: &str) -> Result<Vec<FileInfo>, FsError> {
    let path_buf = PathBuf::from(path);

    if !path_buf.exists() {
        return Err(FsError::PathNotFound(path.to_string()));
    }

    if !path_buf.is_dir() {
        return Err(FsError::ReadDirFailed(format!("{} is not a directory", path)));
    }

    let entries = fs::read_dir(&path_buf)
        .map_err(|e| FsError::ReadDirFailed(format!("{}: {}", path, e)))?;

    let mut files = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| FsError::ReadDirFailed(e.to_string()))?;
        let metadata = entry.metadata()
            .map_err(|e| FsError::ReadDirFailed(e.to_string()))?;

        let name = entry.file_name().to_string_lossy().to_string();
        let full_path = entry.path().to_string_lossy().to_string();
        let is_directory = metadata.is_dir();
        let size = if is_directory { 0 } else { metadata.len() };

        let modified = metadata.modified()
            .unwrap_or(SystemTime::UNIX_EPOCH)
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        // Unix 권한 (선택 사항)
        #[cfg(unix)]
        let permissions = {
            use std::os::unix::fs::PermissionsExt;
            Some(format!("{:o}", metadata.permissions().mode() & 0o777))
        };

        #[cfg(not(unix))]
        let permissions = None;

        files.push(FileInfo {
            name,
            path: full_path,
            is_directory,
            size,
            modified,
            permissions,
        });
    }

    // 폴더 먼저, 그 다음 파일 (알파벳 순)
    files.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(files)
}

/// 파일 정보 조회
pub fn get_file_info(path: &str) -> Result<FileInfo, FsError> {
    let path_buf = Path::new(path);

    if !path_buf.exists() {
        return Err(FsError::PathNotFound(path.to_string()));
    }

    let metadata = fs::metadata(path_buf)
        .map_err(|e| FsError::ReadDirFailed(e.to_string()))?;

    let name = path_buf.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let is_directory = metadata.is_dir();
    let size = if is_directory { 0 } else { metadata.len() };

    let modified = metadata.modified()
        .unwrap_or(SystemTime::UNIX_EPOCH)
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    #[cfg(unix)]
    let permissions = {
        use std::os::unix::fs::PermissionsExt;
        Some(format!("{:o}", metadata.permissions().mode() & 0o777))
    };

    #[cfg(not(unix))]
    let permissions = None;

    Ok(FileInfo {
        name,
        path: path.to_string(),
        is_directory,
        size,
        modified,
        permissions,
    })
}

/// 디렉토리 생성
pub fn create_directory(path: &str) -> Result<(), FsError> {
    fs::create_dir_all(path)
        .map_err(|e| FsError::CreateDirFailed(format!("{}: {}", path, e)))
}

/// 파일 삭제
pub fn delete_file(path: &str) -> Result<(), FsError> {
    fs::remove_file(path)
        .map_err(|e| FsError::DeleteFileFailed(format!("{}: {}", path, e)))
}

/// 디렉토리 삭제 (재귀)
pub fn delete_directory(path: &str) -> Result<(), FsError> {
    fs::remove_dir_all(path)
        .map_err(|e| FsError::DeleteDirFailed(format!("{}: {}", path, e)))
}

/// 파일/디렉토리 이름 변경
pub fn rename_item(old_path: &str, new_path: &str) -> Result<(), FsError> {
    fs::rename(old_path, new_path)
        .map_err(|e| FsError::RenameFailed(format!("{} -> {}: {}", old_path, new_path, e)))
}
```

### 파일 3: `src-tauri/src/fs/mod.rs`

```rust
mod operations;
mod types;

pub use operations::*;
pub use types::*;
```

---

## 📝 Task 1.3: 로컬 파일 시스템 커맨드 (Rust)

### 파일: `src-tauri/src/commands/fs_commands.rs`

```rust
use crate::fs::{
    create_directory, delete_directory, delete_file, get_file_info, get_user_home,
    list_directory, rename_item, FileInfo,
};

/// 사용자 홈 디렉토리 조회 커맨드
#[tauri::command]
pub fn get_user_home_dir() -> Result<String, String> {
    get_user_home().map_err(|e| e.to_string())
}

/// 로컬 디렉토리 목록 조회 커맨드
#[tauri::command]
pub fn list_local_directory(path: String) -> Result<Vec<FileInfo>, String> {
    list_directory(&path).map_err(|e| e.to_string())
}

/// 로컬 파일 정보 조회 커맨드
#[tauri::command]
pub fn get_local_file_stats(path: String) -> Result<FileInfo, String> {
    get_file_info(&path).map_err(|e| e.to_string())
}

/// 로컬 디렉토리 생성 커맨드
#[tauri::command]
pub fn create_local_directory(path: String) -> Result<(), String> {
    create_directory(&path).map_err(|e| e.to_string())
}

/// 로컬 파일 삭제 커맨드
#[tauri::command]
pub fn delete_local_file(path: String) -> Result<(), String> {
    delete_file(&path).map_err(|e| e.to_string())
}

/// 로컬 디렉토리 삭제 커맨드
#[tauri::command]
pub fn delete_local_directory(path: String) -> Result<(), String> {
    delete_directory(&path).map_err(|e| e.to_string())
}

/// 로컬 파일/디렉토리 이름 변경 커맨드
#[tauri::command]
pub fn rename_local_item(old_path: String, new_path: String) -> Result<(), String> {
    rename_item(&old_path, &new_path).map_err(|e| e.to_string())
}
```

### 수정할 파일 1: `src-tauri/src/commands/mod.rs`

```rust
// 현재
pub mod keyring_commands;
pub mod pty_commands;
pub mod settings_commands;
pub mod ssh_commands;

// 변경 후 (추가)
pub mod keyring_commands;
pub mod pty_commands;
pub mod settings_commands;
pub mod ssh_commands;
pub mod fs_commands;  // 추가
```

### 수정할 파일 2: `src-tauri/src/lib.rs`

#### 1. 모듈 선언 추가 (2-5번째 줄)
```rust
mod commands;
mod pty;
mod settings;
mod ssh;
mod ipc;
mod fs;  // 추가
```

#### 2. 커맨드 등록 (59-75번째 줄)
```rust
.invoke_handler(tauri::generate_handler![
    commands::pty_commands::create_pty,
    commands::pty_commands::write_to_pty,
    commands::pty_commands::resize_pty,
    commands::pty_commands::close_pty,
    commands::settings_commands::load_settings,
    commands::settings_commands::save_settings,
    commands::settings_commands::reset_settings,
    commands::keyring_commands::save_credential,
    commands::keyring_commands::get_credential,
    commands::keyring_commands::delete_credential,
    // SSH commands
    commands::ssh_commands::create_ssh_session,
    commands::ssh_commands::write_to_ssh,
    commands::ssh_commands::resize_ssh_session,
    commands::ssh_commands::close_ssh_session,
    // 로컬 파일 시스템 커맨드 추가
    commands::fs_commands::get_user_home_dir,
    commands::fs_commands::list_local_directory,
    commands::fs_commands::get_local_file_stats,
    commands::fs_commands::create_local_directory,
    commands::fs_commands::delete_local_file,
    commands::fs_commands::delete_local_directory,
    commands::fs_commands::rename_local_item,
])
```

---

## 📝 Task 1.4: SFTP 모듈 (Rust)

### 디렉토리 생성
```bash
mkdir -p src-tauri/src/sftp
```

### 파일 1: `src-tauri/src/sftp/types.rs`

```rust
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// SFTP 연결 설정
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SftpConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auth_method: Option<AuthMethod>,
}

/// SFTP 인증 방법
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AuthMethod {
    #[serde(rename = "password")]
    Password { password: String },
    #[serde(rename = "privateKey")]
    PrivateKey { path: String, passphrase: Option<String> },
}

/// 파일/폴더 정보 (원격)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permissions: Option<String>,
}

/// SFTP 세션 생성 응답
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSftpResponse {
    pub session_id: String,
    pub host: String,
    pub username: String,
}

/// SFTP 에러 타입
#[derive(Debug, Error)]
pub enum SftpError {
    #[error("Session not found: {0}")]
    SessionNotFound(String),

    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),

    #[error("Path not found: {0}")]
    PathNotFound(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Failed to read directory: {0}")]
    ReadDirFailed(String),

    #[error("Failed to create directory: {0}")]
    CreateDirFailed(String),

    #[error("Failed to delete file: {0}")]
    DeleteFileFailed(String),

    #[error("Failed to delete directory: {0}")]
    DeleteDirFailed(String),

    #[error("Failed to rename item: {0}")]
    RenameFailed(String),

    #[error("Failed to upload file: {0}")]
    UploadFailed(String),

    #[error("Failed to download file: {0}")]
    DownloadFailed(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("SSH error: {0}")]
    SshError(String),
}

impl From<SftpError> for String {
    fn from(err: SftpError) -> Self {
        err.to_string()
    }
}
```

### 파일 2: `src-tauri/src/sftp/session.rs`

```rust
use super::types::{AuthMethod, FileInfo, SftpConfig, SftpError};
use ssh2::{Session, Sftp};
use std::io::Read;
use std::net::TcpStream;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::SystemTime;

/// SFTP 세션
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
        let tcp = TcpStream::connect(format!("{}:{}", config.host, config.port))
            .map_err(|e| SftpError::ConnectionFailed(format!("TCP connection failed: {}", e)))?;

        // SSH 세션 생성
        let mut sess = Session::new()
            .map_err(|e| SftpError::ConnectionFailed(format!("SSH session creation failed: {}", e)))?;

        sess.set_tcp_stream(tcp);
        sess.handshake()
            .map_err(|e| SftpError::ConnectionFailed(format!("SSH handshake failed: {}", e)))?;

        // 인증
        if let Some(auth_method) = &config.auth_method {
            match auth_method {
                AuthMethod::Password { password } => {
                    sess.userauth_password(&config.username, password)
                        .map_err(|e| SftpError::AuthenticationFailed(format!("Password auth failed: {}", e)))?;
                }
                AuthMethod::PrivateKey { path, passphrase } => {
                    sess.userauth_pubkey_file(
                        &config.username,
                        None,
                        Path::new(path),
                        passphrase.as_deref(),
                    )
                    .map_err(|e| SftpError::AuthenticationFailed(format!("Key auth failed: {}", e)))?;
                }
            }
        } else {
            // Interactive authentication or agent
            return Err(SftpError::AuthenticationFailed("No auth method provided".to_string()));
        }

        if !sess.authenticated() {
            return Err(SftpError::AuthenticationFailed("Authentication failed".to_string()));
        }

        // SFTP 채널 생성
        let sftp = sess.sftp()
            .map_err(|e| SftpError::ConnectionFailed(format!("SFTP channel creation failed: {}", e)))?;

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
        let home_path = sftp.realpath(Path::new("."))
            .map_err(|e| SftpError::SshError(format!("Failed to get home path: {}", e)))?;

        home_path.to_str()
            .map(|s| s.to_string())
            .ok_or_else(|| SftpError::SshError("Invalid UTF-8 in path".to_string()))
    }

    /// 디렉토리 목록 조회
    pub fn list_directory(&self, path: &str) -> Result<Vec<FileInfo>, SftpError> {
        let sftp = self.sftp.lock().unwrap();
        let remote_path = Path::new(path);

        let entries = sftp.readdir(remote_path)
            .map_err(|e| SftpError::ReadDirFailed(format!("{}: {}", path, e)))?;

        let mut files = Vec::new();

        for (path, stat) in entries {
            let name = path.file_name()
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
        files.sort_by(|a, b| {
            match (a.is_directory, b.is_directory) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            }
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
            let entries = sftp.readdir(path)
                .map_err(|e| SftpError::DeleteDirFailed(format!("{}: {}", path.display(), e)))?;

            for (entry_path, stat) in entries {
                if stat.is_dir() {
                    remove_dir_recursive(sftp, &entry_path)?;
                } else {
                    sftp.unlink(&entry_path)
                        .map_err(|e| SftpError::DeleteFileFailed(format!("{}: {}", entry_path.display(), e)))?;
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
            .map_err(|e| SftpError::RenameFailed(format!("{} -> {}: {}", old_path, new_path, e)))
    }

    /// 파일 업로드 (로컬 → 원격)
    pub fn upload_file(&self, local_path: &str, remote_path: &str) -> Result<(), SftpError> {
        let sftp = self.sftp.lock().unwrap();

        // 로컬 파일 읽기
        let mut local_file = std::fs::File::open(local_path)
            .map_err(|e| SftpError::UploadFailed(format!("Failed to open local file {}: {}", local_path, e)))?;

        // 원격 파일 생성
        let mut remote_file = sftp.create(Path::new(remote_path))
            .map_err(|e| SftpError::UploadFailed(format!("Failed to create remote file {}: {}", remote_path, e)))?;

        // 복사
        std::io::copy(&mut local_file, &mut remote_file)
            .map_err(|e| SftpError::UploadFailed(format!("Failed to upload {}: {}", local_path, e)))?;

        Ok(())
    }

    /// 파일 다운로드 (원격 → 로컬)
    pub fn download_file(&self, remote_path: &str, local_path: &str) -> Result<(), SftpError> {
        let sftp = self.sftp.lock().unwrap();

        // 원격 파일 열기
        let mut remote_file = sftp.open(Path::new(remote_path))
            .map_err(|e| SftpError::DownloadFailed(format!("Failed to open remote file {}: {}", remote_path, e)))?;

        // 로컬 파일 생성
        let mut local_file = std::fs::File::create(local_path)
            .map_err(|e| SftpError::DownloadFailed(format!("Failed to create local file {}: {}", local_path, e)))?;

        // 복사
        std::io::copy(&mut remote_file, &mut local_file)
            .map_err(|e| SftpError::DownloadFailed(format!("Failed to download {}: {}", remote_path, e)))?;

        Ok(())
    }

    /// 파일 정보 조회
    pub fn get_file_info(&self, path: &str) -> Result<FileInfo, SftpError> {
        let sftp = self.sftp.lock().unwrap();
        let remote_path = Path::new(path);

        let stat = sftp.stat(remote_path)
            .map_err(|e| SftpError::PathNotFound(format!("{}: {}", path, e)))?;

        let name = remote_path.file_name()
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
```

### 파일 3: `src-tauri/src/sftp/manager.rs`

```rust
use super::session::SftpSession;
use super::types::{CreateSftpResponse, SftpConfig, SftpError};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

/// SFTP 세션 관리자
#[derive(Clone)]
pub struct SftpManager {
    sessions: Arc<Mutex<HashMap<String, SftpSession>>>,
}

impl SftpManager {
    /// 새 SFTP Manager 생성
    pub fn new() -> Self {
        SftpManager {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// SFTP 세션 생성
    pub async fn create_session(&self, config: SftpConfig) -> Result<CreateSftpResponse, SftpError> {
        let session_id = Uuid::new_v4().to_string();

        // SFTP 세션 생성 (blocking)
        let session = tokio::task::spawn_blocking({
            let session_id = session_id.clone();
            let config = config.clone();
            move || SftpSession::new(session_id, config)
        })
        .await
        .map_err(|e| SftpError::ConnectionFailed(format!("Task join error: {}", e)))??;

        let response = CreateSftpResponse {
            session_id: session_id.clone(),
            host: config.host.clone(),
            username: config.username.clone(),
        };

        // 세션 맵에 추가
        let mut sessions = self.sessions.lock().await;
        sessions.insert(session_id, session);

        Ok(response)
    }

    /// SFTP 세션 종료
    pub async fn close_session(&self, session_id: &str) -> Result<(), SftpError> {
        let mut sessions = self.sessions.lock().await;
        sessions
            .remove(session_id)
            .ok_or_else(|| SftpError::SessionNotFound(session_id.to_string()))?;

        Ok(())
    }

    /// 세션 조회 (내부용)
    async fn get_session(&self, session_id: &str) -> Result<SftpSession, SftpError> {
        let sessions = self.sessions.lock().await;
        sessions
            .get(session_id)
            .cloned()
            .ok_or_else(|| SftpError::SessionNotFound(session_id.to_string()))
    }

    /// 원격 홈 디렉토리 조회
    pub async fn get_remote_home(&self, session_id: &str) -> Result<String, SftpError> {
        let session = self.get_session(session_id).await?;
        tokio::task::spawn_blocking(move || session.get_remote_home())
            .await
            .map_err(|e| SftpError::SshError(format!("Task join error: {}", e)))?
    }

    /// 디렉토리 목록 조회
    pub async fn list_directory(&self, session_id: &str, path: &str) -> Result<Vec<super::types::FileInfo>, SftpError> {
        let session = self.get_session(session_id).await?;
        let path = path.to_string();
        tokio::task::spawn_blocking(move || session.list_directory(&path))
            .await
            .map_err(|e| SftpError::ReadDirFailed(format!("Task join error: {}", e)))?
    }

    /// 디렉토리 생성
    pub async fn create_directory(&self, session_id: &str, path: &str) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        let path = path.to_string();
        tokio::task::spawn_blocking(move || session.create_directory(&path))
            .await
            .map_err(|e| SftpError::CreateDirFailed(format!("Task join error: {}", e)))?
    }

    /// 파일 삭제
    pub async fn delete_file(&self, session_id: &str, path: &str) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        let path = path.to_string();
        tokio::task::spawn_blocking(move || session.delete_file(&path))
            .await
            .map_err(|e| SftpError::DeleteFileFailed(format!("Task join error: {}", e)))?
    }

    /// 디렉토리 삭제
    pub async fn delete_directory(&self, session_id: &str, path: &str) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        let path = path.to_string();
        tokio::task::spawn_blocking(move || session.delete_directory(&path))
            .await
            .map_err(|e| SftpError::DeleteDirFailed(format!("Task join error: {}", e)))?
    }

    /// 이름 변경
    pub async fn rename_item(&self, session_id: &str, old_path: &str, new_path: &str) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        let old_path = old_path.to_string();
        let new_path = new_path.to_string();
        tokio::task::spawn_blocking(move || session.rename_item(&old_path, &new_path))
            .await
            .map_err(|e| SftpError::RenameFailed(format!("Task join error: {}", e)))?
    }

    /// 파일 업로드
    pub async fn upload_file(&self, session_id: &str, local_path: &str, remote_path: &str) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        let local_path = local_path.to_string();
        let remote_path = remote_path.to_string();
        tokio::task::spawn_blocking(move || session.upload_file(&local_path, &remote_path))
            .await
            .map_err(|e| SftpError::UploadFailed(format!("Task join error: {}", e)))?
    }

    /// 파일 다운로드
    pub async fn download_file(&self, session_id: &str, remote_path: &str, local_path: &str) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        let remote_path = remote_path.to_string();
        let local_path = local_path.to_string();
        tokio::task::spawn_blocking(move || session.download_file(&remote_path, &local_path))
            .await
            .map_err(|e| SftpError::DownloadFailed(format!("Task join error: {}", e)))?
    }

    /// 파일 정보 조회
    pub async fn get_file_info(&self, session_id: &str, path: &str) -> Result<super::types::FileInfo, SftpError> {
        let session = self.get_session(session_id).await?;
        let path = path.to_string();
        tokio::task::spawn_blocking(move || session.get_file_info(&path))
            .await
            .map_err(|e| SftpError::PathNotFound(format!("Task join error: {}", e)))?
    }
}
```

**참고**: `SftpSession`은 `Clone`을 구현해야 하지만, `ssh2::Session`과 `ssh2::Sftp`는 `Clone`이 불가능합니다. 따라서 `Arc<Mutex<>>` 래퍼를 사용합니다.

### 파일 4: `src-tauri/src/sftp/mod.rs`

```rust
mod manager;
mod session;
mod types;

pub use manager::SftpManager;
pub use types::*;
```

---

## 📝 Task 1.5: SFTP 커맨드 (Rust)

### 파일: `src-tauri/src/commands/sftp_commands.rs`

```rust
use crate::sftp::{CreateSftpResponse, FileInfo, SftpConfig, SftpManager};
use tauri::State;

/// SFTP 세션 생성 커맨드
#[tauri::command]
pub async fn create_sftp_session(
    state: State<'_, SftpManager>,
    config: SftpConfig,
) -> Result<CreateSftpResponse, String> {
    state.create_session(config).await.map_err(|e| e.to_string())
}

/// SFTP 세션 종료 커맨드
#[tauri::command]
pub async fn close_sftp_session(
    state: State<'_, SftpManager>,
    session_id: String,
) -> Result<(), String> {
    state.close_session(&session_id).await.map_err(|e| e.to_string())
}

/// 원격 홈 디렉토리 조회 커맨드
#[tauri::command]
pub async fn get_remote_home_dir(
    state: State<'_, SftpManager>,
    session_id: String,
) -> Result<String, String> {
    state.get_remote_home(&session_id).await.map_err(|e| e.to_string())
}

/// 원격 디렉토리 목록 조회 커맨드
#[tauri::command]
pub async fn list_remote_directory(
    state: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<Vec<FileInfo>, String> {
    state.list_directory(&session_id, &path).await.map_err(|e| e.to_string())
}

/// 원격 디렉토리 생성 커맨드
#[tauri::command]
pub async fn create_remote_directory(
    state: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<(), String> {
    state.create_directory(&session_id, &path).await.map_err(|e| e.to_string())
}

/// 원격 파일 삭제 커맨드
#[tauri::command]
pub async fn delete_remote_file(
    state: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<(), String> {
    state.delete_file(&session_id, &path).await.map_err(|e| e.to_string())
}

/// 원격 디렉토리 삭제 커맨드
#[tauri::command]
pub async fn delete_remote_directory(
    state: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<(), String> {
    state.delete_directory(&session_id, &path).await.map_err(|e| e.to_string())
}

/// 원격 파일/디렉토리 이름 변경 커맨드
#[tauri::command]
pub async fn rename_remote_item(
    state: State<'_, SftpManager>,
    session_id: String,
    old_path: String,
    new_path: String,
) -> Result<(), String> {
    state.rename_item(&session_id, &old_path, &new_path).await.map_err(|e| e.to_string())
}

/// 파일 다운로드 커맨드
#[tauri::command]
pub async fn download_file(
    state: State<'_, SftpManager>,
    session_id: String,
    remote_path: String,
    local_path: String,
) -> Result<(), String> {
    state.download_file(&session_id, &remote_path, &local_path).await.map_err(|e| e.to_string())
}

/// 파일 업로드 커맨드
#[tauri::command]
pub async fn upload_file(
    state: State<'_, SftpManager>,
    session_id: String,
    local_path: String,
    remote_path: String,
) -> Result<(), String> {
    state.upload_file(&session_id, &local_path, &remote_path).await.map_err(|e| e.to_string())
}

/// 원격 파일 정보 조회 커맨드
#[tauri::command]
pub async fn get_remote_file_stats(
    state: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<FileInfo, String> {
    state.get_file_info(&session_id, &path).await.map_err(|e| e.to_string())
}
```

### 수정할 파일 1: `src-tauri/src/commands/mod.rs`

```rust
pub mod keyring_commands;
pub mod pty_commands;
pub mod settings_commands;
pub mod ssh_commands;
pub mod fs_commands;
pub mod sftp_commands;  // 추가
```

### 수정할 파일 2: `src-tauri/src/lib.rs`

#### 1. 모듈 선언 추가
```rust
mod commands;
mod pty;
mod settings;
mod ssh;
mod ipc;
mod fs;
mod sftp;  // 추가
```

#### 2. SftpManager 초기화
```rust
use pty::PtyManager;
use settings::SettingsManager;
use ssh::SshManager;
use sftp::SftpManager;  // 추가
use ipc::IpcServer;
use std::sync::{Arc, Mutex};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // ...

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(PtyManager::new())
        .manage(SshManager::new())
        .manage(SftpManager::new())  // 추가
        .manage(settings_manager)
        // ...
```

#### 3. 커맨드 등록
```rust
.invoke_handler(tauri::generate_handler![
    // ... 기존 커맨드들 ...
    // 로컬 파일 시스템 커맨드
    commands::fs_commands::get_user_home_dir,
    commands::fs_commands::list_local_directory,
    commands::fs_commands::get_local_file_stats,
    commands::fs_commands::create_local_directory,
    commands::fs_commands::delete_local_file,
    commands::fs_commands::delete_local_directory,
    commands::fs_commands::rename_local_item,
    // SFTP 커맨드 추가
    commands::sftp_commands::create_sftp_session,
    commands::sftp_commands::close_sftp_session,
    commands::sftp_commands::get_remote_home_dir,
    commands::sftp_commands::list_remote_directory,
    commands::sftp_commands::create_remote_directory,
    commands::sftp_commands::delete_remote_file,
    commands::sftp_commands::delete_remote_directory,
    commands::sftp_commands::rename_remote_item,
    commands::sftp_commands::download_file,
    commands::sftp_commands::upload_file,
    commands::sftp_commands::get_remote_file_stats,
])
```

---

## 📋 Phase 1 체크리스트

### Task 1.1: TypeScript 타입 정의
- [ ] `src/types/connection.ts` 수정
  - [ ] ConnectionType에 'sftp' 추가
  - [ ] SFTPConfig 인터페이스 추가
  - [ ] ConnectionConfig 타입 확장
  - [ ] isSFTPConfig 타입 가드 추가
  - [ ] StoredSFTPConfig 타입 추가
  - [ ] StoredConnectionConfig 타입 확장
  - [ ] sanitizeProfile 함수에 SFTP 처리 추가
- [ ] `src/types/sftp.ts` 생성
  - [ ] FileInfo, TransferItem 등 모든 타입 정의

### Task 1.2: 로컬 파일 시스템 모듈
- [ ] `src-tauri/src/fs/` 디렉토리 생성
- [ ] `fs/types.rs` 작성
- [ ] `fs/operations.rs` 작성
- [ ] `fs/mod.rs` 작성

### Task 1.3: 로컬 파일 시스템 커맨드
- [ ] `src-tauri/src/commands/fs_commands.rs` 생성
- [ ] `commands/mod.rs`에 fs_commands 추가
- [ ] `lib.rs`에 fs 모듈 선언 추가
- [ ] `lib.rs`에 fs 커맨드 등록 (7개)

### Task 1.4: SFTP 모듈
- [ ] `src-tauri/src/sftp/` 디렉토리 생성
- [ ] `sftp/types.rs` 작성
- [ ] `sftp/session.rs` 작성
- [ ] `sftp/manager.rs` 작성
- [ ] `sftp/mod.rs` 작성

### Task 1.5: SFTP 커맨드
- [ ] `src-tauri/src/commands/sftp_commands.rs` 생성
- [ ] `commands/mod.rs`에 sftp_commands 추가
- [ ] `lib.rs`에 sftp 모듈 선언 추가
- [ ] `lib.rs`에 SftpManager 초기화 추가
- [ ] `lib.rs`에 sftp 커맨드 등록 (11개)

### 테스트
- [ ] TypeScript 컴파일: `pnpm run build`
- [ ] Rust 컴파일: `cd src-tauri && cargo build`
- [ ] 개발 모드 실행: `pnpm tauri dev`
- [ ] 로컬 FS 커맨드 테스트 (Browser Console)
- [ ] SFTP 커맨드 테스트 (test.rebex.net 사용)

---

## 📊 예상 작업 시간

- **Task 1.1**: TypeScript 타입 정의 - 30분
- **Task 1.2**: 로컬 파일 시스템 모듈 - 1시간
- **Task 1.3**: 로컬 파일 시스템 커맨드 - 30분
- **Task 1.4**: SFTP 모듈 - 2-3시간
- **Task 1.5**: SFTP 커맨드 - 1시간
- **통합 및 테스트** - 1-2시간

**총 예상 시간**: 6-8시간

---

## ⚠️ 주의사항

1. **SftpSession의 Clone 구현**
   - `ssh2::Session`과 `ssh2::Sftp`는 Clone 불가
   - `Arc<Mutex<>>` 래퍼 사용 필수

2. **Blocking 작업**
   - ssh2는 동기 라이브러리
   - `tokio::task::spawn_blocking` 사용 필수

3. **에러 처리**
   - ssh2 에러를 SftpError로 변환
   - 모든 에러 메시지에 컨텍스트 포함 (경로, 작업 등)

4. **보안**
   - 비밀번호와 키는 키링에 저장
   - Config에서 민감 정보 제거 (sanitizeProfile)

5. **경로 처리**
   - Unix/Windows 경로 차이 주의
   - SFTP는 항상 Unix 스타일 경로 사용

---

**작성일**: 2025-11-21
**Phase**: 1 / 9
