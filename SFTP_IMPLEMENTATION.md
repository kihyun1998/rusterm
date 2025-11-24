# SFTP 기능 구현 계획서

## 📋 개요

RusTerm에 SFTP (SSH File Transfer Protocol) 기능을 추가하여 로컬과 원격 파일 시스템 간 파일 전송을 지원합니다.

### 주요 기능

- **Dual Panel 파일 브라우저**: 좌측(로컬) / 우측(원격) 패널 구조
- **Drag & Drop 파일 전송**: 양방향 드래그 앤 드롭 지원
- **파일 관리**: 생성, 삭제, 이름 변경, 디렉토리 탐색
- **전송 모니터링**: 실시간 진행률 표시 및 전송 큐 관리
- **초기 경로**: 양쪽 모두 사용자 홈 디렉토리로 시작

### 제외 기능

- ~~파일/폴더 권한 변경 (chmod)~~ - 권한은 표시만

---

## 🏗️ 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────┐
│                    SFTP Tab                         │
├──────────────────────┬──────────────────────────────┤
│   Local Panel        │      Remote Panel            │
│  ┌──────────────┐    │    ┌──────────────┐          │
│  │ Path Nav     │    │    │ Path Nav     │          │
│  ├──────────────┤    │    ├──────────────┤          │
│  │ Toolbar      │    │    │ Toolbar      │          │
│  ├──────────────┤    │    ├──────────────┤          │
│  │              │    │    │              │          │
│  │  File List   │◄───┼───►│  File List   │          │
│  │              │    │    │              │          │
│  │  (Drop Zone) │    │    │  (Drop Zone) │          │
│  └──────────────┘    │    └──────────────┘          │
├──────────────────────┴──────────────────────────────┤
│          Transfer Panel (Collapsible)                │
│  ┌───────────────────────────────────────────────┐  │
│  │  [Upload] file1.txt    ████████░░ 80%         │  │
│  │  [Download] file2.jpg  ██████████ 100%        │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 데이터 플로우

```
Frontend (React)
  ↕ Tauri Commands
Backend (Rust)
  ├─ Local FS Module (std::fs)
  └─ SFTP Module (ssh2::Sftp)
```

---

## 📦 타입 정의

### Connection Types

**`src/types/connection.ts` 수정**

```typescript
export type ConnectionType = 'local' | 'ssh' | 'sftp';

export interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}
```

### SFTP Types

**`src/types/sftp.ts` 신규**

```typescript
export type FileSystemType = 'local' | 'remote';

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number; // bytes
  modified: number; // timestamp
  permissions?: string; // 표시만 (변경 불가)
}

export interface FileListResponse {
  path: string;
  files: FileInfo[];
}

export type TransferDirection = 'upload' | 'download';
export type TransferStatus = 'pending' | 'transferring' | 'completed' | 'failed' | 'cancelled';

export interface TransferProgress {
  bytes: number;
  totalBytes: number;
  percentage: number;
  speed?: number; // bytes/sec
}

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

## 🦀 Rust 백엔드 구현

### 1. 로컬 파일 시스템 모듈

**디렉토리 구조**
```
src-tauri/src/fs/
├── mod.rs
├── operations.rs
└── types.rs
```

**주요 함수** (`src-tauri/src/commands/fs_commands.rs`)

| 커맨드 | 설명 | 반환 타입 |
|--------|------|-----------|
| `get_user_home_dir()` | 사용자 홈 디렉토리 경로 | `Result<String>` |
| `list_local_directory(path: String)` | 디렉토리 목록 조회 | `Result<Vec<FileInfo>>` |
| `get_local_file_stats(path: String)` | 파일 정보 조회 | `Result<FileInfo>` |
| `create_local_directory(path: String)` | 폴더 생성 | `Result<()>` |
| `delete_local_file(path: String)` | 파일 삭제 | `Result<()>` |
| `delete_local_directory(path: String)` | 폴더 삭제 (재귀) | `Result<()>` |
| `rename_local_item(old_path: String, new_path: String)` | 이름 변경 | `Result<()>` |

**의존성**
```toml
[dependencies]
dirs = "5.0"  # 홈 디렉토리 조회
```

### 2. SFTP 모듈

**디렉토리 구조**
```
src-tauri/src/sftp/
├── mod.rs
├── manager.rs  # 세션 관리자
├── session.rs  # 개별 세션
└── types.rs    # 타입 정의
```

**주요 함수** (`src-tauri/src/commands/sftp_commands.rs`)

| 커맨드 | 설명 | 반환 타입 |
|--------|------|-----------|
| `create_sftp_session(config: SFTPConfig)` | SFTP 연결 생성 | `Result<String>` (sessionId) |
| `close_sftp_session(session_id: String)` | 연결 종료 | `Result<()>` |
| `get_remote_home_dir(session_id: String)` | 원격 홈 디렉토리 | `Result<String>` |
| `list_remote_directory(session_id: String, path: String)` | 목록 조회 | `Result<Vec<FileInfo>>` |
| `get_remote_file_stats(session_id: String, path: String)` | 파일 정보 | `Result<FileInfo>` |
| `create_remote_directory(session_id: String, path: String)` | 폴더 생성 | `Result<()>` |
| `delete_remote_file(session_id: String, path: String)` | 파일 삭제 | `Result<()>` |
| `delete_remote_directory(session_id: String, path: String)` | 폴더 삭제 | `Result<()>` |
| `rename_remote_item(session_id: String, old: String, new: String)` | 이름 변경 | `Result<()>` |
| `download_file(session_id: String, remote_path: String, local_path: String)` | 다운로드 | `Result<()>` |
| `upload_file(session_id: String, local_path: String, remote_path: String)` | 업로드 | `Result<()>` |

**의존성**
```toml
[dependencies]
ssh2 = "0.9"  # 이미 있음
```

---

## ⚛️ Frontend 구현

### 1. 상태 관리

**`src/stores/use-tab-store.ts` 수정**

```typescript
export type TabType = 'home' | 'terminal' | 'sftp';
```

**`src/stores/use-sftp-store.ts` 신규**

```typescript
interface PanelState {
  currentPath: string;
  files: FileInfo[];
  selectedFiles: Set<string>;
  loading: boolean;
}

