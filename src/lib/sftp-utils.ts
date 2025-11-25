/**
 * SFTP Utility Functions
 *
 * Helper functions for SFTP folder operations
 */

import { invoke } from '@tauri-apps/api/core';
import type { FileInfo } from '@/types/sftp';

/**
 * Extended FileInfo with relative path
 */
export interface FileInfoWithRelativePath extends FileInfo {
  relativePath: string;
}

/**
 * Recursively collect all files from a directory
 *
 * @param sessionId - SFTP session ID (null for local)
 * @param dirPath - Directory path to scan
 * @param isLocal - Whether this is a local directory
 * @param basePath - Base path for calculating relative paths (optional)
 * @returns Array of all files with their full paths and relative paths
 */
export async function collectFilesFromDirectory(
  sessionId: string | null,
  dirPath: string,
  isLocal: boolean,
  basePath?: string
): Promise<FileInfoWithRelativePath[]> {
  const allFiles: FileInfoWithRelativePath[] = [];
  const base = basePath || dirPath;

  try {
    // List directory contents
    const command = isLocal ? 'list_local_directory' : 'list_remote_directory';
    const params = isLocal ? { path: dirPath } : { sessionId, path: dirPath };

    const files = await invoke<FileInfo[]>(command, params);

    for (const file of files) {
      if (file.isDirectory) {
        // Recursively collect files from subdirectory
        const subFiles = await collectFilesFromDirectory(sessionId, file.path, isLocal, base);
        allFiles.push(...subFiles);
      } else {
        // Add file with relative path information
        allFiles.push({
          ...file,
          relativePath: getRelativePath(base, file.path),
        });
      }
    }
  } catch (error) {
    console.error(`Failed to collect files from ${dirPath}:`, error);
    throw error;
  }

  return allFiles;
}

/**
 * Calculate relative path from base to full path
 *
 * @param basePath - Base directory path
 * @param fullPath - Full file path
 * @returns Relative path from base to full path
 */
export function getRelativePath(basePath: string, fullPath: string): string {
  // Normalize paths (handle both / and \ separators)
  const normalizedBase = basePath.replace(/\\/g, '/');
  const normalizedFull = fullPath.replace(/\\/g, '/');

  // Remove base path from full path
  if (normalizedFull.startsWith(normalizedBase)) {
    let relative = normalizedFull.substring(normalizedBase.length);
    // Remove leading slash
    if (relative.startsWith('/')) {
      relative = relative.substring(1);
    }
    return relative;
  }

  // If not a subpath, return the filename
  const parts = normalizedFull.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Create directory path recursively
 *
 * Note: Both local and remote implementations handle recursive creation automatically.
 * - Local: Uses fs::create_dir_all (Rust std)
 * - Remote: Custom implementation that creates parent directories as needed (like mkdir -p)
 *
 * @param sessionId - SFTP session ID (null for local)
 * @param dirPath - Directory path to create
 * @param isLocal - Whether this is a local directory
 */
export async function createDirectoryRecursive(
  sessionId: string | null,
  dirPath: string,
  isLocal: boolean
): Promise<void> {
  try {
    const command = isLocal ? 'create_local_directory' : 'create_remote_directory';
    const params = isLocal ? { path: dirPath } : { sessionId, path: dirPath };

    await invoke(command, params);
  } catch (error) {
    // Ignore error if directory already exists
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes('already exists') && !errorMessage.includes('File exists')) {
      throw error;
    }
  }
}

/**
 * Calculate total size of all files in a directory
 *
 * @param files - Array of files
 * @returns Total size in bytes
 */
export function calculateTotalSize(files: FileInfo[]): number {
  return files.reduce((total, file) => total + (file.size || 0), 0);
}
