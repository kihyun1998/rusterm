/**
 * SFTP Types
 *
 * Types for SFTP file operations and transfer management
 */

// ============================================================================
// Backend Communication Types (1:1 match with Rust)
// ============================================================================

/**
 * SFTP authentication method (tagged union)
 * Matches: Rust AuthMethod enum with serde(tag = "type", rename_all = "camelCase")
 */
export type SftpAuthMethod =
  | { type: 'password'; password: string }
  | { type: 'privateKey'; path: string; passphrase?: string };

/**
 * SFTP configuration for backend commands
 * Matches: Rust SftpConfig struct
 */
export interface SftpConfig {
  host: string;
  port: number;
  username: string;
  authMethod?: SftpAuthMethod; // Optional authentication method
}

// ============================================================================
// Frontend State Management Types
// ============================================================================

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
export type TransferStatus = 'pending' | 'transferring' | 'completed' | 'failed' | 'cancelled';

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

// ============================================================================
// Conversion Utilities (connection.ts <-> sftp.ts)
// ============================================================================

/**
 * Convert UI SFTPConfig (connection.ts) to Backend SftpConfig (sftp.ts)
 *
 * @param uiConfig - SFTPConfig from connection.ts (flat structure)
 * @returns SftpConfig for backend commands (tagged union)
 */
export function toBackendSftpConfig(uiConfig: import('./connection').SFTPConfig): SftpConfig {
  let authMethod: SftpAuthMethod | undefined;

  if (uiConfig.password) {
    authMethod = {
      type: 'password',
      password: uiConfig.password,
    };
  } else if (uiConfig.privateKey) {
    authMethod = {
      type: 'privateKey',
      path: uiConfig.privateKey,
      passphrase: uiConfig.passphrase,
    };
  }
  // If neither password nor privateKey, authMethod remains undefined

  return {
    host: uiConfig.host,
    port: uiConfig.port,
    username: uiConfig.username,
    authMethod,
  };
}
