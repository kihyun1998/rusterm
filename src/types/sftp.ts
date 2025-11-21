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