interface SFTPStore {
  sessions: Record<string, {
    localPanel: PanelState;
    remotePanel: PanelState;
    sessionId: string;
  }>;

  transferQueue: TransferItem[];

  // Actions
  initSession: (tabId: string, sessionId: string, localHome: string, remoteHome: string) => void;
  setLocalPath: (tabId: string, path: string) => void;
  setRemotePath: (tabId: string, path: string) => void;
  setLocalFiles: (tabId: string, files: FileInfo[]) => void;
  setRemoteFiles: (tabId: string, files: FileInfo[]) => void;
  toggleLocalFileSelection: (tabId: string, filePath: string, multiSelect: boolean) => void;
  toggleRemoteFileSelection: (tabId: string, filePath: string, multiSelect: boolean) => void;
  clearLocalSelection: (tabId: string) => void;
  clearRemoteSelection: (tabId: string) => void;

  addTransfer: (item: TransferItem) => void;
  updateTransferProgress: (transferId: string, progress: TransferProgress) => void;
  updateTransferStatus: (transferId: string, status: TransferStatus) => void;
  removeTransfer: (transferId: string) => void;
}
```

### 2. 커스텀 훅

**`src/hooks/use-sftp.ts` 신규**

```typescript
// SFTP 연결
export function useSFTPConnection()

// 로컬 파일 목록
export function useLocalFileList(tabId: string)

// 원격 파일 목록
export function useRemoteFileList(tabId: string, sessionId: string)

// 로컬 파일 작업
export function useLocalFileOperations(tabId: string)

// 원격 파일 작업
export function useRemoteFileOperations(tabId: string, sessionId: string)

// 파일 전송
export function useSFTPTransfer(tabId: string, sessionId: string)
```

### 3. 컴포넌트 구조

```
src/components/
├── connection/
│   ├── NewSessionDialog.tsx          (수정: SFTP 탭 추가)
│   └── SFTPSessionForm.tsx           (신규)
│
└── sftp/
    ├── SFTPBrowser.tsx               (메인 컨테이너)
    ├── FilePanel.tsx                 (단일 패널)
    ├── PathBreadcrumb.tsx            (경로 네비게이션)
    ├── PanelToolbar.tsx              (패널 툴바)
    ├── FileList.tsx                  (파일 리스트)
    ├── FileListItem.tsx              (파일 아이템)
    ├── TransferPanel.tsx             (전송 패널)
    ├── TransferItem.tsx              (전송 아이템)
    └── FileContextMenu.tsx           (컨텍스트 메뉴)
```

### 4. Drag & Drop + Click 이벤트 처리

**핵심 전략: 이벤트 시퀀스 추적 + 임계값 기반 판별**

```typescript
// FileListItem.tsx
const DRAG_THRESHOLD = 5;        // px - 드래그 인식 최소 거리
const DOUBLE_CLICK_DELAY = 300;  // ms - 더블 클릭 인식 시간
const CLICK_DELAY = 200;         // ms - 싱글 클릭 확정 대기

handleMouseDown() {
  // 드래그 시작 위치 기록
}

handleMouseMove() {
  // 임계값 초과 시 드래그 모드
  if (distance > DRAG_THRESHOLD) {
    startDrag();
    cancelPendingClick();
  }
}

