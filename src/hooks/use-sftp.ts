import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSftpStore } from '@/stores/use-sftp-store';
import type { SFTPConfig } from '@/types/connection';
import type {
  FileInfo,
  TransferDirection,
  TransferStatus,
  UploadProgressPayload,
  DownloadProgressPayload,
} from '@/types/sftp';
import { toBackendSftpConfig } from '@/types/sftp';

/**
 * SFTP 연결 상태
 */
export type SftpConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed' | 'error';

/**
 * SFTP 연결 응답 (백엔드에서 camelCase로 변환됨)
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
export function useSftpConnection(options: UseSftpConnectionOptions): UseSftpConnectionReturn {
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

        // UI config를 백엔드 config로 변환
        const backendConfig = toBackendSftpConfig(config);

        // SFTP 세션 생성
        const response = await invoke<CreateSftpResponse>('create_sftp_session', {
          config: backendConfig,
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
  navigateWithDialog: () => Promise<void>;
}

/**
 * SFTP 파일 목록 관리 훅
 */
export function useSftpFileList(options: UseSftpFileListOptions): UseSftpFileListReturn {
  const { tabId, sessionId, panelType } = options;

  // Store selectors
  const session = useSftpStore((state) => state.getSession(tabId));
  const panel = panelType === 'local' ? session?.localPanel : session?.remotePanel;

  const setLocalPath = useSftpStore((state) => state.setLocalPath);
  const setRemotePath = useSftpStore((state) => state.setRemotePath);
  const setPath = panelType === 'local' ? setLocalPath : setRemotePath;

  const setLocalFiles = useSftpStore((state) => state.setLocalFiles);
  const setRemoteFiles = useSftpStore((state) => state.setRemoteFiles);
  const setFiles = panelType === 'local' ? setLocalFiles : setRemoteFiles;

  const setLocalLoading = useSftpStore((state) => state.setLocalLoading);
  const setRemoteLoading = useSftpStore((state) => state.setRemoteLoading);
  const setLoading = panelType === 'local' ? setLocalLoading : setRemoteLoading;

  const setLocalError = useSftpStore((state) => state.setLocalError);
  const setRemoteError = useSftpStore((state) => state.setRemoteError);
  const setError = panelType === 'local' ? setLocalError : setRemoteError;

  /**
   * 디렉토리 목록 로드
   */
  const loadDirectory = useCallback(
    async (path: string) => {
      try {
        setLoading(tabId, true);
        setError(tabId, null);

        const command = panelType === 'local' ? 'list_local_directory' : 'list_remote_directory';
        const params = panelType === 'local' ? { path } : { sessionId, path };

        const files = await invoke<FileInfo[]>(command, params);

        setPath(tabId, path);
        setFiles(tabId, files);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(tabId, errorMessage);
        console.error(`Failed to load ${panelType} directory:`, err);

        // Toast 알림 표시
        toast.error('Failed to load directory', {
          description: errorMessage,
        });
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

    const path = panel.currentPath;

    // 경로 구분자 감지 (Windows: \, Unix: /)
    const separator = path.includes('\\') ? '\\' : '/';

    // 마지막 구분자 위치 찾기
    const lastSeparatorIndex = path.lastIndexOf(separator);

    if (lastSeparatorIndex < 0) {
      // 구분자가 없으면 그대로
      return;
    }

    // 상위 디렉토리 경로 추출
    let parentPath = path.substring(0, lastSeparatorIndex);

    // Windows 드라이브 루트 처리 (C: → C:\)
    if (separator === '\\' && parentPath.match(/^[A-Z]:$/i)) {
      parentPath += '\\';
    }

    // Unix 루트 처리 (빈 문자열 → /)
    if (separator === '/' && !parentPath) {
      parentPath = '/';
    }

    await loadDirectory(parentPath);
  }, [panel?.currentPath, loadDirectory]);

  /**
   * 홈 디렉토리로 이동
   */
  const navigateToHome = useCallback(async () => {
    try {
      const command = panelType === 'local' ? 'get_user_home_dir' : 'get_remote_home_dir';
      const params = panelType === 'local' ? {} : { sessionId };

      const homePath = await invoke<string>(command, params);
      await loadDirectory(homePath);
    } catch (err) {
      console.error('Failed to navigate to home:', err);
    }
  }, [panelType, sessionId, loadDirectory]);

  /**
   * 다이얼로그로 폴더 선택/경로 입력하여 이동
   * - Local: 시스템 폴더 선택 다이얼로그
   * - Remote: 경로 입력 다이얼로그 (TODO: 구현 예정)
   */
  const navigateWithDialog = useCallback(async () => {
    try {
      if (panelType === 'local') {
        // Local: Tauri 폴더 선택 다이얼로그
        const selectedPath = await open({
          directory: true,
          multiple: false,
          title: '폴더 선택',
        });

        if (selectedPath && typeof selectedPath === 'string') {
          await loadDirectory(selectedPath);
        }
      } else {
        // Remote: 경로 입력 다이얼로그 (TODO: 구현 예정)
        // 현재는 콘솔 로그만 출력
        console.log('Remote: Navigate with dialog - TODO');
      }
    } catch (err) {
      console.error('Failed to navigate with dialog:', err);
    }
  }, [panelType, loadDirectory]);

  return {
    currentPath: panel?.currentPath || '',
    files: panel?.files || [],
    loading: panel?.loading || false,
    error: panel?.error || null,
    loadDirectory,
    refresh,
    navigateUp,
    navigateToHome,
    navigateWithDialog,
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
        // 로컬은 플랫폼별 구분자, 원격은 항상 /
        const separator = panelType === 'local' ? (path.includes('\\') ? '\\' : '/') : '/';
        const fullPath = `${path}${path.endsWith(separator) ? '' : separator}${name}`;
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
  upload: (
    localPath: string,
    remotePath: string,
    fileName: string,
    fileSize: number
  ) => Promise<void>;
  download: (
    remotePath: string,
    localPath: string,
    fileName: string,
    fileSize: number
  ) => Promise<void>;
}

/**
 * SFTP 파일 전송 훅
 */
export function useSftpTransfer(options: UseSftpTransferOptions): UseSftpTransferReturn {
  const { sessionId } = options;
  const addTransfer = useSftpStore((state) => state.addTransfer);
  const updateTransferStatus = useSftpStore((state) => state.updateTransferStatus);
  const updateTransferProgress = useSftpStore((state) => state.updateTransferProgress);

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

      // 진행률 이벤트 리스너 등록
      const unlisten = await listen<UploadProgressPayload>('upload-progress', (event) => {
        const payload = event.payload;

        // 현재 전송 ID와 일치하는 경우만 업데이트
        if (payload.transferId === transferId) {
          updateTransferProgress(transferId, payload.bytes, payload.totalBytes);
        }
      });

      try {
        updateTransferStatus(transferId, 'transferring');

        await invoke('upload_file', {
          sessionId,
          localPath,
          remotePath,
          transferId,
        });

        updateTransferStatus(transferId, 'completed');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        updateTransferStatus(transferId, 'failed', errorMessage);
        throw err;
      } finally {
        // 이벤트 리스너 제거
        unlisten();
      }
    },
    [sessionId, addTransfer, updateTransferStatus, updateTransferProgress]
  );

  const download = useCallback(
    async (remotePath: string, localPath: string, fileName: string, fileSize: number) => {
      const transferId = crypto.randomUUID();

      // 전송 큐에 추가
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

      // 진행률 이벤트 리스너 등록
      const unlisten = await listen<DownloadProgressPayload>('download-progress', (event) => {
        const payload = event.payload;

        // 현재 전송 ID와 일치하는 경우만 업데이트
        if (payload.transferId === transferId) {
          updateTransferProgress(transferId, payload.bytes, payload.totalBytes);
        }
      });

      try {
        updateTransferStatus(transferId, 'transferring');

        await invoke('download_file', {
          sessionId,
          remotePath,
          localPath,
          transferId,
        });

        updateTransferStatus(transferId, 'completed');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        updateTransferStatus(transferId, 'failed', errorMessage);
        throw err;
      } finally {
        // 이벤트 리스너 제거
        unlisten();
      }
    },
    [sessionId, addTransfer, updateTransferStatus, updateTransferProgress]
  );

  return {
    upload,
    download,
  };
}
