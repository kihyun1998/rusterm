# SFTP 완벽 구현 기획서

> **작성일**: 2025-11-20
> **버전**: 2.1 (Phase 1-2 완료)
> **상태**: Phase 1-2 완료, Phase 3 진행 준비

---

## 📋 목차

1. [현황 분석](#1-현황-분석)
2. [아키텍처 설계](#2-아키텍처-설계)
3. [인증 및 Credential 관리](#3-인증-및-credential-관리)
4. [Frontend 구현](#4-frontend-구현)
5. [Backend 구현](#5-backend-구현)
6. [IPC 통합](#6-ipc-통합)
7. [UI 컴포넌트 설계](#7-ui-컴포넌트-설계)
8. [구현 단계](#8-구현-단계)
9. [테스트 체크리스트](#9-테스트-체크리스트)

---

## 1. 현황 분석

### 1.1 기존 SSH 구현 완벽 분석

**✅ 완전히 구현된 SSH 시스템:**

#### Frontend
- `SSHConnectionDialog.tsx` (L74-455): 연결 다이얼로그
  - Keyring에 credential 저장 (L230-246)
  - Profile 생성 및 저장 (L198-225)
  - 4가지 인증 방식 지원: password, privateKey, passphrase, interactive
- `use-ssh.ts` (L32-212): SSH 훅
  - connect, sendInput, resize, disconnect
  - 이벤트 리스너: ssh://output/{sessionId}, ssh://exit/{sessionId}
- `Terminal.tsx` (L29-697): 터미널 통합
  - SSH/Local 구분 처리 (L46-47)
  - Credential 복원 (L74-157)
  - SSH 세션 생성 (L419-425)
- `Home.tsx` (L68-89): Connection card 클릭 처리

#### Backend
- `ssh_commands.rs` (L5-56): Tauri 커맨드
  - create_ssh_session, write_to_ssh, resize_ssh_session, close_ssh_session
- `ssh/manager.rs`: SSH 세션 관리자
- `ssh/session.rs`: SSH 세션 구현
- `ssh/types.rs` (L4-102): SSH 타입
  - SshConfig, AuthMethod, CreateSshResponse

#### IPC
- `ipc/protocol.rs` (L50): `AddSshTab` 커맨드
- `ipc/handler.rs` (L33-116): `handle_add_ssh_tab`
  - 탭 생성 이벤트 emit (L52-63)
  - 백그라운드 SSH 연결 (L81-112)

#### Keyring
- `keyring.ts` (L20-99): Keyring 유틸리티
  - service: `rusterm-{connectionType}` (sftp 지원 준비됨!)
  - account: `{profileId}-{credType}`
- `keyring_commands.rs` (L13-93): Rust 커맨드

### 1.2 SFTP 구현 현황

**✅ Phase 1 완료 (Backend Infrastructure):**
- `src-tauri/src/sftp/types.rs` (65 lines): SFTP types (SftpConfig, FileEntry, AuthMethod)
- `src-tauri/src/sftp/session.rs` (208 lines): SftpSession 구현
- `src-tauri/src/sftp/manager.rs` (205 lines): SftpManager 세션 관리
- `src-tauri/src/commands/sftp_commands.rs` (109 lines): 8개 Tauri 커맨드
- `src-tauri/src/lib.rs`: SFTP 모듈 및 커맨드 등록 완료

**✅ Phase 2 완료 (Frontend Credential Management):**
- `src/types/sftp.ts` (68 lines): Frontend SFTP types
- `src/components/sftp/SftpConnectionDialog.tsx` (456 lines): SFTP 연결 다이얼로그
- `src/App.tsx`: SftpConnectionDialog 통합, 탭 생성 처리
- `src/stores/use-tab-store.ts`: TabType에 'sftp' 추가
- `src/components/layout/MainLayout.tsx`: onOpenSftpDialog 지원
- `src/components/home/Home.tsx`: onOpenSftpDialog 지원
- `src/components/command/CommandPalette.tsx`: SFTP 연결 메뉴 지원

**❌ 아직 구현 안된 파일들:**
- Frontend: use-sftp.ts, SftpBrowser.tsx, RemoteFilePanel.tsx, LocalFilePanel.tsx
- Backend: fs_commands.rs (local file system)
- IPC: add_sftp_tab 커맨드

**✅ 이미 준비된 것들:**
- `connection.ts` (L46-53): `SFTPConfig` 타입 정의 완료
- `keyring.ts` (L16): `rusterm-sftp` service 지원
- `App.tsx` (L38-69): IPC 이벤트 리스너 (tab-created, tab-closed)

---

## 2. 아키텍처 설계

### 2.1 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Home.tsx         │  │ SftpConnection   │  │ SftpBrowser  │  │
│  │                  │  │ Dialog.tsx       │  │              │  │
│  │ - Card 클릭      │→│                  │→│ - Local FS    │  │
│  │ - addTab()       │  │ - Keyring 저장   │  │ - Remote FS  │  │
│  └──────────────────┘  └──────────────────┘  │ - Transfers  │  │
│                                               └──────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ use-sftp.ts Hook                                         │  │
│  │ - connect(), uploadFile(), downloadFile()                │  │
│  │ - listDirectory(), createDirectory(), deleteFile()       │  │
│  │ - Listen: sftp://output/{sessionId}                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ use-sftp-store.ts (Zustand)                              │  │
│  │ - sessions: Map<sessionId, SftpSessionState>             │  │
│  │ - transfers: FileTransfer[]                              │  │
│  │ - currentPath, files, selectedFiles                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ IPC (Tauri invoke)
┌─────────────────────────────────────────────────────────────────┐
│                       Backend (Rust + Tauri)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ sftp_commands.rs (Tauri Commands)                        │  │
│  │ - create_sftp_session()                                  │  │
│  │ - list_directory(), upload_file(), download_file()       │  │
│  │ - create_directory(), delete_path(), rename_path()       │  │
│  │ - close_sftp_session()                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↕                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ SftpManager (State)                                      │  │
│  │ - sessions: HashMap<String, SftpSession>                 │  │
│  │ - create_session(), close_session()                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↕                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ SftpSession                                              │  │
│  │ - ssh2::Sftp connection                                  │  │
│  │ - File operations (readdir, upload, download, etc.)     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ IPC Handler                                              │  │
│  │ - handle_add_sftp_tab() → create_session + emit event   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ ssh2 crate
┌─────────────────────────────────────────────────────────────────┐
│                      Remote SFTP Server                          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Tab 시스템 통합

**Tab 타입 확장:**
```typescript
// src/stores/use-tab-store.ts
export type TabType = 'home' | 'terminal' | 'sftp';  // ← 'sftp' 추가

export interface Tab {
  id: string;
  title: string;
  type: TabType;
  closable: boolean;
  ptyId?: number;
  isActive: boolean;
  workingDirectory?: string;
  connectionType?: ConnectionType;     // 'sftp' 추가됨
  connectionProfileId?: string;        // Profile ID
}
```

**탭 생성 Flow:**
1. Home에서 SFTP card 클릭 → `addTab({ type: 'sftp', connectionType: 'sftp', connectionProfileId })`
2. SftpConnectionDialog에서 Connect → `addTab({ type: 'sftp', ... })`
3. IPC `add_sftp_tab` → Backend가 `tab-created` 이벤트 emit → Frontend addTab()

### 2.3 SFTP vs Terminal 차이점

| 항목 | Terminal (SSH) | SFTP Browser |
|------|---------------|--------------|
| **UI** | xterm.js 터미널 | Dual-panel file browser |
| **Backend** | PTY/SSH session | SFTP session (ssh2 crate) |
| **Tab Type** | `type: 'terminal'` | `type: 'sftp'` |
| **Credential** | Keyring 복원 | Keyring 복원 (동일) |
| **컴포넌트** | `Terminal.tsx` | `SftpBrowser.tsx` |

---

## 3. 인증 및 Credential 관리

### 3.1 인증 방식 (SSH와 100% 동일)

**4가지 인증 옵션:**
1. **Password**: 비밀번호 인증
2. **Private Key**: SSH 키 (passphrase 없음)
3. **Private Key + Passphrase**: 암호화된 SSH 키
4. **Interactive/None**: Credential 없이 (keyboard-interactive)

### 3.2 Credential 저장 (SftpConnectionDialog)

**SSH와 동일한 패턴 적용:**

```typescript
// src/components/sftp/SftpConnectionDialog.tsx

const handleConnect = async () => {
  // 1. Profile 생성 (credential 제외)
  const newProfile: ConnectionProfile = {
    id: crypto.randomUUID(),
    name: uniqueName,
    type: 'sftp',  // ← SSH 대신 SFTP
    config: {
      host: formState.host,
      port: formState.port,
      username: formState.username,
      // password/privateKey 저장 안 함!
    },
    savedAuthType: (() => {
      if (formState.authMethod === 'password' && formState.password) {
        return 'password';
      } else if (formState.authMethod === 'privateKey' && formState.privateKeyPath) {
        return formState.passphrase ? 'passphrase' : 'privateKey';
      } else {
        return 'interactive';
      }
    })(),
    createdAt: Date.now(),
  };

  // 2. Profile 저장
  const profileId = await addProfile(newProfile);

  // 3. Keyring에 credential 저장
  const { saveCredential } = await import('@/lib/keyring');

  if (formState.authMethod === 'password' && formState.password) {
    await saveCredential(profileId, 'sftp', 'password', formState.password);
  }

  if (formState.authMethod === 'privateKey' && formState.privateKeyPath) {
    await saveCredential(profileId, 'sftp', 'privatekey', formState.privateKeyPath);
    if (formState.passphrase) {
      await saveCredential(profileId, 'sftp', 'passphrase', formState.passphrase);
    }
  }

  // 4. SFTP 탭 열기
  addTab({
    id: crypto.randomUUID(),
    type: 'sftp',  // ← Terminal 대신 SFTP
    connectionType: 'sftp',
    connectionProfileId: profileId,
    title: `SFTP: ${uniqueName}`,
    closable: true,
  });

  onClose();
};
```

**Keyring service name:**
- Service: `rusterm-sftp` (이미 keyring.ts에서 지원)
- Account: `{profileId}-password`, `{profileId}-privatekey`, `{profileId}-passphrase`

### 3.3 Credential 복원 (SftpBrowser)

```typescript
// src/components/sftp/SftpBrowser.tsx

useEffect(() => {
  const initSession = async () => {
    if (!connectionProfileId) return;

    // 1. Profile 가져오기
    const { useConnectionProfileStore } = await import('@/stores/use-connection-profile-store');
    const profile = useConnectionProfileStore.getState().getProfileById(connectionProfileId);

    if (!profile || !isSFTPConfig(profile.config)) {
      console.error('Invalid SFTP profile');
      return;
    }

    // 2. Keyring에서 credential 복원
    const { getCredential } = await import('@/lib/keyring');
    let password, privateKey, passphrase;

    if (profile.savedAuthType === 'password') {
      password = await getCredential(connectionProfileId, 'sftp', 'password');
    } else if (profile.savedAuthType === 'privateKey') {
      privateKey = await getCredential(connectionProfileId, 'sftp', 'privatekey');
    } else if (profile.savedAuthType === 'passphrase') {
      privateKey = await getCredential(connectionProfileId, 'sftp', 'privatekey');
      passphrase = await getCredential(connectionProfileId, 'sftp', 'passphrase');
    }
    // else: interactive - no credentials

    // 3. SFTP 세션 생성
    const config: SftpConfig = {
      ...profile.config,
      password: password || undefined,
      privateKey: privateKey || undefined,
      passphrase: passphrase || undefined,
    };

    await connect(config);
  };

  initSession();
}, [connectionProfileId]);
```

---

## 4. Frontend 구현

### 4.1 신규 파일 목록

```
src/
├── components/
│   └── sftp/
│       ├── SftpConnectionDialog.tsx      # NEW - SSH 다이얼로그 복사 수정
│       ├── SftpBrowser.tsx               # NEW - 메인 SFTP 브라우저
│       ├── LocalFilePanel.tsx            # NEW - 로컬 파일 패널
│       ├── RemoteFilePanel.tsx           # NEW - 원격 파일 패널
│       ├── DualPanelLayout.tsx           # NEW - 양쪽 패널 컨테이너
│       ├── SftpToolbar.tsx               # NEW - 툴바 (refresh, upload, etc.)
│       ├── TransferPanel.tsx             # NEW - 전송 진행 표시
│       ├── FileList.tsx                  # NEW - 파일 목록 UI
│       ├── PathBreadcrumb.tsx            # NEW - 경로 브레드크럼
│       └── FileContextMenu.tsx           # NEW - 파일 컨텍스트 메뉴
│
├── hooks/
│   ├── use-sftp.ts                       # NEW - SFTP 훅
│   ├── use-local-fs.ts                   # NEW - 로컬 파일 시스템 훅
│   └── use-sftp-store.ts                 # NEW - SFTP 상태 관리
│
└── types/
    └── sftp.ts                            # NEW - SFTP 타입 정의
```

### 4.2 use-sftp.ts Hook

**SSH 훅 패턴 기반:**

```typescript
// src/hooks/use-sftp.ts

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SftpConfig, FileEntry, CreateSftpResponse } from '@/types/sftp';

interface UseSftpOptions {
  sessionId: string;
}

export function useSftp({ sessionId }: UseSftpOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect to SFTP (called from SftpBrowser on mount)
  const connect = useCallback(async (config: SftpConfig) => {
    try {
      setIsLoading(true);
      const response = await invoke<CreateSftpResponse>('create_sftp_session', {
        config,
        sessionId,
      });
      setIsConnected(true);
      setCurrentPath(response.initial_path || '/');
      await listDirectory(response.initial_path || '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // List directory
  const listDirectory = useCallback(async (path: string) => {
    try {
      setIsLoading(true);
      const entries = await invoke<FileEntry[]>('sftp_list_directory', {
        sessionId,
        path,
      });
      setFiles(entries);
      setCurrentPath(path);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Upload file
  const uploadFile = useCallback(async (localPath: string, remotePath: string) => {
    try {
      await invoke('sftp_upload_file', {
        sessionId,
        localPath,
        remotePath,
      });
      // Refresh current directory
      await listDirectory(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, [sessionId, currentPath, listDirectory]);

  // Download file
  const downloadFile = useCallback(async (remotePath: string, localPath: string) => {
    try {
      await invoke('sftp_download_file', {
        sessionId,
        remotePath,
        localPath,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, [sessionId]);

  // Create directory
  const createDirectory = useCallback(async (path: string) => {
    try {
      await invoke('sftp_create_directory', {
        sessionId,
        path,
      });
      await listDirectory(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, [sessionId, currentPath, listDirectory]);

  // Delete file/directory
  const deletePath = useCallback(async (path: string) => {
    try {
      await invoke('sftp_delete_path', {
        sessionId,
        path,
      });
      await listDirectory(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, [sessionId, currentPath, listDirectory]);

  // Rename/move
  const renamePath = useCallback(async (oldPath: string, newPath: string) => {
    try {
      await invoke('sftp_rename_path', {
        sessionId,
        oldPath,
        newPath,
      });
      await listDirectory(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, [sessionId, currentPath, listDirectory]);

  // Disconnect
  const disconnect = useCallback(async () => {
    try {
      await invoke('close_sftp_session', { sessionId });
      setIsConnected(false);
    } catch (err) {
      console.error('Failed to close SFTP session:', err);
    }
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    currentPath,
    files,
    isLoading,
    error,
    connect,
    listDirectory,
    uploadFile,
    downloadFile,
    createDirectory,
    deletePath,
    renamePath,
    disconnect,
  };
}
```

### 4.3 SftpBrowser.tsx 컴포넌트

**구조:**
```typescript
// src/components/sftp/SftpBrowser.tsx

export interface SftpBrowserProps {
  sessionId: string;
  connectionProfileId: string;
}

export function SftpBrowser({ sessionId, connectionProfileId }: SftpBrowserProps) {
  const { connect, isConnected, error } = useSftp({ sessionId });
  const [isConnecting, setIsConnecting] = useState(true);

  // Credential 복원 및 연결 (앞서 3.3 참고)
  useEffect(() => {
    // ... credential 복원 로직
  }, [connectionProfileId]);

  if (isConnecting) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  return (
    <div className="flex flex-col h-full">
      <SftpToolbar sessionId={sessionId} />
      <DualPanelLayout sessionId={sessionId} />
      <TransferPanel sessionId={sessionId} />
    </div>
  );
}
```

### 4.4 Home.tsx 수정

**SFTP Card 클릭 처리 추가:**

```typescript
// src/components/home/Home.tsx (L68-89 수정)

const handleConnectProfile = async (profileId: string) => {
  const profile = getProfileById(profileId);
  if (!profile) {
    console.error('Profile not found:', profileId);
    return;
  }

  const newTabId = crypto.randomUUID();

  if (profile.type === 'ssh') {
    // SSH terminal tab
    addTab({
      id: newTabId,
      title: profile.name,
      type: 'terminal',
      closable: true,
      connectionType: 'ssh',
      connectionProfileId: profileId,
    });
  } else if (profile.type === 'sftp') {
    // SFTP browser tab  ← 추가!
    addTab({
      id: newTabId,
      title: `SFTP: ${profile.name}`,
      type: 'sftp',  // ← 새로운 타입
      closable: true,
      connectionType: 'sftp',
      connectionProfileId: profileId,
    });
  } else {
    // Local terminal
    addTab({
      id: newTabId,
      title: profile.name,
      type: 'terminal',
      closable: true,
      connectionType: profile.type,
      connectionProfileId: profileId,
    });
  }

  addToRecent(profileId);
};
```

### 4.5 App.tsx 수정

**SftpConnectionDialog 추가:**

```typescript
// src/App.tsx

import { SftpConnectionDialog } from '@/components/sftp/SftpConnectionDialog';

function App() {
  const [sshDialogOpen, setSshDialogOpen] = useState(false);
  const [sftpDialogOpen, setSftpDialogOpen] = useState(false);  // ← 추가

  const openSftpDialog = () => {
    setSftpDialogOpen(true);
  };

  const handleSftpConnect = (profileId: string) => {
    const profile = useConnectionProfileStore.getState().getProfileById(profileId);
    if (!profile) return;

    const newTabId = crypto.randomUUID();
    addTab({
      id: newTabId,
      title: `SFTP: ${profile.name}`,
      type: 'sftp',
      closable: true,
      connectionType: 'sftp',
      connectionProfileId: profileId,
    });
  };

  return (
    <>
      {/* ... */}

      {/* SFTP Connection Dialog */}
      <SftpConnectionDialog
        open={sftpDialogOpen}
        onOpenChange={setSftpDialogOpen}
        onConnect={handleSftpConnect}
      />
    </>
  );
}
```

### 4.6 MainLayout.tsx 수정

**SFTP tab 렌더링:**

```typescript
// src/components/layout/MainLayout.tsx

import { SftpBrowser } from '@/components/sftp/SftpBrowser';

export function MainLayout({ ... }) {
  const renderContent = () => {
    // ... existing code

    if (activeTab.type === 'terminal') {
      return (
        <Terminal
          id={activeTab.id}
          connectionType={activeTab.connectionType}
          connectionProfileId={activeTab.connectionProfileId}
        />
      );
    }

    // SFTP browser ← 추가!
    if (activeTab.type === 'sftp') {
      return (
        <SftpBrowser
          sessionId={activeTab.id}
          connectionProfileId={activeTab.connectionProfileId || ''}
        />
      );
    }

    return null;
  };

  // ...
}
```

---

## 5. Backend 구현

### 5.1 신규 파일 목록

```
src-tauri/src/
├── sftp/
│   ├── mod.rs                    # NEW - Module exports
│   ├── manager.rs                # NEW - SftpManager (State)
│   ├── session.rs                # NEW - SftpSession
│   └── types.rs                  # NEW - Types
│
└── commands/
    └── sftp_commands.rs          # NEW - Tauri commands
```

### 5.2 sftp/types.rs

```rust
// src-tauri/src/sftp/types.rs

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// SFTP 연결 설정 (SSH와 동일한 구조)
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SftpConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auth_method: Option<AuthMethod>,
}

/// 인증 방법 (SSH와 동일)
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AuthMethod {
    #[serde(rename = "password")]
    Password { password: String },
    #[serde(rename = "privateKey")]
    PrivateKey { path: String, passphrase: Option<String> },
}

/// SFTP 세션 생성 응답
#[derive(Debug, Serialize)]
pub struct CreateSftpResponse {
    pub session_id: String,
    pub host: String,
    pub username: String,
    pub initial_path: String,  // 초기 디렉토리 경로
}

/// 파일/디렉토리 엔트리
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64,  // Unix timestamp
    pub permissions: String,
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

    #[error("File operation failed: {0}")]
    FileOperationFailed(String),

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

### 5.3 sftp/session.rs

```rust
// src-tauri/src/sftp/session.rs

use ssh2::{Session, Sftp};
use std::net::TcpStream;
use std::path::Path;
use crate::sftp::types::{AuthMethod, FileEntry, SftpConfig, SftpError};

pub struct SftpSession {
    session_id: String,
    _session: Session,  // Keep session alive
    sftp: Sftp,
    config: SftpConfig,
}

impl SftpSession {
    /// SFTP 세션 생성
    pub fn new(
        session_id: String,
        config: SftpConfig,
    ) -> Result<Self, SftpError> {
        // TCP 연결
        let tcp = TcpStream::connect(format!("{}:{}", config.host, config.port))
            .map_err(|e| SftpError::ConnectionFailed(e.to_string()))?;

        // SSH 세션 생성
        let mut session = Session::new()
            .map_err(|e| SftpError::ConnectionFailed(e.to_string()))?;
        session.set_tcp_stream(tcp);
        session.handshake()
            .map_err(|e| SftpError::ConnectionFailed(e.to_string()))?;

        // 인증
        match &config.auth_method {
            Some(AuthMethod::Password { password }) => {
                session.userauth_password(&config.username, password)
                    .map_err(|e| SftpError::AuthenticationFailed(e.to_string()))?;
            }
            Some(AuthMethod::PrivateKey { path, passphrase }) => {
                session.userauth_pubkey_file(
                    &config.username,
                    None,
                    Path::new(path),
                    passphrase.as_deref(),
                ).map_err(|e| SftpError::AuthenticationFailed(e.to_string()))?;
            }
            None => {
                // Interactive auth not supported for SFTP
                return Err(SftpError::AuthenticationFailed(
                    "SFTP requires password or private key authentication".to_string()
                ));
            }
        }

        // SFTP 채널 열기
        let sftp = session.sftp()
            .map_err(|e| SftpError::ConnectionFailed(e.to_string()))?;

        Ok(Self {
            session_id,
            _session: session,
            sftp,
            config,
        })
    }

    /// 디렉토리 목록 조회
    pub fn list_directory(&self, path: &str) -> Result<Vec<FileEntry>, SftpError> {
        let entries = self.sftp.readdir(Path::new(path))
            .map_err(|e| SftpError::FileOperationFailed(e.to_string()))?;

        let mut result = Vec::new();
        for (path, stat) in entries {
            let name = path.file_name()
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
        result.sort_by(|a, b| {
            match (a.is_dir, b.is_dir) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.cmp(&b.name),
            }
        });

        Ok(result)
    }

    /// 파일 업로드
    pub fn upload_file(&self, local_path: &str, remote_path: &str) -> Result<(), SftpError> {
        use std::io::{Read, Write};

        let mut local_file = std::fs::File::open(local_path)
            .map_err(|e| SftpError::FileOperationFailed(e.to_string()))?;

        let mut remote_file = self.sftp.create(Path::new(remote_path))
            .map_err(|e| SftpError::FileOperationFailed(e.to_string()))?;

        let mut buffer = vec![0u8; 8192];
        loop {
            let n = local_file.read(&mut buffer)
                .map_err(|e| SftpError::IoError(e))?;
            if n == 0 {
                break;
            }
            remote_file.write_all(&buffer[..n])
                .map_err(|e| SftpError::IoError(e))?;
        }

        Ok(())
    }

    /// 파일 다운로드
    pub fn download_file(&self, remote_path: &str, local_path: &str) -> Result<(), SftpError> {
        use std::io::{Read, Write};

        let mut remote_file = self.sftp.open(Path::new(remote_path))
            .map_err(|e| SftpError::FileOperationFailed(e.to_string()))?;

        let mut local_file = std::fs::File::create(local_path)
            .map_err(|e| SftpError::FileOperationFailed(e.to_string()))?;

        let mut buffer = vec![0u8; 8192];
        loop {
            let n = remote_file.read(&mut buffer)
                .map_err(|e| SftpError::IoError(e))?;
            if n == 0 {
                break;
            }
            local_file.write_all(&buffer[..n])
                .map_err(|e| SftpError::IoError(e))?;
        }

        Ok(())
    }

    /// 디렉토리 생성
    pub fn create_directory(&self, path: &str) -> Result<(), SftpError> {
        self.sftp.mkdir(Path::new(path), 0o755)
            .map_err(|e| SftpError::FileOperationFailed(e.to_string()))
    }

    /// 파일/디렉토리 삭제
    pub fn delete_path(&self, path: &str, is_dir: bool) -> Result<(), SftpError> {
        if is_dir {
            self.sftp.rmdir(Path::new(path))
                .map_err(|e| SftpError::FileOperationFailed(e.to_string()))
        } else {
            self.sftp.unlink(Path::new(path))
                .map_err(|e| SftpError::FileOperationFailed(e.to_string()))
        }
    }

    /// 파일/디렉토리 이름 변경
    pub fn rename_path(&self, old_path: &str, new_path: &str) -> Result<(), SftpError> {
        self.sftp.rename(Path::new(old_path), Path::new(new_path), None)
            .map_err(|e| SftpError::FileOperationFailed(e.to_string()))
    }

    pub fn session_id(&self) -> &str {
        &self.session_id
    }
}
```

### 5.4 sftp/manager.rs

```rust
// src-tauri/src/sftp/manager.rs

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::sftp::{SftpSession, SftpConfig, SftpError, CreateSftpResponse};

#[derive(Clone)]
pub struct SftpManager {
    sessions: Arc<Mutex<HashMap<String, SftpSession>>>,
}

impl SftpManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 세션 생성
    pub async fn create_session(
        &self,
        session_id: String,
        config: SftpConfig,
    ) -> Result<CreateSftpResponse, SftpError> {
        let session = SftpSession::new(session_id.clone(), config.clone())?;

        // Get initial directory (home directory)
        let initial_path = "/".to_string();  // Could use sftp.realpath(".") for actual home

        let response = CreateSftpResponse {
            session_id: session_id.clone(),
            host: config.host.clone(),
            username: config.username.clone(),
            initial_path,
        };

        self.sessions.lock().await.insert(session_id, session);

        Ok(response)
    }

    /// 세션 가져오기
    async fn get_session(&self, session_id: &str) -> Result<SftpSession, SftpError> {
        self.sessions
            .lock()
            .await
            .get(session_id)
            .cloned()
            .ok_or_else(|| SftpError::SessionNotFound(session_id.to_string()))
    }

    /// 디렉토리 목록 조회
    pub async fn list_directory(
        &self,
        session_id: &str,
        path: &str,
    ) -> Result<Vec<crate::sftp::FileEntry>, SftpError> {
        let session = self.get_session(session_id).await?;
        session.list_directory(path)
    }

    /// 파일 업로드
    pub async fn upload_file(
        &self,
        session_id: &str,
        local_path: &str,
        remote_path: &str,
    ) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        session.upload_file(local_path, remote_path)
    }

    /// 파일 다운로드
    pub async fn download_file(
        &self,
        session_id: &str,
        remote_path: &str,
        local_path: &str,
    ) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        session.download_file(remote_path, local_path)
    }

    /// 디렉토리 생성
    pub async fn create_directory(
        &self,
        session_id: &str,
        path: &str,
    ) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        session.create_directory(path)
    }

    /// 파일/디렉토리 삭제
    pub async fn delete_path(
        &self,
        session_id: &str,
        path: &str,
        is_dir: bool,
    ) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        session.delete_path(path, is_dir)
    }

    /// 파일/디렉토리 이름 변경
    pub async fn rename_path(
        &self,
        session_id: &str,
        old_path: &str,
        new_path: &str,
    ) -> Result<(), SftpError> {
        let session = self.get_session(session_id).await?;
        session.rename_path(old_path, new_path)
    }

    /// 세션 종료
    pub async fn close_session(&self, session_id: &str) -> Result<(), SftpError> {
        self.sessions.lock().await.remove(session_id);
        Ok(())
    }

    /// 세션 목록 조회
    pub async fn list_sessions(&self) -> Vec<String> {
        self.sessions.lock().await.keys().cloned().collect()
    }
}
```

### 5.5 sftp_commands.rs

```rust
// src-tauri/src/commands/sftp_commands.rs

use crate::sftp::{SftpManager, SftpConfig, CreateSftpResponse, FileEntry};
use tauri::State;

/// SFTP 세션 생성
#[tauri::command]
pub async fn create_sftp_session(
    state: State<'_, SftpManager>,
    config: SftpConfig,
    session_id: String,
) -> Result<CreateSftpResponse, String> {
    state
        .create_session(session_id, config)
        .await
        .map_err(|e| e.to_string())
}

/// 디렉토리 목록 조회
#[tauri::command]
pub async fn sftp_list_directory(
    state: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<Vec<FileEntry>, String> {
    state
        .list_directory(&session_id, &path)
        .await
        .map_err(|e| e.to_string())
}

/// 파일 업로드
#[tauri::command]
pub async fn sftp_upload_file(
    state: State<'_, SftpManager>,
    session_id: String,
    local_path: String,
    remote_path: String,
) -> Result<(), String> {
    state
        .upload_file(&session_id, &local_path, &remote_path)
        .await
        .map_err(|e| e.to_string())
}

/// 파일 다운로드
#[tauri::command]
pub async fn sftp_download_file(
    state: State<'_, SftpManager>,
    session_id: String,
    remote_path: String,
    local_path: String,
) -> Result<(), String> {
    state
        .download_file(&session_id, &remote_path, &local_path)
        .await
        .map_err(|e| e.to_string())
}

/// 디렉토리 생성
#[tauri::command]
pub async fn sftp_create_directory(
    state: State<'_, SftpManager>,
    session_id: String,
    path: String,
) -> Result<(), String> {
    state
        .create_directory(&session_id, &path)
        .await
        .map_err(|e| e.to_string())
}

/// 파일/디렉토리 삭제
#[tauri::command]
pub async fn sftp_delete_path(
    state: State<'_, SftpManager>,
    session_id: String,
    path: String,
    is_dir: bool,
) -> Result<(), String> {
    state
        .delete_path(&session_id, &path, is_dir)
        .await
        .map_err(|e| e.to_string())
}

/// 파일/디렉토리 이름 변경
#[tauri::command]
pub async fn sftp_rename_path(
    state: State<'_, SftpManager>,
    session_id: String,
    old_path: String,
    new_path: String,
) -> Result<(), String> {
    state
        .rename_path(&session_id, &old_path, &new_path)
        .await
        .map_err(|e| e.to_string())
}

/// SFTP 세션 종료
#[tauri::command]
pub async fn close_sftp_session(
    state: State<'_, SftpManager>,
    session_id: String,
) -> Result<(), String> {
    state
        .close_session(&session_id)
        .await
        .map_err(|e| e.to_string())
}
```

### 5.6 lib.rs 수정

```rust
// src-tauri/src/lib.rs

mod commands;
mod pty;
mod settings;
mod ssh;
mod sftp;  // ← 추가
mod ipc;

use pty::PtyManager;
use settings::SettingsManager;
use ssh::SshManager;
use sftp::SftpManager;  // ← 추가
use ipc::IpcServer;
use std::sync::{Arc, Mutex};

pub fn run() {
    let settings_manager = SettingsManager::new()
        .expect("Failed to initialize settings manager");
    let ipc_server: Arc<Mutex<Option<IpcServer>>> = Arc::new(Mutex::new(None));
    let ipc_server_clone = ipc_server.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(PtyManager::new())
        .manage(SshManager::new())
        .manage(SftpManager::new())  // ← 추가
        .manage(settings_manager)
        .setup(move |app| {
            // ... IPC server setup
            Ok(())
        })
        .on_window_event(move |_window, event| {
            // ... cleanup
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            // PTY commands
            commands::pty_commands::create_pty,
            commands::pty_commands::write_to_pty,
            commands::pty_commands::resize_pty,
            commands::pty_commands::close_pty,
            // Settings commands
            commands::settings_commands::load_settings,
            commands::settings_commands::save_settings,
            commands::settings_commands::reset_settings,
            // Keyring commands
            commands::keyring_commands::save_credential,
            commands::keyring_commands::get_credential,
            commands::keyring_commands::delete_credential,
            // SSH commands
            commands::ssh_commands::create_ssh_session,
            commands::ssh_commands::write_to_ssh,
            commands::ssh_commands::resize_ssh_session,
            commands::ssh_commands::close_ssh_session,
            // SFTP commands ← 추가
            commands::sftp_commands::create_sftp_session,
            commands::sftp_commands::sftp_list_directory,
            commands::sftp_commands::sftp_upload_file,
            commands::sftp_commands::sftp_download_file,
            commands::sftp_commands::sftp_create_directory,
            commands::sftp_commands::sftp_delete_path,
            commands::sftp_commands::sftp_rename_path,
            commands::sftp_commands::close_sftp_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## 6. IPC 통합

### 6.1 IPC Protocol 확장

```rust
// src-tauri/src/ipc/protocol.rs

#[derive(Debug, Deserialize)]
#[serde(tag = "command", rename_all = "snake_case")]
pub enum IpcCommand {
    Ping,
    AddSshTab { params: AddSshTabParams },
    AddSftpTab { params: AddSftpTabParams },  // ← 추가
    AddLocalTab { params: AddLocalTabParams },
    CloseTab { params: CloseTabParams },
    ListTabs,
}

/// add_sftp_tab 파라미터
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddSftpTabParams {
    #[serde(flatten)]
    pub config: crate::sftp::SftpConfig,  // SFTP config
}
```

### 6.2 IPC Handler 확장

```rust
// src-tauri/src/ipc/handler.rs

use crate::sftp::SftpManager;

pub async fn handle_request(request: IpcRequest, app_handle: &AppHandle) -> IpcResponse {
    match request.command.as_str() {
        "ping" => handle_ping().await,
        "add_ssh_tab" => handle_add_ssh_tab(request.params, app_handle).await,
        "add_sftp_tab" => handle_add_sftp_tab(request.params, app_handle).await,  // ← 추가
        "add_local_tab" => handle_add_local_tab(request.params, app_handle).await,
        "close_tab" => handle_close_tab(request.params, app_handle).await,
        "list_tabs" => handle_list_tabs(app_handle).await,
        _ => IpcResponse::error(format!("Unknown command: {}", request.command)),
    }
}

/// add_sftp_tab 커맨드 처리
async fn handle_add_sftp_tab(
    params: Option<serde_json::Value>,
    app_handle: &AppHandle,
) -> IpcResponse {
    let params: AddSftpTabParams = match params {
        Some(p) => match serde_json::from_value(p) {
            Ok(params) => params,
            Err(e) => return IpcResponse::error(format!("Invalid params: {}", e)),
        },
        None => return IpcResponse::error("Missing params for add_sftp_tab"),
    };

    let session_id = Uuid::new_v4().to_string();

    // 프론트엔드에 탭 생성 이벤트 먼저 emit
    let payload = TabCreatedPayload {
        tab_id: session_id.clone(),
        tab_type: "sftp".to_string(),
        title: format!("SFTP: {}@{}", params.config.username, params.config.host),
        pty_id: None,
        session_id: Some(session_id.clone()),
    };

    if let Err(e) = app_handle.emit("tab-created", payload) {
        eprintln!("Failed to emit tab-created event: {}", e);
        return IpcResponse::error(format!("Failed to emit tab-created event: {}", e));
    }

    let response = serde_json::json!({
        "session_id": session_id.clone(),
        "host": params.config.host.clone(),
        "username": params.config.username.clone(),
    });

    // 백그라운드에서 SFTP 연결
    let sftp_manager = app_handle.state::<SftpManager>().inner().clone();
    let config = params.config.clone();
    let session_id_clone = session_id.clone();
    let app_handle_clone = app_handle.clone();

    tauri::async_runtime::spawn(async move {
        match sftp_manager
            .create_session(session_id_clone.clone(), config.clone())
            .await
        {
            Ok(_) => {
                eprintln!("[IPC] SFTP session created successfully: {}", session_id_clone);
            }
            Err(e) => {
                eprintln!("[IPC] SFTP connection failed: {}", e);
                // TODO: Emit error event to frontend
            }
        }
    });

    IpcResponse::success(response)
}
```

---

## 7. UI 컴포넌트 설계

### 7.1 Dual Panel Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  SFTP Toolbar: [Refresh] [Upload] [Download] [Delete] [New Dir]  │
├─────────────────────────┬────────────────────────────────────────┤
│  Local Files (Left)     │  Remote Files (Right)                  │
│                         │                                        │
│  📁 /home/user/         │  📁 /home/remote-user/                 │
│  ├─ 📁 Documents/       │  ├─ 📁 Documents/                      │
│  ├─ 📁 Downloads/       │  ├─ 📁 Projects/                       │
│  ├─ 📄 file1.txt (2KB)  │  ├─ 📄 config.txt (1KB)                │
│  └─ 📄 file2.pdf (5MB)  │  └─ 📄 readme.md (3KB)                 │
│                         │                                        │
│  [Path: /home/user]     │  [Path: /home/remote-user]             │
│                         │                                        │
│  Drag & Drop →          │  ← Drag & Drop                         │
├─────────────────────────┴────────────────────────────────────────┤
│  Transfer Queue                                                  │
│  ⬇ downloading file1.txt (45%) ████████░░ 2.3 MB/s              │
│  ⬆ uploading file2.pdf (78%)   ████████████░░ 1.8 MB/s          │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 컴포넌트 계층 구조

```
SftpBrowser (Container)
├── SftpToolbar
│   ├── Refresh button
│   ├── Upload button (from local selected)
│   ├── Download button (from remote selected)
│   ├── Delete button
│   └── New folder button
│
├── DualPanelLayout
│   ├── LocalFilePanel
│   │   ├── PathBreadcrumb
│   │   ├── FileList (local)
│   │   └── ActionButtons
│   │
│   └── RemoteFilePanel
│       ├── PathBreadcrumb
│       ├── FileList (remote)
│       └── ActionButtons
│
└── TransferPanel
    ├── Active transfers
    └── Completed transfers
```

---

## 8. 구현 단계

### Phase 1: Backend 기초 (4-6시간)

**파일:**
- `src-tauri/src/sftp/types.rs`
- `src-tauri/src/sftp/session.rs`
- `src-tauri/src/sftp/manager.rs`
- `src-tauri/src/sftp/mod.rs`
- `src-tauri/src/commands/sftp_commands.rs`

**작업:**
1. ✅ SFTP types 정의 (SftpConfig, FileEntry, Errors)
2. ✅ SftpSession 구현 (ssh2 crate 사용)
3. ✅ SftpManager 구현 (세션 관리)
4. ✅ Tauri 커맨드 정의 (create, list, upload, download, etc.)
5. ✅ lib.rs에 등록

**검증:**
```bash
cargo build --manifest-path src-tauri/Cargo.toml
```

---

### Phase 2: Frontend Credential 관리 (2-3시간)

**파일:**
- `src/components/sftp/SftpConnectionDialog.tsx`
- `src/types/sftp.ts`

**작업:**
1. ✅ SSHConnectionDialog 복사 → SftpConnectionDialog
2. ✅ SFTP 관련 타입 정의 (sftp.ts)
3. ✅ Keyring 저장 로직 구현 (SSH 패턴 동일)
4. ✅ Profile 저장 로직 구현
5. ✅ App.tsx에 다이얼로그 추가

**검증:**
- SftpConnectionDialog 열기 → 입력 → Connect
- Profile이 localStorage에 저장되는지 확인
- Keyring에 credential 저장되는지 확인

---

### Phase 3: SFTP 연결 및 기본 UI (4-5시간)

**파일:**
- `src/hooks/use-sftp.ts`
- `src/components/sftp/SftpBrowser.tsx`
- `src/components/sftp/RemoteFilePanel.tsx`
- `src/stores/use-tab-store.ts` (수정)

**작업:**
1. ✅ use-sftp hook 구현 (connect, listDirectory)
2. ✅ SftpBrowser 컴포넌트 (credential 복원 포함)
3. ✅ RemoteFilePanel 컴포넌트 (파일 목록 표시)
4. ✅ Tab 타입에 'sftp' 추가
5. ✅ MainLayout에서 SftpBrowser 렌더링

**검증:**
- SFTP connection card 클릭 → SFTP 탭 열림
- Credential 복원 → SFTP 연결 성공
- 원격 디렉토리 파일 목록 표시

---

### Phase 4: Local 파일 시스템 (3-4시간)

**파일:**
- `src-tauri/src/commands/fs_commands.rs` (NEW)
- `src/hooks/use-local-fs.ts` (NEW)
- `src/components/sftp/LocalFilePanel.tsx` (NEW)

**작업:**
1. ✅ Rust local FS 커맨드 (list_local_directory, etc.)
2. ✅ Tauri 권한 추가 (fs:allow-read-dir, etc.)
3. ✅ use-local-fs hook 구현
4. ✅ LocalFilePanel 컴포넌트
5. ✅ DualPanelLayout 통합

**검증:**
- 로컬 파일 목록 표시
- 디렉토리 탐색 가능

---

### Phase 5: 파일 전송 (4-5시간)

**파일:**
- `src/hooks/use-sftp.ts` (확장)
- `src/components/sftp/TransferPanel.tsx`
- `src/stores/use-sftp-store.ts` (transfer 상태)

**작업:**
1. ✅ uploadFile, downloadFile 구현
2. ✅ TransferPanel 컴포넌트 (진행률 표시)
3. ✅ Drag & Drop 지원
4. ✅ 에러 처리

**검증:**
- 파일 업로드/다운로드 작동
- 전송 진행률 표시
- Drag & Drop 작동

---

### Phase 6: IPC 통합 (2-3시간)

**파일:**
- `src-tauri/src/ipc/protocol.rs` (수정)
- `src-tauri/src/ipc/handler.rs` (수정)

**작업:**
1. ✅ AddSftpTab 커맨드 추가
2. ✅ handle_add_sftp_tab 구현
3. ✅ CLI에서 `add_sftp_tab` 호출 가능

**검증:**
- IPC 명령으로 SFTP 탭 생성 가능

---

### Phase 7: Home 통합 (1-2시간)

**파일:**
- `src/components/home/Home.tsx` (수정)

**작업:**
1. ✅ SFTP profile card 클릭 처리
2. ✅ SFTP 탭 열기

**검증:**
- Home에서 SFTP card 클릭 → SFTP 탭 열림

---

### Phase 8: 고급 기능 (선택, 8-12시간)

**작업:**
1. 파일 편집 (원격 파일 로컬에서 편집)
2. 디렉토리 동기화
3. 북마크 기능
4. 전송 이력
5. 전송 일시정지/재개

---

## 9. 테스트 체크리스트

### Phase 2: Credential 관리
- [ ] Password auth - keyring에 저장
- [ ] Private key auth - keyring에 저장
- [ ] Passphrase auth - keyring에 저장
- [ ] Interactive auth - credential 없이 작동
- [ ] Profile 삭제 시 credential 삭제

### Phase 3: SFTP 연결
- [ ] SFTP 탭 열림
- [ ] Credential 복원 성공
- [ ] 원격 디렉토리 목록 표시
- [ ] 디렉토리 탐색 가능
- [ ] 연결 실패 시 에러 표시

### Phase 4: Local 파일 시스템
- [ ] 로컬 홈 디렉토리 표시
- [ ] 로컬 디렉토리 탐색 가능
- [ ] 파일 크기, 수정일 표시

### Phase 5: 파일 전송
- [ ] 파일 업로드 작동
- [ ] 파일 다운로드 작동
- [ ] 전송 진행률 표시
- [ ] Drag & Drop 업로드 작동
- [ ] Drag & Drop 다운로드 작동
- [ ] 에러 처리 (권한, 용량 등)

### Phase 6: IPC
- [ ] IPC로 SFTP 탭 생성 가능
- [ ] tab-created 이벤트 수신

### Phase 7: Home 통합
- [ ] SFTP card 클릭 → SFTP 탭 열림
- [ ] SSH card 클릭 → SSH 터미널 열림 (기존 기능)

---

## 10. 추정 시간

| Phase | 작업 | 예상 시간 |
|-------|------|-----------|
| Phase 1 | Backend 기초 | 4-6시간 |
| Phase 2 | Frontend Credential | 2-3시간 |
| Phase 3 | SFTP 연결 및 기본 UI | 4-5시간 |
| Phase 4 | Local 파일 시스템 | 3-4시간 |
| Phase 5 | 파일 전송 | 4-5시간 |
| Phase 6 | IPC 통합 | 2-3시간 |
| Phase 7 | Home 통합 | 1-2시간 |
| **Total** | | **20-28시간** |

---

## 11. 성공 기준

### Must Have (MVP)
- ✅ SSH와 동일한 credential 관리 (keyring)
- ✅ SFTP 연결 및 인증
- ✅ 원격 파일 탐색
- ✅ 로컬 파일 탐색
- ✅ 파일 업로드/다운로드
- ✅ Dual-panel UI
- ✅ Home integration (card 클릭)

### Should Have (V2)
- 디렉토리 동기화
- 전송 일시정지/재개
- 전송 이력
- 파일 편집

### Nice to Have (Future)
- 북마크
- 파일 미리보기
- 권한 편집
- 심볼릭 링크 지원

---

**문서 버전**: 2.0
**최종 수정**: 2025-11-20
**상태**: 구현 준비 완료 ✅
