# Phase 2: Frontend 기본 구조 - 상세 구현 계획

## 📋 현재 코드 구조 분석

### Store 패턴 (Zustand)
- **파일**: `src/stores/use-tab-store.ts`, `use-connection-profile-store.ts`
- **패턴**: `create<State>()` 또는 `create<State>()(persist(...))`
- **구조**:
  ```typescript
  interface State {
    // 상태 필드
    // 액션 함수들
  }
  export const useStore = create<State>((set, get) => ({
    // 초기값
    // 액션 구현
  }));
  ```

### Hooks 패턴
- **파일**: `src/hooks/use-ssh.ts`, `use-pty.ts`
- **패턴**:
  - `useCallback` + `useRef`로 안정적인 함수 참조 유지
  - Tauri `invoke` 사용
  - Event listener 관리 (`listen`, `unlisten`)
  - Cleanup in `useEffect`

### Tab Store 구조
- **현재 TabType**: `'home' | 'terminal'`
- **필요 수정**: `'home' | 'terminal' | 'sftp'` 추가
- **Tab 인터페이스**: `connectionType`, `connectionProfileId` 필드 사용

---

## 📝 Task 2.1: Tab Store 수정

### 수정할 파일: `src/stores/use-tab-store.ts`

#### 1. TabType 확장 (5번째 줄)
```typescript
// 현재
export type TabType = 'home' | 'terminal';

// 변경 후
export type TabType = 'home' | 'terminal' | 'sftp';
```

#### 2. Tab 인터페이스에 SFTP 전용 필드 추가 (7-18번째 줄)
```typescript
export interface Tab {
  id: string;
  title: string;
  type: TabType;
  closable: boolean;
  ptyId?: number;
  isActive: boolean;
  workingDirectory?: string;
  // Connection-related fields
  connectionType?: ConnectionType;
  connectionProfileId?: string;
  // SFTP-specific fields
  sftpSessionId?: string; // SFTP 세션 ID (backend에서 생성)
}
```

**참고**: 기존 `connectionType`과 `connectionProfileId`를 재사용하므로 큰 변경 없음

---

## 📝 Task 2.2: SFTP Store 생성

### 신규 파일: `src/stores/use-sftp-store.ts`