handleMouseUp() {
  // 드래그 중이었으면 클릭 무시
  if (wasDragging) return;

  // 더블 클릭 체크
  if (timeSinceLastClick < DOUBLE_CLICK_DELAY) {
    onOpen(); // 폴더 진입 또는 전송
  } else {
    // 싱글 클릭 대기
    setTimeout(() => onSelect(), CLICK_DELAY);
  }
}
```

**Drop Zone 처리**

```typescript
// FilePanel.tsx
handleDrop(e: React.DragEvent) {
  // Case 1: 반대편 패널에서 드래그
  const dragData = e.dataTransfer.getData('application/json');
  if (dragData) {
    const { file, fsType } = JSON.parse(dragData);
    if (fsType !== type) {
      transferFile(file);
    }
  }

  // Case 2: OS 파일 탐색기에서 드래그 (Remote 패널만)
  if (type === 'remote' && e.dataTransfer.files.length > 0) {
    uploadFiles(e.dataTransfer.files);
  }
}
```

### 5. 파일 아이콘

**`src/constants/file-icons.ts` 신규**

```typescript
import { File, FileText, FileCode, FileImage, Folder, FolderOpen } from 'lucide-react';

export function getFileIcon(file: FileInfo, isOpen = false) {
  if (file.isDirectory) {
    return isOpen ? FolderOpen : Folder;
  }

  const ext = file.name.split('.').pop()?.toLowerCase();

  // 확장자별 아이콘 매핑
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'rs', 'go'].includes(ext)) return FileCode;
  if (['txt', 'md', 'json', 'xml', 'yaml'].includes(ext)) return FileText;
  if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) return FileImage;

  return File;
}
```

---

## ✅ Task List

### Phase 1: 기본 타입 및 백엔드 구조

#### Task 1.1: 타입 정의
- [ ] `src/types/connection.ts`에 `'sftp'` 추가
- [ ] `src/types/sftp.ts` 생성 (FileInfo, TransferItem 등)

**테스트 방법:**
```bash
pnpm run build
# TypeScript 컴파일 에러 없이 통과하면 성공
```

#### Task 1.2: 로컬 파일 시스템 모듈 (Rust)
- [ ] `src-tauri/src/fs/` 디렉토리 생성
- [ ] `fs/types.rs` 작성 (FileInfo 등)
- [ ] `fs/operations.rs` 작성 (list_dir, create_dir 등)
- [ ] `fs/mod.rs` 작성

**테스트 방법:**
```bash
cd src-tauri
cargo build
# 컴파일 에러 없이 통과하면 성공
```

#### Task 1.3: 로컬 파일 시스템 커맨드 (Rust)
- [ ] `src-tauri/src/commands/fs_commands.rs` 생성
- [ ] `get_user_home_dir` 구현
- [ ] `list_local_directory` 구현
- [ ] `create_local_directory` 구현
- [ ] `delete_local_file` 구현
- [ ] `delete_local_directory` 구현
- [ ] `rename_local_item` 구현
- [ ] `src-tauri/src/main.rs`에 커맨드 등록

**테스트 방법:**
```bash
# 개발 모드 실행
pnpm tauri dev

# Browser Console에서 테스트
import { invoke } from '@tauri-apps/api/core';

// 홈 디렉토리 조회
const home = await invoke('get_user_home_dir');
console.log('Home:', home);

// 디렉토리 목록
const files = await invoke('list_local_directory', { path: home });
console.log('Files:', files);

// 폴더 생성 테스트
await invoke('create_local_directory', { path: home + '/test_folder' });

// 삭제 테스트
await invoke('delete_local_directory', { path: home + '/test_folder' });
```

#### Task 1.4: SFTP 모듈 (Rust)
- [ ] `src-tauri/src/sftp/` 디렉토리 생성
- [ ] `sftp/types.rs` 작성
- [ ] `sftp/session.rs` 작성 (SftpSession 구조체)
- [ ] `sftp/manager.rs` 작성 (전역 세션 관리)
- [ ] `sftp/mod.rs` 작성

**테스트 방법:**
```bash
cd src-tauri
cargo build
cargo test
# 컴파일 및 단위 테스트 통과하면 성공
```

#### Task 1.5: SFTP 커맨드 (Rust)
- [ ] `src-tauri/src/commands/sftp_commands.rs` 생성
- [ ] `create_sftp_session` 구현
- [ ] `close_sftp_session` 구현
- [ ] `get_remote_home_dir` 구현
- [ ] `list_remote_directory` 구현
- [ ] `create_remote_directory` 구현
- [ ] `delete_remote_file` 구현
- [ ] `delete_remote_directory` 구현
- [ ] `rename_remote_item` 구현
- [ ] `src-tauri/src/main.rs`에 커맨드 등록

**테스트 방법:**
```bash
pnpm tauri dev

