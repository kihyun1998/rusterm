import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CreateSftpResponse,
  FileEntry,
  SftpConfig,
  SftpConnectionState,
} from '@/types/sftp';

interface UseSftpOptions {
  onConnectionChange?: (status: SftpConnectionState) => void;
  onError?: (error: string) => void;
}

interface UseSftpReturn {
  sessionId: string | null;
  status: SftpConnectionState;
  error: string | null;
  currentPath: string;
  fileList: FileEntry[];
  isLoading: boolean;

  // Actions
  connect: (config: SftpConfig, sessionId: string) => Promise<void>;
  listDirectory: (path: string) => Promise<void>;
  changeDirectory: (path: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
  deleteFile: (path: string, isDir: boolean) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

/**
 * Custom hook for managing SFTP sessions
 * Handles creation, file operations, and cleanup of SFTP connections
 */
export function useSftp(options: UseSftpOptions = {}): UseSftpReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SftpConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [fileList, setFileList] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Use refs to store state to avoid recreating functions
  const sessionIdRef = useRef<string | null>(null);
  const onConnectionChangeRef = useRef(options.onConnectionChange);
  const onErrorRef = useRef(options.onError);

  // Update refs when callbacks change
  useEffect(() => {
    onConnectionChangeRef.current = options.onConnectionChange;
    onErrorRef.current = options.onError;
  }, [options.onConnectionChange, options.onError]);

  // Update sessionId ref when state changes
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  /**
   * Create a new SFTP session and connect
   */
  const connect = useCallback(async (config: SftpConfig, sessionId: string) => {
    try {
      setError(null);
      setStatus('connecting');
      onConnectionChangeRef.current?.('connecting');

      // Call Tauri command to create SFTP session
      const response = await invoke<CreateSftpResponse>('create_sftp_session', {
        config,
        sessionId,
      });

      setSessionId(response.sessionId);
      sessionIdRef.current = response.sessionId;
      setCurrentPath(response.initialPath);
      setStatus('connected');
      onConnectionChangeRef.current?.('connected');

      // Load initial directory inline to avoid timing issues
      setIsLoading(true);
      try {
        console.log('[useSftp] Loading initial directory:', {
          sessionId: response.sessionId,
          path: response.initialPath,
        });

        const files = await invoke<FileEntry[]>('sftp_list_directory', {
          session_id: response.sessionId, // Use snake_case for Rust
          path: response.initialPath,
        });
        setFileList(files);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('Failed to load initial directory:', errorMessage);
        setError(errorMessage);
        onErrorRef.current?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setStatus('failed');
      onConnectionChangeRef.current?.('failed');
      onErrorRef.current?.(errorMessage);
      console.error('Failed to create SFTP session:', err);
    }
  }, []);

  /**
   * List files in a directory
   */
  const listDirectory = useCallback(async (path: string) => {
    if (!sessionIdRef.current) {
      console.warn('Cannot list directory: not connected');
      return;
    }

    setIsLoading(true);
    try {
      const files = await invoke<FileEntry[]>('sftp_list_directory', {
        session_id: sessionIdRef.current,
        path,
      });

      setFileList(files);
      setCurrentPath(path);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      onErrorRef.current?.(errorMessage);
      console.error('Failed to list directory:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Change to a different directory
   */
  const changeDirectory = useCallback(
    async (path: string) => {
      await listDirectory(path);
    },
    [listDirectory]
  );

  /**
   * Create a new directory
   */
  const createDirectory = useCallback(async (path: string) => {
    if (!sessionIdRef.current) {
      console.warn('Cannot create directory: not connected');
      return;
    }

    try {
      await invoke('sftp_create_directory', {
        session_id: sessionIdRef.current,
        path,
      });

      // Refresh current directory
      await listDirectory(currentPath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      onErrorRef.current?.(errorMessage);
      console.error('Failed to create directory:', err);
    }
  }, [currentPath, listDirectory]);

  /**
   * Delete a file or directory
   */
  const deleteFile = useCallback(
    async (path: string, isDir: boolean) => {
      if (!sessionIdRef.current) {
        console.warn('Cannot delete file: not connected');
        return;
      }

      try {
        await invoke('sftp_delete_path', {
          session_id: sessionIdRef.current,
          path,
          is_dir: isDir,
        });

        // Refresh current directory
        await listDirectory(currentPath);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        onErrorRef.current?.(errorMessage);
        console.error('Failed to delete file:', err);
      }
    },
    [currentPath, listDirectory]
  );

  /**
   * Rename a file or directory
   */
  const renameFile = useCallback(
    async (oldPath: string, newPath: string) => {
      if (!sessionIdRef.current) {
        console.warn('Cannot rename file: not connected');
        return;
      }

      try {
        await invoke('sftp_rename_path', {
          session_id: sessionIdRef.current,
          old_path: oldPath,
          new_path: newPath,
        });

        // Refresh current directory
        await listDirectory(currentPath);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        onErrorRef.current?.(errorMessage);
        console.error('Failed to rename file:', err);
      }
    },
    [currentPath, listDirectory]
  );

  /**
   * Disconnect SFTP session
   */
  const disconnect = useCallback(async () => {
    if (!sessionIdRef.current) {
      return;
    }

    try {
      // Close SFTP session
      await invoke('close_sftp_session', {
        session_id: sessionIdRef.current,
      });

      setSessionId(null);
      sessionIdRef.current = null;
      setStatus('disconnected');
      setCurrentPath('/');
      setFileList([]);
      onConnectionChangeRef.current?.('disconnected');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Failed to close SFTP session:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        // Disconnect without waiting
        invoke('close_sftp_session', {
          session_id: sessionIdRef.current,
        }).catch(console.error);
      }
    };
  }, []);

  return {
    sessionId,
    status,
    error,
    currentPath,
    fileList,
    isLoading,
    connect,
    listDirectory,
    changeDirectory,
    createDirectory,
    deleteFile,
    renameFile,
    disconnect,
  };
}