```typescript
import { create } from 'zustand';
import type { FileInfo, TransferItem } from '@/types/sftp';

/**
 * 패널 상태 (로컬 또는 원격)
 */
interface PanelState {
  currentPath: string;
  files: FileInfo[];
  selectedFiles: Set<string>; // file paths
  loading: boolean;
  error: string | null;
}

/**
 * SFTP 세션별 상태
 */
interface SessionState {
  tabId: string;
  sessionId: string; // Backend SFTP session ID
  localPanel: PanelState;
  remotePanel: PanelState;
}

/**
 * SFTP Store 상태 및 액션
 */
interface SftpStore {
  // 상태
  sessions: Record<string, SessionState>; // tabId -> SessionState
  transferQueue: TransferItem[];

  // 세션 관리
  initSession: (
    tabId: string,
    sessionId: string,
    localHome: string,
    remoteHome: string
  ) => void;
  removeSession: (tabId: string) => void;
  getSession: (tabId: string) => SessionState | undefined;

  // 로컬 패널 상태
  setLocalPath: (tabId: string, path: string) => void;
  setLocalFiles: (tabId: string, files: FileInfo[]) => void;
  setLocalLoading: (tabId: string, loading: boolean) => void;
  setLocalError: (tabId: string, error: string | null) => void;
  toggleLocalFileSelection: (tabId: string, filePath: string, multiSelect?: boolean) => void;
  clearLocalSelection: (tabId: string) => void;
  getLocalSelectedFiles: (tabId: string) => string[];

  // 원격 패널 상태
  setRemotePath: (tabId: string, path: string) => void;
  setRemoteFiles: (tabId: string, files: FileInfo[]) => void;
  setRemoteLoading: (tabId: string, loading: boolean) => void;
  setRemoteError: (tabId: string, error: string | null) => void;
  toggleRemoteFileSelection: (tabId: string, filePath: string, multiSelect?: boolean) => void;
  clearRemoteSelection: (tabId: string) => void;
  getRemoteSelectedFiles: (tabId: string) => string[];

  // 전송 큐 관리
  addTransfer: (item: TransferItem) => void;
  updateTransferProgress: (transferId: string, bytes: number, totalBytes: number) => void;
  updateTransferStatus: (
    transferId: string,
    status: TransferItem['status'],
    error?: string
  ) => void;
  removeTransfer: (transferId: string) => void;
  clearCompletedTransfers: () => void;
}

export const useSftpStore = create<SftpStore>((set, get) => ({
  sessions: {},
  transferQueue: [],

  // 세션 관리
  initSession: (tabId, sessionId, localHome, remoteHome) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [tabId]: {
          tabId,
          sessionId,
          localPanel: {
            currentPath: localHome,
            files: [],
            selectedFiles: new Set(),
            loading: false,
            error: null,
          },
          remotePanel: {
            currentPath: remoteHome,
            files: [],
            selectedFiles: new Set(),
            loading: false,
            error: null,
          },
        },
      },
    })),

  removeSession: (tabId) =>
    set((state) => {
      const { [tabId]: removed, ...rest } = state.sessions;
      return { sessions: rest };
    }),

  getSession: (tabId) => get().sessions[tabId],

  // 로컬 패널 상태
  setLocalPath: (tabId, path) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            localPanel: {
              ...session.localPanel,
              currentPath: path,
            },
          },
        },
      };
    }),

  setLocalFiles: (tabId, files) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            localPanel: {
              ...session.localPanel,
              files,
            },
          },
        },
      };
    }),

  setLocalLoading: (tabId, loading) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            localPanel: {
              ...session.localPanel,
              loading,
            },
          },
        },
      };
    }),

  setLocalError: (tabId, error) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            localPanel: {
              ...session.localPanel,
              error,
            },
          },
        },
      };
    }),

  toggleLocalFileSelection: (tabId, filePath, multiSelect = false) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;

      const selectedFiles = new Set(session.localPanel.selectedFiles);

      if (!multiSelect) {
        // 단일 선택 모드
        if (selectedFiles.has(filePath)) {
          selectedFiles.delete(filePath);
        } else {
          selectedFiles.clear();
          selectedFiles.add(filePath);
        }
      } else {
        // 다중 선택 모드 (Ctrl+Click)
        if (selectedFiles.has(filePath)) {
          selectedFiles.delete(filePath);
        } else {
          selectedFiles.add(filePath);
        }
      }

      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            localPanel: {
              ...session.localPanel,
              selectedFiles,
            },
          },
        },
      };
    }),

  clearLocalSelection: (tabId) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            localPanel: {
              ...session.localPanel,
              selectedFiles: new Set(),
            },
          },
        },
      };
    }),

  getLocalSelectedFiles: (tabId) => {
    const session = get().sessions[tabId];
    return session ? Array.from(session.localPanel.selectedFiles) : [];
  },

  // 원격 패널 상태 (로컬과 동일한 패턴)
  setRemotePath: (tabId, path) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            remotePanel: {
              ...session.remotePanel,
              currentPath: path,
            },
          },
        },
      };
    }),

  setRemoteFiles: (tabId, files) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            remotePanel: {
              ...session.remotePanel,
              files,
            },
          },
        },
      };
    }),

  setRemoteLoading: (tabId, loading) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            remotePanel: {
              ...session.remotePanel,
              loading,
            },
          },
        },
      };
    }),

  setRemoteError: (tabId, error) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            remotePanel: {
              ...session.remotePanel,
              error,
            },
          },
        },
      };
    }),

  toggleRemoteFileSelection: (tabId, filePath, multiSelect = false) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;

      const selectedFiles = new Set(session.remotePanel.selectedFiles);

      if (!multiSelect) {
        if (selectedFiles.has(filePath)) {
          selectedFiles.delete(filePath);
        } else {
          selectedFiles.clear();
          selectedFiles.add(filePath);
        }
      } else {
        if (selectedFiles.has(filePath)) {
          selectedFiles.delete(filePath);
        } else {
          selectedFiles.add(filePath);
        }
      }

      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            remotePanel: {
              ...session.remotePanel,
              selectedFiles,
            },
          },
        },
      };
    }),

  clearRemoteSelection: (tabId) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            remotePanel: {
              ...session.remotePanel,
              selectedFiles: new Set(),
            },
          },
        },
      };
    }),

  getRemoteSelectedFiles: (tabId) => {
    const session = get().sessions[tabId];
    return session ? Array.from(session.remotePanel.selectedFiles) : [];
  },

  // 전송 큐 관리
  addTransfer: (item) =>
    set((state) => ({
      transferQueue: [...state.transferQueue, item],
    })),

  updateTransferProgress: (transferId, bytes, totalBytes) =>
    set((state) => ({
      transferQueue: state.transferQueue.map((item) =>
        item.id === transferId
          ? {
              ...item,
              progress: {
                bytes,
                totalBytes,
                percentage: Math.round((bytes / totalBytes) * 100),
              },
            }
          : item
      ),
    })),

  updateTransferStatus: (transferId, status, error) =>
    set((state) => ({
      transferQueue: state.transferQueue.map((item) =>
        item.id === transferId
          ? {
              ...item,
              status,
              error,
            }
          : item
      ),
    })),

  removeTransfer: (transferId) =>
    set((state) => ({
      transferQueue: state.transferQueue.filter((item) => item.id !== transferId),
    })),

  clearCompletedTransfers: () =>
    set((state) => ({
      transferQueue: state.transferQueue.filter(
        (item) => item.status !== 'completed' && item.status !== 'failed'
      ),
    })),
}));
```