# Browser Console에서 테스트 (SSH 서버 필요)
const sessionId = await invoke('create_sftp_session', {
  config: {
    host: 'test.rebex.net',  // 공개 테스트 서버
    port: 22,
    username: 'demo',
    password: 'password'
  }
});
console.log('Session ID:', sessionId);

const remoteHome = await invoke('get_remote_home_dir', { sessionId });
console.log('Remote home:', remoteHome);

const files = await invoke('list_remote_directory', {
  sessionId,
  path: remoteHome
});
console.log('Remote files:', files);

await invoke('close_sftp_session', { sessionId });
```

---

### Phase 2: Frontend 기본 구조

#### Task 2.1: Tab Store 수정
- [ ] `src/stores/use-tab-store.ts`에 `'sftp'` 타입 추가

**테스트 방법:**
```bash
pnpm run build
# TypeScript 에러 없이 통과
```

#### Task 2.2: SFTP Store 생성
- [ ] `src/stores/use-sftp-store.ts` 생성
- [ ] PanelState, SFTPStore 인터페이스 정의
- [ ] Zustand store 구현

**테스트 방법:**
```typescript
// src/test-sftp-store.ts (임시 테스트 파일)
import { useSFTPStore } from './stores/use-sftp-store';

const store = useSFTPStore.getState();
store.initSession('test-tab', 'test-session', '/home/user', '/home/remote');

console.log('Sessions:', store.sessions);
// 출력 확인 후 테스트 파일 삭제
```

#### Task 2.3: SFTP 훅 생성
- [ ] `src/hooks/use-sftp.ts` 생성
- [ ] `useSFTPConnection` 구현
- [ ] `useLocalFileList` 구현
- [ ] `useRemoteFileList` 구현
- [ ] `useLocalFileOperations` 구현
- [ ] `useRemoteFileOperations` 구현
- [ ] `useSFTPTransfer` 구현 (기본 구조만)

**테스트 방법:**
```bash
pnpm run build
# TypeScript 에러 없이 통과
```

---

### Phase 3: NewSessionDialog SFTP 탭 추가

#### Task 3.1: NewSessionDialog 수정
- [x] `TabsList`를 `grid-cols-3`로 변경
- [x] SFTP 탭 추가 (아이콘: FolderOpen)
- [x] selectedProtocol 상태에 'sftp' 지원

**테스트 방법:**
```bash
pnpm tauri dev
# 앱 실행 → Home → "New Session" 클릭
# Local, SSH, SFTP 3개 탭이 보이면 성공
```

#### Task 3.2: SFTPSessionForm 생성
- [x] `src/components/connection/SFTPSessionForm.tsx` 생성
- [x] SSHSessionForm과 유사한 UI 구현
- [x] 연결 프로필 저장 기능 통합
- [x] 저장 후 SFTP 탭 열기

**테스트 방법:**
```bash
pnpm tauri dev
# New Session → SFTP 탭 선택
# 폼이 표시되고 입력 가능하면 성공
# 임시로 "Test Connection" 버튼 추가해서 연결 테스트
```

#### Task 3.3: 연결 프로필 스토어 통합
- [x] `use-connection-profile-store.ts`에서 SFTP 타입 지원
- [x] SFTP 프로필 저장/로드 테스트

**테스트 방법:**
```bash
pnpm tauri dev
# New Session → SFTP → 프로필 생성 및 저장
# Home에서 저장된 SFTP 프로필이 보이면 성공
# 클릭 시 SFTP 탭이 열리는지 확인
```

---

### Phase 4: SFTP 컴포넌트 (기본 UI)

#### Task 4.1: 파일 아이콘 상수
- [ ] `src/constants/file-icons.ts` 생성
- [ ] `getFileIcon()` 함수 구현

**테스트 방법:**
```typescript
// 임시 테스트 컴포넌트에서
const testFiles: FileInfo[] = [
  { name: 'test.ts', isDirectory: false, ... },
  { name: 'folder', isDirectory: true, ... },
  { name: 'image.png', isDirectory: false, ... },
];

testFiles.forEach(file => {
  const Icon = getFileIcon(file);
  console.log(file.name, Icon.displayName);
});
```

#### Task 4.2: PathBreadcrumb 컴포넌트
- [ ] `src/components/sftp/PathBreadcrumb.tsx` 생성
- [ ] 경로를 '/' 기준으로 분할하여 breadcrumb 표시
- [ ] 각 세그먼트 클릭 시 해당 경로로 이동
- [ ] Home 버튼 추가

**테스트 방법:**
```bash
# Storybook이나 별도 테스트 페이지에서
<PathBreadcrumb
  path="/home/user/documents/projects"
  onNavigate={(path) => console.log('Navigate to:', path)}
  onHome={() => console.log('Go home')}
