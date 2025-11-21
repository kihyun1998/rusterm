import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileEntry } from '@/types/sftp';

interface UseLocalFsReturn {
  // State
  currentPath: string;
  files: FileEntry[];
  isLoading: boolean;
  error: string | null;

  // Navigation
  navigateToHome: () => Promise<void>;
  navigateToDirectory: (path: string) => Promise<void>;
  navigateUp: () => Promise<void>;
  refresh: () => Promise<void>;

  // File operations
  createDirectory: (name: string) => Promise<void>;
  deleteItem: (path: string, isDir: boolean) => Promise<void>;
  renameItem: (oldPath: string, newPath: string) => Promise<void>;

  // Selection
  selectedFiles: Set<string>;
  toggleSelection: (fileName: string) => void;
  clearSelection: () => void;
}

/**
 * Hook for local file system operations
 * Provides navigation, file management, and selection state
 */
export function useLocalFs(): UseLocalFsReturn {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Use ref to track current path for consistent access
  const currentPathRef = useRef<string>('');

  /**
   * List directory contents
   */
  const listDirectory = useCallback(async (path: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const entries = await invoke<FileEntry[]>('list_local_directory', { path });
      setFiles(entries);
      setCurrentPath(path);
      currentPathRef.current = path; // Update ref
      setSelectedFiles(new Set());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('[useLocalFs] Failed to list directory:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Navigate to home directory
   */
  const navigateToHome = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const homePath = await invoke<string>('get_local_home_directory');
      await listDirectory(homePath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('[useLocalFs] Failed to navigate to home:', errorMessage);
      setIsLoading(false);
    }
  }, [listDirectory]);

  /**
   * Navigate to a specific directory
   */
  const navigateToDirectory = useCallback(async (path: string) => {
    await listDirectory(path);
  }, [listDirectory]);

  /**
   * Navigate to parent directory
   */
  const navigateUp = useCallback(async () => {
    const path = currentPathRef.current;

    if (!path) return;

    // Get parent directory path
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    const parentPath = parts.length > 0 ? '/' + parts.join('/') : '/';

    await listDirectory(parentPath);
  }, [listDirectory]);

  /**
   * Refresh current directory
   */
  const refresh = useCallback(async () => {
    if (currentPath) {
      await listDirectory(currentPath);
    }
  }, [currentPath, listDirectory]);

  /**
   * Create a new directory
   */
  const createDirectory = useCallback(async (name: string) => {
    if (!currentPath) return;

    try {
      setError(null);
      const newPath = `${currentPath}/${name}`.replace(/\/+/g, '/');

      await invoke('create_local_directory', { path: newPath });
      await refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('[useLocalFs] Failed to create directory:', errorMessage);
      throw err;
    }
  }, [currentPath, refresh]);

  /**
   * Delete a file or directory
   */
  const deleteItem = useCallback(async (path: string, isDir: boolean) => {
    try {
      setError(null);
      await invoke('delete_local_path', { path, isDir });
      await refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('[useLocalFs] Failed to delete item:', errorMessage);
      throw err;
    }
  }, [refresh]);

  /**
   * Rename or move a file or directory
   */
  const renameItem = useCallback(async (oldPath: string, newPath: string) => {
    try {
      setError(null);
      await invoke('rename_local_path', { oldPath, newPath });
      await refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('[useLocalFs] Failed to rename item:', errorMessage);
      throw err;
    }
  }, [refresh]);

  /**
   * Toggle file selection
   */
  const toggleSelection = useCallback((fileName: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }
      return next;
    });
  }, []);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  /**
   * Initialize with home directory on mount
   */
  useEffect(() => {
    navigateToHome();
  }, [navigateToHome]);

  return {
    currentPath,
    files,
    isLoading,
    error,
    navigateToHome,
    navigateToDirectory,
    navigateUp,
    refresh,
    createDirectory,
    deleteItem,
    renameItem,
    selectedFiles,
    toggleSelection,
    clearSelection,
  };
}