---

## 📝 Task 2.3: SFTP Hooks 생성

### 신규 파일: `src/hooks/use-sftp.ts`

```typescript
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useRef, useState } from 'react';
import { useSftpStore } from '@/stores/use-sftp-store';
import type { FileInfo, TransferDirection, TransferStatus } from '@/types/sftp';
import type { SFTPConfig } from '@/types/connection';

/**
 * SFTP 연결 상태
 */
export type SftpConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed' | 'error';

/**
 * SFTP 연결 응답
 */
interface CreateSftpResponse {
  sessionId: string;
  host: string;
  username: string;
}

// ==================== useSftpConnection ====================

interface UseSftpConnectionOptions {
  tabId: string;
  onStateChange?: (state: SftpConnectionState) => void;
}

interface UseSftpConnectionReturn {
  sessionId: string | null;
  status: SftpConnectionState;
  error: string | null;
  connect: (config: SFTPConfig) => Promise<void>;
  disconnect: () => Promise<void>;
}

/**
 * SFTP 연결 관리 훅
 */
export function useSftpConnection(
  options: UseSftpConnectionOptions
): UseSftpConnectionReturn {
  const { tabId, onStateChange } = options;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SftpConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const onStateChangeRef = useRef(onStateChange);

  // Update callback ref
  onStateChangeRef.current = onStateChange;

  const initSession = useSftpStore((state) => state.initSession);
  const removeSession = useSftpStore((state) => state.removeSession);

  /**
   * SFTP 연결 생성
   */
  const connect = useCallback(
    async (config: SFTPConfig) => {
      try {
        setError(null);
        setStatus('connecting');
        onStateChangeRef.current?.('connecting');

        // SFTP 세션 생성
        const response = await invoke<CreateSftpResponse>('create_sftp_session', {
          config,
        });

        setSessionId(response.sessionId);
        sessionIdRef.current = response.sessionId;
        setStatus('connected');
        onStateChangeRef.current?.('connected');

        // 홈 디렉토리 조회
        const [localHome, remoteHome] = await Promise.all([
          invoke<string>('get_user_home_dir'),
          invoke<string>('get_remote_home_dir', { sessionId: response.sessionId }),
        ]);

        // Store에 세션 초기화
        initSession(tabId, response.sessionId, localHome, remoteHome);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        setStatus('failed');
        onStateChangeRef.current?.('failed');
        console.error('Failed to create SFTP session:', err);
      }
    },
    [tabId, initSession]
  );

  /**
   * SFTP 연결 종료
   */
  const disconnect = useCallback(async () => {
    if (!sessionIdRef.current) {
      return;
    }

    try {
      await invoke('close_sftp_session', {
        sessionId: sessionIdRef.current,
      });

      setSessionId(null);
      sessionIdRef.current = null;
      setStatus('disconnected');
      onStateChangeRef.current?.('disconnected');
      removeSession(tabId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Failed to close SFTP session:', err);
    }
  }, [tabId, removeSession]);

  return {
    sessionId,
    status,
    error,
    connect,
    disconnect,
  };
}

// ==================== useSftpFileList ====================

interface UseSftpFileListOptions {
  tabId: string;
  sessionId: string | null;
  panelType: 'local' | 'remote';
}

interface UseSftpFileListReturn {
  currentPath: string;
  files: FileInfo[];
  loading: boolean;
  error: string | null;
  loadDirectory: (path: string) => Promise<void>;
  refresh: () => Promise<void>;
  navigateUp: () => Promise<void>;
  navigateToHome: () => Promise<void>;
}

/**
 * SFTP 파일 목록 관리 훅
 */
export function useSftpFileList(options: UseSftpFileListOptions): UseSftpFileListReturn {
  const { tabId, sessionId, panelType } = options;

  // Store selectors
  const session = useSftpStore((state) => state.getSession(tabId));
  const panel = panelType === 'local' ? session?.localPanel : session?.remotePanel;

  const setPath =
    panelType === 'local'
      ? useSftpStore((state) => state.setLocalPath)
      : useSftpStore((state) => state.setRemotePath);

  const setFiles =
    panelType === 'local'
      ? useSftpStore((state) => state.setLocalFiles)
      : useSftpStore((state) => state.setRemoteFiles);

  const setLoading =
    panelType === 'local'
      ? useSftpStore((state) => state.setLocalLoading)
      : useSftpStore((state) => state.setRemoteLoading);

  const setError =
    panelType === 'local'
      ? useSftpStore((state) => state.setLocalError)
      : useSftpStore((state) => state.setRemoteError);

  /**
   * 디렉토리 목록 로드
   */
  const loadDirectory = useCallback(
    async (path: string) => {
      try {
        setLoading(tabId, true);
        setError(tabId, null);

        const command =
          panelType === 'local' ? 'list_local_directory' : 'list_remote_directory';
        const params =
          panelType === 'local' ? { path } : { sessionId, path };

        const files = await invoke<FileInfo[]>(command, params);

        setPath(tabId, path);
        setFiles(tabId, files);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(tabId, errorMessage);
        console.error(`Failed to load ${panelType} directory:`, err);
      } finally {
        setLoading(tabId, false);
      }
    },
    [tabId, sessionId, panelType, setPath, setFiles, setLoading, setError]
  );

  /**
   * 현재 디렉토리 새로고침
   */
  const refresh = useCallback(async () => {
    if (panel?.currentPath) {
      await loadDirectory(panel.currentPath);
    }
  }, [panel?.currentPath, loadDirectory]);

  /**
   * 상위 디렉토리로 이동
   */
  const navigateUp = useCallback(async () => {
    if (!panel?.currentPath) return;

    const pathParts = panel.currentPath.split('/').filter(Boolean);
    if (pathParts.length === 0) return;

    pathParts.pop();
    const parentPath = '/' + pathParts.join('/');
    await loadDirectory(parentPath || '/');
  }, [panel?.currentPath, loadDirectory]);

  /**
   * 홈 디렉토리로 이동
   */
  const navigateToHome = useCallback(async () => {
    try {
      const command =
        panelType === 'local' ? 'get_user_home_dir' : 'get_remote_home_dir';
      const params = panelType === 'local' ? {} : { sessionId };

      const homePath = await invoke<string>(command, params);
      await loadDirectory(homePath);
    } catch (err) {
      console.error('Failed to navigate to home:', err);
    }
  }, [panelType, sessionId, loadDirectory]);

  return {
    currentPath: panel?.currentPath || '',
    files: panel?.files || [],
    loading: panel?.loading || false,
    error: panel?.error || null,
    loadDirectory,
    refresh,
    navigateUp,
    navigateToHome,
  };
}

// ==================== useSftpFileOperations ====================

interface UseSftpFileOperationsOptions {
  tabId: string;
  sessionId: string | null;
  panelType: 'local' | 'remote';
  onSuccess?: () => void;
}

interface UseSftpFileOperationsReturn {
  createDirectory: (path: string, name: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  deleteDirectory: (path: string) => Promise<void>;
  renameItem: (oldPath: string, newPath: string) => Promise<void>;
}

/**
 * SFTP 파일 작업 훅
 */
export function useSftpFileOperations(
  options: UseSftpFileOperationsOptions
): UseSftpFileOperationsReturn {
  const { sessionId, panelType, onSuccess } = options;

  const createDirectory = useCallback(
    async (path: string, name: string) => {
      try {
        const fullPath = `${path}/${name}`;
        const command =
          panelType === 'local' ? 'create_local_directory' : 'create_remote_directory';
        const params = panelType === 'local' ? { path: fullPath } : { sessionId, path: fullPath };

        await invoke(command, params);
        onSuccess?.();
      } catch (err) {
        console.error('Failed to create directory:', err);
        throw err;
      }
    },
    [sessionId, panelType, onSuccess]
  );

  const deleteFile = useCallback(
    async (path: string) => {
      try {
        const command = panelType === 'local' ? 'delete_local_file' : 'delete_remote_file';
        const params = panelType === 'local' ? { path } : { sessionId, path };

        await invoke(command, params);
        onSuccess?.();
      } catch (err) {
        console.error('Failed to delete file:', err);
        throw err;
      }
    },
    [sessionId, panelType, onSuccess]
  );

  const deleteDirectory = useCallback(
    async (path: string) => {
      try {
        const command =
          panelType === 'local' ? 'delete_local_directory' : 'delete_remote_directory';
        const params = panelType === 'local' ? { path } : { sessionId, path };

        await invoke(command, params);
        onSuccess?.();
      } catch (err) {
        console.error('Failed to delete directory:', err);
        throw err;
      }
    },
    [sessionId, panelType, onSuccess]
  );

  const renameItem = useCallback(
    async (oldPath: string, newPath: string) => {
      try {
        const command = panelType === 'local' ? 'rename_local_item' : 'rename_remote_item';
        const params =
          panelType === 'local' ? { oldPath, newPath } : { sessionId, oldPath, newPath };

        await invoke(command, params);
        onSuccess?.();
      } catch (err) {
        console.error('Failed to rename item:', err);
        throw err;
      }
    },
    [sessionId, panelType, onSuccess]
  );

  return {
    createDirectory,
    deleteFile,
    deleteDirectory,
    renameItem,
  };
}

// ==================== useSftpTransfer ====================

interface UseSftpTransferOptions {
  tabId: string;
  sessionId: string | null;
}

interface UseSftpTransferReturn {
  upload: (localPath: string, remotePath: string, fileName: string, fileSize: number) => Promise<void>;
  download: (remotePath: string, localPath: string, fileName: string, fileSize: number) => Promise<void>;
}

/**
 * SFTP 파일 전송 훅
 */
export function useSftpTransfer(options: UseSftpTransferOptions): UseSftpTransferReturn {
  const { sessionId } = options;
  const addTransfer = useSftpStore((state) => state.addTransfer);
  const updateTransferStatus = useSftpStore((state) => state.updateTransferStatus);

  const upload = useCallback(
    async (localPath: string, remotePath: string, fileName: string, fileSize: number) => {
      const transferId = crypto.randomUUID();

      // 전송 큐에 추가
      addTransfer({
        id: transferId,
        fileName,
        fileSize,
        sourcePath: localPath,
        destinationPath: remotePath,
        direction: 'upload' as TransferDirection,
        status: 'pending' as TransferStatus,
        progress: {
          bytes: 0,
          totalBytes: fileSize,
          percentage: 0,
        },
      });

      try {
        updateTransferStatus(transferId, 'transferring');

        await invoke('upload_file', {
          sessionId,
          localPath,
          remotePath,
        });

        updateTransferStatus(transferId, 'completed');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        updateTransferStatus(transferId, 'failed', errorMessage);
        throw err;
      }
    },
    [sessionId, addTransfer, updateTransferStatus]
  );

  const download = useCallback(
    async (remotePath: string, localPath: string, fileName: string, fileSize: number) => {
      const transferId = crypto.randomUUID();

      addTransfer({
        id: transferId,
        fileName,
        fileSize,
        sourcePath: remotePath,
        destinationPath: localPath,
        direction: 'download' as TransferDirection,
        status: 'pending' as TransferStatus,
        progress: {
          bytes: 0,
          totalBytes: fileSize,
          percentage: 0,
        },
      });

      try {
        updateTransferStatus(transferId, 'transferring');

        await invoke('download_file', {
          sessionId,
          remotePath,
          localPath,
        });

        updateTransferStatus(transferId, 'completed');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        updateTransferStatus(transferId, 'failed', errorMessage);
        throw err;
      }
    },
    [sessionId, addTransfer, updateTransferStatus]
  );

  return {
    upload,
    download,
  };
}
```