/>
# 각 세그먼트 클릭 시 콘솔에 경로 출력되면 성공
```

#### Task 4.3: FileListItem 컴포넌트
- [ ] `src/components/sftp/FileListItem.tsx` 생성
- [ ] Drag & Drop + Click 이벤트 처리 구현
- [ ] 체크박스, 아이콘, 이름, 크기, 수정일 표시

**테스트 방법:**
```tsx
// 테스트 페이지
const [selected, setSelected] = useState(false);

<FileListItem
  file={{ name: 'test.txt', size: 1024, ... }}
  selected={selected}
  fsType="local"
  onSelect={() => setSelected(!selected)}
  onOpen={() => console.log('Open!')}
  onDragStart={(file) => console.log('Drag:', file.name)}
/>

// 싱글 클릭 → 선택 상태 토글
// 더블 클릭 → 콘솔에 "Open!" 출력
// 드래그 → 콘솔에 "Drag: test.txt" 출력
```

#### Task 4.4: FileList 컴포넌트
- [ ] `src/components/sftp/FileList.tsx` 생성
- [ ] 헤더 (Name, Size, Modified)
- [ ] FileListItem 리스트 렌더링
- [ ] 전체 선택 체크박스

**테스트 방법:**
```tsx
const testFiles: FileInfo[] = [
  { name: 'folder1', isDirectory: true, size: 0, modified: Date.now() },
  { name: 'file1.txt', isDirectory: false, size: 2048, modified: Date.now() },
];

<FileList
  files={testFiles}
  selectedFiles={new Set()}
  onSelectFile={(path) => console.log('Select:', path)}
  onOpenFile={(path) => console.log('Open:', path)}
  onDragStart={(file) => console.log('Drag:', file.name)}
/>

// 파일 목록이 표시되고 클릭/드래그 동작하면 성공
```

#### Task 4.5: PanelToolbar 컴포넌트
- [ ] `src/components/sftp/PanelToolbar.tsx` 생성
- [ ] 버튼: Refresh, New Folder, Delete, Rename, Transfer
- [ ] 선택 항목 수 표시

**테스트 방법:**
```tsx
<PanelToolbar
  selectedCount={3}
  onRefresh={() => console.log('Refresh')}
  onNewFolder={() => console.log('New folder')}
  onDelete={() => console.log('Delete')}
  onRename={() => console.log('Rename')}
  onTransfer={() => console.log('Transfer')}
/>

// 각 버튼 클릭 시 콘솔 출력되면 성공
```

#### Task 4.6: FilePanel 컴포넌트
- [ ] `src/components/sftp/FilePanel.tsx` 생성
- [ ] PathBreadcrumb + PanelToolbar + FileList 조합
- [ ] Drop Zone 구현
- [ ] 로딩 상태 표시

**테스트 방법:**
```tsx
<FilePanel
  sessionId="test"
  type="local"
  title="Local"
  currentPath="/home/user"
  files={testFiles}
  selectedFiles={new Set()}
  loading={false}
  onNavigate={(path) => console.log('Navigate:', path)}
  onTransfer={(file) => console.log('Transfer:', file.name)}
/>

