# RusTerm SFTP 기능 기획서

**작성일**: 2025-01-21
**버전**: 1.0.0

---

## 목차

1. [개요](#개요)
2. [기술 스택](#기술-스택)
3. [전체 구조](#전체-구조)
4. [연결 방법](#연결-방법)
5. [홈 화면 연결 카드](#홈-화면-연결-카드)
6. [UI 레이아웃](#ui-레이아웃)
7. [상단 컨트롤](#상단-컨트롤)
8. [파일 리스트](#파일-리스트)
9. [파일 선택](#파일-선택)
10. [파일 작업](#파일-작업)
11. [전송 관리](#전송-관리)
12. [상태 & 피드백](#상태--피드백)
13. [구현 구조](#구현-구조)
14. [타입 정의](#타입-정의)
15. [Task List](#task-list)

---

## 개요

RusTerm에 SFTP 파일 전송 기능을 추가합니다. FileZilla, WinSCP와 유사한 듀얼 패널 UI를 제공하며, 로컬과 원격 서버 간 파일을 드래그 앤 드롭으로 전송할 수 있습니다.

**주요 기능:**
- 듀얼 패널 파일 탐색 (로컬/원격)
- Drag & Drop 파일 전송
- 다중 인증 방식 지원 (Password/Private Key/Interactive)
- 전송 큐 관리
- 연결 프로필 저장

**제외 사항:**
- 권한 관리 (chmod, chown)
- 고급 기능 (동기화, diff, 편집)
- 자동 재연결
- 다중 SFTP 탭
- SSH 연결 재사용

---

## 기술 스택

**Frontend:**
- React 19 + TypeScript
- Shadcn/ui + Radix UI
- Tailwind CSS 4
- Zustand (상태 관리)

**Backend:**
- Rust (Tauri 2)
- ssh2-rs (SFTP 구현)
- tokio (비동기 처리)

---

## 전체 구조

### 아키텍처
- SSH와 유사한 구조 참고
- 별도의 독립적인 SFTP 연결
- Manager/Session 패턴 사용

### 탭 시스템
- 단일 SFTP 탭만 지원
- 연결 종료 시 자동 재연결 없음

---

## 연결 방법

### Command Palette 통합

1. `+` 버튼 클릭 → Command Palette 열림
2. "SFTP" 옵션 선택
3. SFTP Connection Dialog 표시

### Connection Dialog 필드

**기본 정보:**
- **Host** (필수)
- **Port** (기본: 22)
- **Username** (필수)

**Authentication Method:**
- **Password**
  - 비밀번호 입력 필드
  - "Save password to Keyring" 체크박스

- **Private Key**
  - 키 파일 경로 선택 (파일 브라우저)
  - Passphrase 입력 (선택)
  - "Save passphrase to Keyring" 체크박스

- **Interactive**
  - 키보드 인터랙티브 인증
  - 별도 입력 필드 없음

**프로필 저장:**
- "Save as Connection Profile" 체크박스
- Profile Name 입력 필드 (체크 시 표시)

---

## 홈 화면 연결 카드

### SFTP 연결 프로필 카드

```
┌────────────────────────────────┐
│ SFTP  Production Server        │
│ 📁                             │
│ user@192.168.1.100:22          │
│ 🔑 Password                    │
│                                │
│ [Connect] [Edit] [Delete]      │
└────────────────────────────────┘
```

### 카드 구성 요소

**헤더:**
- 좌측: "SFTP" 뱃지 또는 📁 아이콘
- 프로필 이름 (예: "Production Server")

**본문:**
- 연결 정보: `user@host:port`
- 인증 방식 표시:
  - 🔑 Password
  - 🔐 Private Key
  - 💬 Interactive

**액션 버튼:**
- **Connect**: SFTP 탭 열기
- **Edit**: 프로필 편집 Dialog
- **Delete**: 삭제 확인 후 제거

### SSH vs SFTP 구분

- 카드 타입 뱃지 또는 아이콘으로 구분
  - SSH: 💻 아이콘 또는 "SSH" 뱃지
  - SFTP: 📁 아이콘 또는 "SFTP" 뱃지

---

## UI 레이아웃

### 전체 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ SFTP: Production Server (user@192.168.1.100:22)         [Close] │
├────────────────────────┬────────────────────────────────────────┤
│ Local Files            │ Remote Files                           │
│ [🏠] [↻] [+📁] [+📄]   │ [🏠] [↻] [+📁] [+📄] [✏️] [🗑️]         │
│ Home > Projects        │ /home/user/projects                    │
├────────────────────────┼────────────────────────────────────────┤
│ Name      Size   Date  │ Name      Size   Date  Type            │
│ [..]                   │ [..]                                   │
│ 📁 folder1             │ 📁 folder1                             │
│ 📄 file.txt  1.2MB     │ 📄 file.txt  1.2MB  2025-01-15  Text   │
│                        │                                        │
│                        │                                        │
├────────────────────────┴────────────────────────────────────────┤
│ Transfer Queue                                  [Clear All]     │
│ ↓ file.txt (45%) ████████░░ 1.2MB/s  00:15  [⏸] [✕]           │
│ ↑ image.png (Done) ██████████ 2.5MB/s        [✓]              │
└─────────────────────────────────────────────────────────────────┘
```

### 레이아웃 구성

**상단:**
- 연결 정보 표시
- 닫기 버튼

**중앙 (듀얼 패널):**
- 좌측: 로컬 파일 탐색기
- 우측: 원격 파일 탐색기

**하단:**
- 전송 큐 (접고 펼치기 가능)

---

## 상단 컨트롤

### 좌측/우측 패널 공통

**툴바 버튼:**
- 🏠 홈 버튼: 홈 디렉토리로 이동
- ↻ 새로고침 (F5): 현재 디렉토리 새로고침
- +📁 새 폴더: 폴더 생성 Dialog
- +📄 새 파일: .txt 파일 생성 Dialog
- ✏️ 이름 변경 (F2): 선택된 파일/폴더 이름 변경
- 🗑️ 삭제 (Delete): 선택된 파일/폴더 삭제

**Breadcrumb 네비게이션:**
- 클릭 가능한 경로 표시
- 예: `Home > Projects > rust-projects`
- 각 단계 클릭 시 해당 폴더로 이동

---

## 파일 리스트

### 테이블 구조

| 이름 (가변) | 크기 (가변) | 날짜 (고정) | 타입 (가변) |
|-------------|-------------|-------------|-------------|
| [..]        | -           | -           | -           |
| 📁 folder1  | -           | 2025-01-15  | 폴더        |
| 📄 file.txt | 1.2 MB      | 2025-01-15  | 텍스트      |

### 컬럼 Width 설정

- **이름**: `minWidth: 150px`, `maxWidth: 400px`
- **크기**: `minWidth: 80px`, `maxWidth: 120px`
- **날짜**: `width: 110px` (고정)
- **타입**: `minWidth: 80px`, `maxWidth: 150px`

### 텍스트 오버플로우

- 한 줄로 표현
- 넘치는 텍스트는 `...` (ellipsis)
- **Hover 시 Tooltip 표시**:
  - 전체 텍스트 표시
  - 200ms 딜레이 후 표시
  - 파일/폴더 이름, 경로 등에 적용

### 정렬

- 각 컬럼 헤더 클릭으로 정렬
- 오름차순/내림차순 토글
- 폴더 우선, 그 다음 파일

### 특수 항목

- `[..]` (상위 폴더): 항상 최상단 고정
- 더블클릭 시 상위 폴더로 이동

---

## 파일 선택

### 선택 방식

- **일반 클릭**: 단일 선택
- **Ctrl+클릭**: 다중 선택 (토글)
- **Shift+클릭**: 범위 선택
- **Ctrl+A**: 전체 선택

### 시각적 피드백

- **선택된 파일**: 배경색 변경 (primary color)
- **Hover**: 약한 배경색
- **선택 개수 표시**: "3 items selected"

---

## 파일 작업

### 더블클릭

- **폴더**: 해당 폴더 열기
- **파일**: 동작 없음

### 드래그 앤 드롭

**Local → Remote:**
1. 로컬 파일 선택 후 드래그
2. 드래그 중인 파일 개수 표시 (예: "2 files")
3. Remote 패널 하이라이트 (드롭 가능 영역)
4. Remote 패널에 드롭 시 업로드 시작
5. 전송 큐에 추가

**Remote → Local:**
1. 원격 파일 선택 후 드래그
2. 드래그 중인 파일 개수 표시
3. Local 패널 하이라이트
4. Local 패널에 드롭 시 다운로드 시작
5. 전송 큐에 추가

### 버튼/단축키 작업

**새 폴더 (+📁):**
1. 버튼 클릭
2. Dialog 표시: "Folder name" 입력
3. 확인 시 현재 디렉토리에 폴더 생성
4. 실패 시 Toast 메시지

**새 파일 (+📄):**
1. 버튼 클릭
2. Dialog 표시: "File name" 입력 (기본 확장자 .txt)
3. 확인 시 현재 디렉토리에 빈 파일 생성
4. 실패 시 Toast 메시지

**삭제 (🗑️ / Delete):**
1. 파일 선택 후 버튼 클릭 또는 Delete 키
2. Confirm Dialog: "Delete N items?"
3. 확인 시 삭제
4. 실패 시 Toast 메시지

**이름 변경 (✏️ / F2):**
1. 파일 선택 후 버튼 클릭 또는 F2 키
2. Inline 편집 또는 Dialog 표시
3. 새 이름 입력 후 확인
4. 실패 시 Toast 메시지

**새로고침 (↻ / F5):**
1. 버튼 클릭 또는 F5 키
2. 현재 디렉토리 다시 로드
3. 로딩 상태 표시

---

## 전송 관리

### 전송 큐 UI (하단 패널)

```
Transfer Queue                                    [Clear All]
──────────────────────────────────────────────────────────────
↓ /path/to/file.txt → server:/remote/path/file.txt
  [██████░░░░] 45%    1.2MB/s    00:15 left    [⏸] [✕]

↑ server:/remote/image.png → /local/path/image.png
  [██████████] Done   2.5MB/s                   [✓]

✕ /path/error.txt → server:/remote/error.txt
  Failed: Permission denied                     [🔄] [✕]
```

### 전송 항목 정보

**표시 정보:**
- **방향 아이콘**:
  - ↓ 다운로드 (Remote → Local)
  - ↑ 업로드 (Local → Remote)
- **경로**: `source → target` (긴 경로는 ellipsis + tooltip)
- **진행률 바**: 시각적 진행 상태
- **퍼센트**: 0-100%
- **전송 속도**: MB/s, KB/s
- **남은 시간**: "00:15 left" (진행 중일 때)

### 상태별 컨트롤

**진행 중 (Transferring):**
- [⏸ 일시정지] [✕ 취소]

**일시정지 (Paused):**
- [▶️ 재개] [✕ 취소]

**완료 (Completed):**
- [✓] 표시
- [✕ 제거] (큐에서 제거)

**실패 (Failed):**
- [🔄 재시도] [✕ 제거]
- 에러 메시지 표시

### 덮어쓰기 옵션 Dialog

기존 파일이 있을 때:

```
┌─────────────────────────────────────┐
│ File already exists                 │
├─────────────────────────────────────┤
│ file.txt already exists.            │
│                                     │
│ Source: 1.2MB  2025-01-15 10:30    │
│ Target: 0.8MB  2025-01-10 14:20    │
│                                     │
│ [Overwrite] [Skip] [Rename] [Cancel]│
│                                     │
│ ☑ Apply to all conflicts            │
└─────────────────────────────────────┘
```

**옵션:**
- **Overwrite**: 기존 파일 덮어쓰기
- **Skip**: 건너뛰기
- **Rename**: 새 이름으로 저장 (예: file (1).txt)
- **Cancel**: 전송 취소
- **Apply to all**: 모든 충돌에 동일하게 적용

---

## 상태 & 피드백

### 로딩 상태

- **디렉토리 로딩 중**: 스피너 표시
- **파일 리스트 로딩**: 스켈레톤 UI
- **연결 중**: "Connecting to server..." 메시지

### 빈 상태

- **빈 폴더**: "Empty folder" 메시지 + 아이콘
- **연결 전**: "Connect to SFTP server to browse files"

### 에러 처리

- **연결 실패**: Toast 메시지 + 에러 상세
- **전송 실패**: 전송 큐에 에러 표시 + 재시도 버튼
- **파일 작업 실패**: Toast 메시지
- **권한 오류**: "Permission denied" 명확한 메시지

---

## 구현 구조

### Frontend

```
src/components/sftp/
  ├── SFTPPanel.tsx              # 메인 듀얼 패널 컨테이너
  ├── FileExplorer.tsx           # 단일 패널 (로컬/리모트)
  ├── FileListTable.tsx          # 파일 테이블
  ├── FileRow.tsx                # 파일 행 (tooltip 포함)
  ├── Breadcrumb.tsx             # 경로 네비게이션
  ├── TransferQueue.tsx          # 전송 큐 UI
  ├── TransferItem.tsx           # 개별 전송 항목
  ├── NewFolderDialog.tsx        # 새 폴더 생성
  ├── NewFileDialog.tsx          # 새 파일 생성
  ├── RenameDialog.tsx           # 이름 변경
  ├── DeleteConfirmDialog.tsx    # 삭제 확인
  ├── OverwriteDialog.tsx        # 덮어쓰기 옵션
  └── SFTPConnectionDialog.tsx   # SFTP 연결 다이얼로그

src/components/connection/
  └── SFTPConnectionCard.tsx     # 홈 화면 SFTP 카드

src/hooks/
  ├── use-sftp.ts                # SFTP 연결 관리
  ├── use-file-transfer.ts       # 파일 전송 로직
  └── use-file-selection.ts      # 파일 선택 로직

src/stores/
  ├── use-sftp-store.ts          # SFTP 상태 관리
  └── use-sftp-profile-store.ts  # SFTP 프로필 관리

src/types/
  └── sftp.ts                    # SFTP 타입 정의
```

### Backend

```
src-tauri/src/sftp/
  ├── mod.rs
  ├── manager.rs                 # SFTP 세션 관리자
  ├── session.rs                 # SFTP 세션 (ssh2-rs 사용)
  └── types.rs                   # 타입 정의

src-tauri/src/commands/
  └── sftp_commands.rs           # SFTP Tauri 커맨드
```

### 주요 Tauri 커맨드

```rust
// 연결
connect_sftp(config: SFTPConfig) -> Result<String, String> // session_id

// 프로필 관리
save_sftp_profile(profile: SFTPProfile) -> Result<(), String>
load_sftp_profiles() -> Result<Vec<SFTPProfile>, String>
delete_sftp_profile(profile_id: String) -> Result<(), String>

// 파일 탐색
list_remote_directory(session_id: String, path: String) -> Result<Vec<FileEntry>, String>
list_local_directory(path: String) -> Result<Vec<FileEntry>, String>

// 파일 작업
create_remote_folder(session_id: String, path: String, name: String) -> Result<(), String>
create_remote_file(session_id: String, path: String, name: String) -> Result<(), String>
delete_remote_file(session_id: String, path: String) -> Result<(), String>
rename_remote_file(session_id: String, old_path: String, new_path: String) -> Result<(), String>

// 로컬 파일 작업
create_local_folder(path: String, name: String) -> Result<(), String>
create_local_file(path: String, name: String) -> Result<(), String>
delete_local_file(path: String) -> Result<(), String>
rename_local_file(old_path: String, new_path: String) -> Result<(), String>

// 파일 전송 (이벤트 기반)
upload_file(session_id: String, local_path: String, remote_path: String) -> Result<String, String> // transfer_id
download_file(session_id: String, remote_path: String, local_path: String) -> Result<String, String> // transfer_id
cancel_transfer(transfer_id: String) -> Result<(), String>
pause_transfer(transfer_id: String) -> Result<(), String>
resume_transfer(transfer_id: String) -> Result<(), String>

// 연결 종료
disconnect_sftp(session_id: String) -> Result<(), String>
```

### Tauri 이벤트

```rust
// 전송 진행률 이벤트
"sftp://transfer-progress" {
  transfer_id: String,
  progress: u32, // 0-100
  speed: u64, // bytes/sec
  bytes_transferred: u64,
  total_bytes: u64,
}

// 전송 완료 이벤트
"sftp://transfer-complete" {
  transfer_id: String,
}

// 전송 실패 이벤트
"sftp://transfer-failed" {
  transfer_id: String,
  error: String,
}
```

---

## 타입 정의

### Frontend (TypeScript)

```typescript
// src/types/sftp.ts

export type AuthMethod =
  | { type: 'password'; password: string }
  | { type: 'privateKey'; keyPath: string; passphrase?: string }
  | { type: 'interactive' };

export interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  authMethod: AuthMethod;
}

export interface SFTPProfile {
  id: string;
  name: string;
  config: SFTPConfig;
  authMethodType: 'password' | 'privateKey' | 'interactive';
  createdAt: string;
  lastConnected?: string;
}

export interface FileEntry {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  modifiedAt: string;
  fileType: string;
  permissions?: string; // Unix permissions (예: "rwxr-xr-x")
}

export interface TransferTask {
  id: string;
  direction: 'upload' | 'download';
  sourcePath: string;
  targetPath: string;
  status: 'pending' | 'transferring' | 'paused' | 'completed' | 'failed';
  progress: number; // 0-100
  speed: number; // bytes/sec
  bytesTransferred: number;
  totalBytes: number;
  error?: string;
}

export interface SFTPSession {
  id: string;
  profile: SFTPProfile;
  currentRemotePath: string;
  currentLocalPath: string;
  remoteFiles: FileEntry[];
  localFiles: FileEntry[];
  selectedRemoteFiles: string[]; // file paths
  selectedLocalFiles: string[]; // file paths
  transfers: TransferTask[];
  isConnected: boolean;
}
```

### Backend (Rust)

```rust
// src-tauri/src/sftp/types.rs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum AuthMethod {
    Password(String),
    PrivateKey {
        path: String,
        passphrase: Option<String>,
    },
    Interactive,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SFTPConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: AuthMethod,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SFTPProfile {
    pub id: String,
    pub name: String,
    pub config: SFTPConfig,
    pub auth_method_type: String, // "password" | "privateKey" | "interactive"
    pub created_at: String,
    pub last_connected: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_directory: bool,
    pub modified_at: String,
    pub file_type: String,
    pub permissions: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferProgress {
    pub transfer_id: String,
    pub progress: u32, // 0-100
    pub speed: u64, // bytes/sec
    pub bytes_transferred: u64,
    pub total_bytes: u64,
}
```

---

## Task List

### Phase 1: Backend - SFTP 기본 구조

**1.1 Rust 타입 정의**
- [ ] `src-tauri/src/sftp/types.rs` 생성
  - [ ] `AuthMethod` enum 정의
  - [ ] `SFTPConfig` struct 정의
  - [ ] `SFTPProfile` struct 정의
  - [ ] `FileEntry` struct 정의
  - [ ] `TransferProgress` struct 정의

**1.2 SFTP Session 구현**
- [ ] `src-tauri/src/sftp/session.rs` 생성
  - [ ] `ssh2` 크레이트 사용하여 SFTP 세션 구현
  - [ ] 인증 메서드별 연결 로직 (Password/PrivateKey/Interactive)
  - [ ] `list_directory()` 구현
  - [ ] `create_folder()` 구현
  - [ ] `create_file()` 구현
  - [ ] `delete_file()` 구현
  - [ ] `rename_file()` 구현
  - [ ] 파일 업로드/다운로드 기본 구조

**1.3 SFTP Manager 구현**
- [ ] `src-tauri/src/sftp/manager.rs` 생성
  - [ ] 세션 관리 (HashMap<String, SFTPSession>)
  - [ ] 세션 생성/종료 로직
  - [ ] 전역 Manager 인스턴스 (Mutex)

**1.4 SFTP 커맨드**
- [ ] `src-tauri/src/commands/sftp_commands.rs` 생성
  - [ ] `connect_sftp()` 커맨드
  - [ ] `disconnect_sftp()` 커맨드
  - [ ] `list_remote_directory()` 커맨드
  - [ ] `list_local_directory()` 커맨드
  - [ ] `create_remote_folder()` 커맨드
  - [ ] `create_remote_file()` 커맨드
  - [ ] `delete_remote_file()` 커맨드
  - [ ] `rename_remote_file()` 커맨드
  - [ ] 로컬 파일 작업 커맨드 (create/delete/rename)

**1.5 Tauri 통합**
- [ ] `src-tauri/src/main.rs`에 커맨드 등록
- [ ] 의존성 추가 (`Cargo.toml`):
  - [ ] `ssh2` 크레이트
  - [ ] 필요한 추가 크레이트

---

### Phase 2: Backend - 파일 전송

**2.1 파일 전송 기본 구조**
- [ ] `src-tauri/src/sftp/transfer.rs` 생성 (선택)
  - [ ] 전송 태스크 관리 구조
  - [ ] 전송 ID 생성 (UUID)
  - [ ] 전송 상태 관리

**2.2 업로드 구현**
- [ ] `upload_file()` 커맨드
  - [ ] 파일 읽기 (로컬)
  - [ ] 청크 단위 업로드
  - [ ] 진행률 계산 및 이벤트 발송
  - [ ] 에러 처리

**2.3 다운로드 구현**
- [ ] `download_file()` 커맨드
  - [ ] 파일 읽기 (원격)
  - [ ] 청크 단위 다운로드
  - [ ] 진행률 계산 및 이벤트 발송
  - [ ] 에러 처리

**2.4 전송 제어**
- [ ] `cancel_transfer()` 커맨드
- [ ] `pause_transfer()` 커맨드
- [ ] `resume_transfer()` 커맨드

**2.5 이벤트 시스템**
- [ ] `sftp://transfer-progress` 이벤트
- [ ] `sftp://transfer-complete` 이벤트
- [ ] `sftp://transfer-failed` 이벤트

---

### Phase 3: Backend - 프로필 관리

**3.1 프로필 저장/로드**
- [ ] 프로필 저장 경로 설정 (앱 데이터 디렉토리)
- [ ] `save_sftp_profile()` 커맨드
- [ ] `load_sftp_profiles()` 커맨드
- [ ] `delete_sftp_profile()` 커맨드
- [ ] JSON 직렬화/역직렬화

**3.2 Keyring 통합**
- [ ] 비밀번호 Keyring 저장 (기존 keyring 모듈 활용)
- [ ] Passphrase Keyring 저장
- [ ] 프로필 로드 시 Keyring에서 비밀번호 가져오기

---

### Phase 4: Frontend - 타입 및 Store

**4.1 TypeScript 타입 정의**
- [ ] `src/types/sftp.ts` 생성
  - [ ] `AuthMethod` 타입
  - [ ] `SFTPConfig` 인터페이스
  - [ ] `SFTPProfile` 인터페이스
  - [ ] `FileEntry` 인터페이스
  - [ ] `TransferTask` 인터페이스
  - [ ] `SFTPSession` 인터페이스

**4.2 Zustand Store**
- [ ] `src/stores/use-sftp-store.ts` 생성
  - [ ] 세션 상태 관리
  - [ ] 파일 리스트 관리 (로컬/원격)
  - [ ] 선택된 파일 관리
  - [ ] 현재 경로 관리
  - [ ] 액션: `connect()`, `disconnect()`, `loadFiles()`, 등

- [ ] `src/stores/use-sftp-profile-store.ts` 생성
  - [ ] 프로필 목록 관리
  - [ ] 액션: `loadProfiles()`, `saveProfile()`, `deleteProfile()`

- [ ] `src/stores/use-transfer-store.ts` 생성
  - [ ] 전송 큐 관리
  - [ ] 전송 상태 업데이트
  - [ ] 액션: `addTransfer()`, `updateProgress()`, `removeTransfer()`

---

### Phase 5: Frontend - 연결 UI

**5.1 SFTP Connection Dialog**
- [ ] `src/components/sftp/SFTPConnectionDialog.tsx` 생성
  - [ ] Shadcn Dialog 사용
  - [ ] Host, Port, Username 입력 필드
  - [ ] Authentication Method 선택 (Tabs 또는 Select)
  - [ ] Password 입력 필드
  - [ ] Private Key 파일 선택 (파일 브라우저)
  - [ ] Passphrase 입력 필드
  - [ ] "Save to Keyring" 체크박스
  - [ ] "Save as Profile" 체크박스
  - [ ] Profile Name 입력 필드
  - [ ] Connect 버튼 (로딩 상태 표시)
  - [ ] 에러 메시지 표시

**5.2 SFTP Hook**
- [ ] `src/hooks/use-sftp.ts` 생성
  - [ ] `connectSFTP()` 함수
  - [ ] `disconnectSFTP()` 함수
  - [ ] Tauri 커맨드 호출
  - [ ] Store 업데이트

---

### Phase 6: Frontend - Command Palette 통합

**6.1 Command Palette 수정**
- [ ] `src/components/command/CommandPalette.tsx` 수정
  - [ ] "SFTP" 옵션 추가
  - [ ] 선택 시 SFTP Connection Dialog 열기

**6.2 탭 통합**
- [ ] `src/stores/use-tab-store.ts` 수정
  - [ ] SFTP 탭 타입 추가 (`type: 'sftp'`)
  - [ ] SFTP 세션 정보 포함

- [ ] `src/App.tsx` 또는 `MainLayout.tsx` 수정
  - [ ] SFTP 탭 렌더링 로직

---

### Phase 7: Frontend - 홈 화면 프로필 카드

**7.1 SFTP Connection Card**
- [ ] `src/components/connection/SFTPConnectionCard.tsx` 생성
  - [ ] 카드 레이아웃 (Shadcn Card)
  - [ ] 프로필 이름, 연결 정보 표시
  - [ ] 인증 방식 아이콘 표시
  - [ ] Connect, Edit, Delete 버튼
  - [ ] Edit 버튼 클릭 시 Connection Dialog 열기
  - [ ] Delete 버튼 클릭 시 확인 Dialog

**7.2 홈 화면 통합**
- [ ] `src/components/home/Home.tsx` 수정
  - [ ] SFTP 프로필 카드 렌더링
  - [ ] SSH 카드와 구분 (뱃지/아이콘)
  - [ ] 프로필 로드

---

### Phase 8: Frontend - 파일 탐색 UI

**8.1 Breadcrumb 컴포넌트**
- [ ] `src/components/sftp/Breadcrumb.tsx` 생성
  - [ ] 경로 파싱 및 표시
  - [ ] 클릭 가능한 경로 단계
  - [ ] 각 단계 클릭 시 경로 이동

**8.2 File List Table**
- [ ] `src/components/sftp/FileListTable.tsx` 생성
  - [ ] Shadcn Table 사용
  - [ ] 컬럼: 이름, 크기, 날짜, 타입
  - [ ] 컬럼 width 설정 (min/max)
  - [ ] 정렬 기능 (컬럼 헤더 클릭)
  - [ ] `[..]` 상위 폴더 항목

**8.3 File Row**
- [ ] `src/components/sftp/FileRow.tsx` 생성
  - [ ] 파일/폴더 아이콘
  - [ ] 텍스트 ellipsis 처리
  - [ ] Hover 시 Tooltip (Shadcn Tooltip)
  - [ ] 선택 상태 표시
  - [ ] 클릭 이벤트 처리

**8.4 File Explorer (단일 패널)**
- [ ] `src/components/sftp/FileExplorer.tsx` 생성
  - [ ] 툴바 (홈, 새로고침, 새 폴더, 새 파일, 이름 변경, 삭제)
  - [ ] Breadcrumb
  - [ ] FileListTable
  - [ ] 로딩 상태 (스켈레톤 UI)
  - [ ] 빈 상태 메시지
  - [ ] 에러 상태

**8.5 파일 선택 Hook**
- [ ] `src/hooks/use-file-selection.ts` 생성
  - [ ] 클릭/Ctrl+클릭/Shift+클릭 로직
  - [ ] 선택 상태 관리
  - [ ] Ctrl+A 전체 선택

---

### Phase 9: Frontend - 듀얼 패널

**9.1 SFTP Panel (메인)**
- [ ] `src/components/sftp/SFTPPanel.tsx` 생성
  - [ ] 듀얼 패널 레이아웃 (좌: 로컬, 우: 원격)
  - [ ] 좌측: Local FileExplorer
  - [ ] 우측: Remote FileExplorer
  - [ ] 연결 정보 헤더
  - [ ] 닫기 버튼

---

### Phase 10: Frontend - 파일 작업 Dialogs

**10.1 New Folder Dialog**
- [ ] `src/components/sftp/NewFolderDialog.tsx` 생성
  - [ ] Shadcn Dialog
  - [ ] 폴더명 입력 필드
  - [ ] 확인/취소 버튼
  - [ ] Tauri 커맨드 호출
  - [ ] 성공 시 파일 리스트 새로고침
  - [ ] 실패 시 Toast

**10.2 New File Dialog**
- [ ] `src/components/sftp/NewFileDialog.tsx` 생성
  - [ ] 파일명 입력 (기본 .txt)
  - [ ] 동일 구조

**10.3 Rename Dialog**
- [ ] `src/components/sftp/RenameDialog.tsx` 생성
  - [ ] 기존 이름 표시
  - [ ] 새 이름 입력
  - [ ] 동일 구조

**10.4 Delete Confirm Dialog**
- [ ] `src/components/sftp/DeleteConfirmDialog.tsx` 생성
  - [ ] 삭제 확인 메시지
  - [ ] 선택된 파일 개수 표시
  - [ ] 확인/취소

---

### Phase 11: Frontend - 드래그 앤 드롭

**11.1 드래그 앤 드롭 Hook**
- [ ] `src/hooks/use-file-drag-drop.ts` 생성
  - [ ] `onDragStart` 핸들러
  - [ ] `onDragOver` 핸들러
  - [ ] `onDrop` 핸들러
  - [ ] 드래그 중 시각화 (파일 개수)
  - [ ] 드롭 영역 하이라이트

**11.2 FileExplorer에 드래그 앤 드롭 통합**
- [ ] FileRow에 draggable 속성
- [ ] FileExplorer에 drop zone 설정
- [ ] 드롭 시 전송 시작

---

### Phase 12: Frontend - 파일 전송 UI

**12.1 Transfer Item**
- [ ] `src/components/sftp/TransferItem.tsx` 생성
  - [ ] 방향 아이콘 (↓/↑)
  - [ ] 경로 표시 (ellipsis + tooltip)
  - [ ] 진행률 바 (Shadcn Progress)
  - [ ] 퍼센트, 속도, 남은 시간
  - [ ] 상태별 버튼 (일시정지/재개/취소/재시도)

**12.2 Transfer Queue**
- [ ] `src/components/sftp/TransferQueue.tsx` 생성
  - [ ] 하단 패널 레이아웃
  - [ ] TransferItem 리스트
  - [ ] Clear All 버튼
  - [ ] 접기/펼치기 기능 (선택)

**12.3 File Transfer Hook**
- [ ] `src/hooks/use-file-transfer.ts` 생성
  - [ ] `uploadFile()` 함수
  - [ ] `downloadFile()` 함수
  - [ ] `cancelTransfer()` 함수
  - [ ] `pauseTransfer()` 함수
  - [ ] `resumeTransfer()` 함수
  - [ ] 이벤트 리스너 (`sftp://transfer-progress`, 등)
  - [ ] Store 업데이트

**12.4 Overwrite Dialog**
- [ ] `src/components/sftp/OverwriteDialog.tsx` 생성
  - [ ] 파일 정보 비교 (크기, 날짜)
  - [ ] 옵션: Overwrite, Skip, Rename, Cancel
  - [ ] "Apply to all" 체크박스
  - [ ] 선택에 따라 전송 로직 처리

---

### Phase 13: 통합 및 테스트

**13.1 기능 통합**
- [ ] 모든 컴포넌트 연결
- [ ] 탭 시스템 통합
- [ ] Command Palette 최종 확인
- [ ] 홈 화면 프로필 카드 최종 확인

**13.2 키보드 단축키**
- [ ] F5: 새로고침
- [ ] F2: 이름 변경
- [ ] Delete: 삭제
- [ ] Ctrl+A: 전체 선택

**13.3 에러 핸들링**
- [ ] 모든 Tauri 커맨드 에러 처리
- [ ] Toast 메시지 일관성 확인
- [ ] 네트워크 오류 처리
- [ ] 파일 권한 오류 처리

**13.4 UI/UX 개선**
- [ ] 로딩 상태 모든 곳에 적용
- [ ] 빈 상태 메시지
- [ ] Tooltip 모든 곳에 적용
- [ ] 반응형 레이아웃 확인
- [ ] 다크모드 테마 확인

**13.5 성능 최적화**
- [ ] 대용량 파일 전송 테스트
- [ ] 많은 파일이 있는 디렉토리 테스트
- [ ] 메모리 누수 확인
- [ ] 전송 속도 최적화

**13.6 수동 테스트**
- [ ] 연결 테스트 (Password/PrivateKey/Interactive)
- [ ] 파일 탐색 테스트
- [ ] 파일 작업 테스트 (생성/삭제/이름변경)
- [ ] 파일 전송 테스트 (업로드/다운로드)
- [ ] 전송 제어 테스트 (일시정지/재개/취소)
- [ ] 덮어쓰기 옵션 테스트
- [ ] 프로필 저장/로드 테스트
- [ ] 에러 시나리오 테스트

---

### Phase 14: 문서화

**14.1 CLAUDE.md 업데이트**
- [ ] SFTP 기능 추가
- [ ] 프로젝트 구조 업데이트
- [ ] 주요 파일 설명 추가

**14.2 주석 및 문서**
- [ ] 주요 함수에 주석 추가
- [ ] 타입 정의 문서화
- [ ] README 업데이트 (선택)

---

## 우선순위 요약

**MVP (최소 기능):**
1. Backend: SFTP 연결 및 기본 파일 탐색
2. Frontend: Connection Dialog, 듀얼 패널, 파일 리스트
3. 파일 전송: 업로드/다운로드, 진행률 표시

**Phase 2:**
1. 파일 작업: 새 폴더/파일, 삭제, 이름 변경
2. 프로필 관리: 저장/로드, 홈 화면 카드
3. 드래그 앤 드롭

**Phase 3:**
1. 전송 제어: 일시정지/재개/취소
2. 덮어쓰기 옵션
3. UX 개선: Tooltip, 로딩 상태, 에러 처리

---

**문서 끝**