---

## 📝 Task 2.4: Store Index 업데이트

### 수정할 파일: `src/stores/index.ts`

```typescript
// 현재 파일 내용 확인 후 추가
export { useSftpStore } from './use-sftp-store';
```

---

## ✅ Phase 2 체크리스트

### Task 2.1: Tab Store 수정
- [ ] `src/stores/use-tab-store.ts` 수정
  - [ ] TabType에 'sftp' 추가
  - [ ] Tab 인터페이스에 sftpSessionId 필드 추가 (선택)

### Task 2.2: SFTP Store 생성
- [ ] `src/stores/use-sftp-store.ts` 생성
  - [ ] PanelState, SessionState 인터페이스 정의
  - [ ] SftpStore 인터페이스 정의 (30+ 메서드)
  - [ ] Zustand store 구현

### Task 2.3: SFTP Hooks 생성
- [ ] `src/hooks/use-sftp.ts` 생성
  - [ ] useSftpConnection: 연결 관리
  - [ ] useSftpFileList: 파일 목록 관리
  - [ ] useSftpFileOperations: 파일 작업
  - [ ] useSftpTransfer: 파일 전송

### Task 2.4: Store Index 업데이트
- [ ] `src/stores/index.ts`에 useSftpStore export 추가

### 테스트
- [ ] TypeScript 컴파일: `pnpm run build`
- [ ] 타입 에러 없이 통과

---

## 📊 예상 작업 시간

- **Task 2.1**: Tab Store 수정 - 10분
- **Task 2.2**: SFTP Store 생성 - 1-2시간
- **Task 2.3**: SFTP Hooks 생성 - 2-3시간
- **Task 2.4**: Store Index 업데이트 - 5분

**총 예상 시간**: 4-6시간

---

## ⚠️ 주의사항

1. **Set을 Zustand에서 사용할 때**
   - `Set<string>`을 직접 저장하면 불변성 관리가 어려움
   - 매번 `new Set()`으로 새 인스턴스 생성 필요

2. **Hooks에서 Ref 사용**
   - `sessionId`, `onSuccess` 등은 ref로 관리하여 불필요한 재생성 방지
   - `useCallback` 의존성 최소화

3. **Store의 Session 조회**
   - `getSession`을 selector로 사용하면 불필요한 리렌더링 발생
   - 필요한 필드만 선택적으로 구독

4. **전송 진행률**
   - Phase 2에서는 기본 구조만 구현
   - 실제 진행률은 Phase 7에서 청크 전송과 함께 구현

---

**작성일**: 2025-11-21
**Phase**: 2 / 9