// 패널이 표시되고 파일 목록, 툴바가 보이면 성공
// 외부에서 파일 드래그 앤 드롭 시 콘솔 출력 확인
```

---

### Phase 5: SFTP 브라우저 통합

#### Task 5.1: SFTPBrowser 메인 컴포넌트
- [ ] `src/components/sftp/SFTPBrowser.tsx` 생성
- [ ] Dual Panel 레이아웃 구현 (grid-cols-2)
- [ ] 좌측: Local Panel, 우측: Remote Panel
- [ ] SFTP 연결 생성 및 초기화
- [ ] 양쪽 홈 디렉토리 로드

**테스트 방법:**
```bash
pnpm tauri dev
# 저장된 SFTP 프로필 클릭하여 탭 열기
# 좌우 패널이 표시되고 양쪽 모두 홈 디렉토리 파일 목록이 보이면 성공
# 연결 실패 시 에러 메시지 표시 확인
```

#### Task 5.2: 디렉토리 탐색 기능
- [ ] 로컬 패널에서 폴더 더블 클릭 시 진입
- [ ] 원격 패널에서 폴더 더블 클릭 시 진입
- [ ] Breadcrumb 클릭 시 해당 경로로 이동
- [ ] Home 버튼 클릭 시 홈으로 복귀

**테스트 방법:**
```bash
# SFTP 탭에서
# 1. 로컬 패널에서 폴더 더블 클릭 → 파일 목록 변경 확인
# 2. 원격 패널에서 폴더 더블 클릭 → 파일 목록 변경 확인
# 3. Breadcrumb 중간 경로 클릭 → 해당 경로로 이동 확인
# 4. Home 버튼 클릭 → 홈 디렉토리로 복귀 확인
```

#### Task 5.3: 파일 선택 기능
- [ ] 싱글 클릭으로 파일 선택/해제
- [ ] Ctrl+Click으로 다중 선택
- [ ] 전체 선택 체크박스
- [ ] 선택 항목 수 표시

**테스트 방법:**
```bash
# SFTP 탭에서
# 1. 파일 클릭 → 선택 상태 토글 (배경색 변경)
# 2. Ctrl+Click으로 여러 파일 선택
# 3. 전체 선택 체크박스 클릭 → 모든 파일 선택/해제
# 4. 툴바에서 선택 항목 수 확인 (예: "3 items selected")
```

#### Task 5.4: MainLayout 통합
- [ ] `src/components/layout/MainLayout.tsx` 수정
- [ ] SFTP 탭 타입 처리 추가
- [ ] SFTPBrowser 컴포넌트 렌더링

**테스트 방법:**
```bash
pnpm tauri dev
# Home → SFTP 프로필 클릭
# SFTP 브라우저가 메인 영역에 표시되면 성공
# 다른 탭으로 전환 후 다시 SFTP 탭으로 돌아왔을 때 상태 유지 확인
```

---

### Phase 6: 파일 작업 기능

#### Task 6.1: 새 폴더 생성
- [ ] Local: New Folder 버튼 → 다이얼로그 → 폴더 생성
- [ ] Remote: New Folder 버튼 → 다이얼로그 → 폴더 생성
- [ ] 생성 후 목록 자동 새로고침

**테스트 방법:**
```bash
# SFTP 탭에서
# 1. 로컬 패널 → New Folder 클릭 → 이름 입력 → 생성
# 2. 파일 목록에 새 폴더가 나타나는지 확인
# 3. 원격 패널에서도 동일하게 테스트
```

#### Task 6.2: 파일/폴더 삭제
- [ ] Local: 파일 선택 → Delete 버튼 → 확인 다이얼로그 → 삭제
- [ ] Remote: 파일 선택 → Delete 버튼 → 확인 다이얼로그 → 삭제
- [ ] 폴더 삭제 (재귀)
- [ ] 다중 선택 삭제

**테스트 방법:**
```bash
# 1. 테스트 폴더/파일 생성
# 2. 선택 후 Delete 버튼 클릭
# 3. 확인 다이얼로그에서 확인
# 4. 파일 목록에서 사라지는지 확인
# 5. 실제 파일 시스템에서도 삭제되었는지 확인
```

#### Task 6.3: 이름 변경
- [ ] Local: 파일 선택 → Rename 버튼 → 새 이름 입력 → 변경
- [ ] Remote: 파일 선택 → Rename 버튼 → 새 이름 입력 → 변경
- [ ] 입력 검증 (빈 이름, 특수문자 등)

**테스트 방법:**
```bash
# 1. 파일 선택 후 Rename 버튼 클릭
# 2. 새 이름 입력 후 확인
# 3. 파일 목록에서 변경된 이름 확인
# 4. 빈 이름 입력 시 에러 메시지 확인
```

#### Task 6.4: 컨텍스트 메뉴
- [ ] `src/components/sftp/FileContextMenu.tsx` 생성
- [ ] 우클릭 시 메뉴 표시
- [ ] 메뉴 항목: Open, Rename, Delete, Transfer, New Folder

**테스트 방법:**
```bash
# 1. 파일 우클릭 → 메뉴 표시 확인
# 2. 각 메뉴 항목 클릭 시 동작 확인
# 3. 폴더 우클릭 시에도 메뉴 동작 확인
```

---

### Phase 7: 파일 전송 기능

#### Task 7.1: 파일 업로드 구현
- [ ] `upload_file` Rust 커맨드 구현
- [ ] 청크 단위 전송 (대용량 파일 지원)
- [ ] 진행률 이벤트 발생
- [ ] Frontend에서 진행률 수신 및 표시

**테스트 방법:**
```bash
# Browser Console에서 직접 테스트
const result = await invoke('upload_file', {
  sessionId: 'xxx',
  localPath: '/home/user/test.txt',
  remotePath: '/home/remote/test.txt'
});
console.log('Upload result:', result);

# 원격 서버에서 파일 확인
```

#### Task 7.2: 파일 다운로드 구현
- [ ] `download_file` Rust 커맨드 구현
- [ ] 청크 단위 전송
- [ ] 진행률 이벤트 발생
- [ ] Frontend에서 진행률 수신 및 표시

**테스트 방법:**
```bash
# Browser Console
const result = await invoke('download_file', {
  sessionId: 'xxx',
  remotePath: '/home/remote/test.txt',
  localPath: '/home/user/downloaded.txt'
});

# 로컬 파일 시스템에서 파일 확인
```

#### Task 7.3: TransferItem 컴포넌트
- [ ] `src/components/sftp/TransferItem.tsx` 생성
- [ ] 파일명, 방향 아이콘, 진행률 바, 속도 표시
- [ ] 일시정지/재개/취소 버튼

**테스트 방법:**
```tsx
<TransferItem
  item={{
    id: '1',
    fileName: 'test.txt',
    fileSize: 1024000,
    direction: 'upload',
    status: 'transferring',
    progress: { bytes: 512000, totalBytes: 1024000, percentage: 50, speed: 102400 }
  }}
  onPause={() => console.log('Pause')}
  onResume={() => console.log('Resume')}
  onCancel={() => console.log('Cancel')}
/>

# 진행률 바가 50% 표시, 속도 표시 확인
```

#### Task 7.4: TransferPanel 컴포넌트
- [ ] `src/components/sftp/TransferPanel.tsx` 생성
- [ ] 접이식 패널 (하단 고정)
- [ ] 전송 큐 목록 표시
- [ ] 전체 일시정지/재개/취소 기능

**테스트 방법:**
```tsx
<TransferPanel
  transfers={[
    { id: '1', fileName: 'file1.txt', ... },
    { id: '2', fileName: 'file2.jpg', ... },
  ]}
/>

# 패널 토글 버튼 클릭 → 확장/축소 확인
# 전송 목록 표시 확인
```

#### Task 7.5: Drag & Drop 전송
- [ ] 로컬 → 원격: 파일 드래그하여 원격 패널에 드롭
- [ ] 원격 → 로컬: 파일 드래그하여 로컬 패널에 드롭
- [ ] 드래그 중 시각적 피드백
- [ ] 드롭 시 전송 큐에 추가 및 전송 시작

**테스트 방법:**
```bash
# SFTP 탭에서
# 1. 로컬 파일을 원격 패널로 드래그 앤 드롭
# 2. 드래그 중 패널에 하이라이트 표시 확인
# 3. 드롭 후 TransferPanel에 항목 추가 확인
# 4. 전송 완료 후 원격 패널 새로고침 확인
# 5. 반대 방향(원격 → 로컬)도 테스트
```

#### Task 7.6: 툴바 Transfer 버튼
- [ ] 파일 선택 후 Transfer 버튼 클릭
- [ ] 로컬 → 원격 / 원격 → 로컬 자동 판단
- [ ] 다중 파일 전송

**테스트 방법:**
```bash
# 1. 로컬 패널에서 파일 3개 선택
# 2. Transfer 버튼 클릭
# 3. 3개 파일이 전송 큐에 추가되고 순차 전송 확인
# 4. 원격 패널에서도 동일하게 테스트
```

#### Task 7.7: 외부 파일 드래그 앤 드롭
- [ ] OS 파일 탐색기에서 파일을 원격 패널로 드롭
- [ ] 자동으로 업로드 시작

**테스트 방법:**
```bash
# 1. OS 파일 탐색기 열기
# 2. 파일을 SFTP 탭의 원격 패널로 드래그
# 3. 드롭 시 업로드 시작 확인
# 4. 전송 완료 후 원격 패널에서 파일 확인
```

---

### Phase 8: 에러 처리 및 UX 개선

#### Task 8.1: 에러 처리
- [ ] 연결 실패 시 Toast 알림
- [ ] 파일 작업 실패 시 에러 메시지
- [ ] 전송 실패 시 재시도 옵션
- [ ] 네트워크 연결 끊김 감지

**테스트 방법:**
```bash
# 1. 잘못된 인증 정보로 연결 시도 → 에러 메시지 확인
# 2. 권한 없는 폴더 삭제 시도 → 에러 메시지 확인
# 3. 전송 중 네트워크 끊기 → 실패 상태 및 재시도 옵션 확인
```

#### Task 8.2: 로딩 상태
- [ ] 파일 목록 로딩 시 스켈레톤 표시
- [ ] 연결 중 로딩 인디케이터
- [ ] 파일 작업 중 버튼 비활성화

**테스트 방법:**
```bash
# 1. SFTP 탭 열기 → 연결 중 로딩 인디케이터 확인
# 2. 느린 네트워크 시뮬레이션 → 파일 목록 로딩 스켈레톤 확인
# 3. 파일 삭제 중 Delete 버튼 비활성화 확인
```

#### Task 8.3: 키보드 단축키
- [ ] Delete: 선택 파일 삭제
- [ ] F2: 이름 변경
- [ ] F5: 새로고침
- [ ] Ctrl+A: 전체 선택
- [ ] Ctrl+C, Ctrl+V: 복사/붙여넣기 (선택 사항)

**테스트 방법:**
```bash
# 1. 파일 선택 후 Delete 키 → 삭제 확인 다이얼로그
# 2. F2 키 → 이름 변경 다이얼로그
# 3. F5 키 → 파일 목록 새로고침
# 4. Ctrl+A → 모든 파일 선택
```

#### Task 8.4: 성능 최적화
- [ ] 파일 목록 가상 스크롤 (react-window 또는 유사 라이브러리)
- [ ] 전송 큐 병렬 처리 (동시 전송 수 제한)
- [ ] 이미지 썸네일 캐싱 (선택 사항)

**테스트 방법:**
```bash
# 1. 파일 1000개 있는 디렉토리 열기 → 스크롤 성능 확인
# 2. 파일 100개 동시 전송 → CPU 사용률 확인
# 3. 메모리 프로파일링 (Chrome DevTools)
```

#### Task 8.5: 전송 완료 후 처리
- [ ] 전송 완료 시 대상 패널 자동 새로고침
- [ ] 완료 알림 (선택적)
- [ ] 전송 히스토리 저장 (선택 사항)

**테스트 방법:**
```bash
# 1. 파일 업로드 → 완료 후 원격 패널 자동 새로고침 확인
# 2. 파일 다운로드 → 완료 후 로컬 패널 자동 새로고침 확인
# 3. 다중 파일 전송 → 모두 완료 시 알림 확인
```

---

### Phase 9: 최종 통합 및 테스트

#### Task 9.1: 전체 시나리오 테스트
- [ ] SFTP 프로필 생성 → 연결 → 파일 탐색 → 전송 → 종료
- [ ] 여러 SFTP 탭 동시 열기
- [ ] 탭 전환 시 상태 유지 확인

**테스트 방법:**
```bash
# 시나리오 1: 기본 워크플로우
1. Home에서 "New Session" → SFTP
2. 서버 정보 입력 및 프로필 저장
3. 프로필 클릭하여 SFTP 탭 열기
4. 양쪽 패널에서 파일 목록 확인
5. 폴더 탐색
6. 파일 생성/삭제/이름 변경
7. 파일 전송 (양방향)
8. 탭 닫기

# 시나리오 2: 다중 탭
1. SFTP 서버 2개 연결
2. 탭 전환하며 각각 파일 작업
3. 동시 전송 테스트

# 시나리오 3: 에러 복구
1. 전송 중 네트워크 끊기
2. 재연결 시도
3. 실패한 전송 재시도
```

#### Task 9.2: 문서화
- [ ] README에 SFTP 기능 설명 추가
- [ ] 사용자 가이드 작성 (선택 사항)
- [ ] 코드 주석 보완

**테스트 방법:**
- README 읽고 따라하기
- 새로운 사용자 관점에서 문서 검토

#### Task 9.3: 코드 리뷰 및 리팩토링
- [ ] TypeScript 타입 체크
- [ ] Rust Clippy 경고 해결
- [ ] 중복 코드 제거
- [ ] 일관성 있는 네이밍

**테스트 방법:**
```bash
# TypeScript
pnpm run build

# Rust
cd src-tauri
cargo clippy -- -D warnings

# 모든 경고 해결
```

---

## 📝 구현 순서 요약

1. **Phase 1-2**: 백엔드 기반 구축 (Rust 커맨드, 타입 정의)
2. **Phase 3**: NewSessionDialog SFTP 탭 추가
3. **Phase 4**: SFTP UI 컴포넌트 개발
4. **Phase 5**: Dual Panel 브라우저 통합
5. **Phase 6**: 파일 작업 기능
6. **Phase 7**: 파일 전송 기능
7. **Phase 8**: 에러 처리 및 UX 개선
8. **Phase 9**: 최종 테스트 및 문서화

---

## 🔧 개발 팁

### 테스트용 공개 SFTP 서버

```
Host: test.rebex.net
Port: 22
Username: demo
Password: password
```

### 디버깅

**Frontend:**
```typescript
// SFTP Store 상태 확인
console.log(useSFTPStore.getState());

// 이벤트 로깅
onDragStart={(file) => console.log('[DRAG]', file.name)}
onDrop={(e) => console.log('[DROP]', e.dataTransfer)}
```

**Backend:**
```rust
// Rust 로그
println!("[SFTP] Connecting to {}:{}", host, port);
eprintln!("[ERROR] Failed to upload: {}", err);
```

### 성능 모니터링

```bash
# Chrome DevTools
- Performance 탭에서 프로파일링
- Memory 탭에서 메모리 누수 확인
- Network 탭에서 Tauri 커맨드 호출 확인
```

---

## ✅ 완료 기준

- [ ] 모든 Phase의 Task 완료
- [ ] 테스트 서버에서 전체 시나리오 통과
- [ ] TypeScript 컴파일 에러 0개
- [ ] Rust Clippy 경고 0개
- [ ] 문서 작성 완료

---

**작성일**: 2025-11-21
**예상 소요 시간**: 40-60 시간
**우선순위**: Medium
