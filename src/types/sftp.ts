/**
 * SFTP Types for Frontend
 *
 * TypeScript types that mirror Backend Rust types for type safety
 */

/**
 * FileEntry - Represents a file or directory in SFTP
 * Mirrors: src-tauri/src/sftp/types.rs FileEntry
 */
export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modified: number; // Unix timestamp
  permissions: string;
}

/**
 * SftpConfig - SFTP connection configuration
 * Mirrors: src-tauri/src/sftp/types.rs SftpConfig
 */
export interface SftpConfig {
  host: string;
  port: number;
  username: string;
  authMethod?: SftpAuthMethod;
}

/**
 * SftpAuthMethod - Authentication method for SFTP
 * Mirrors: src-tauri/src/sftp/types.rs AuthMethod
 */
export interface SftpAuthMethod {
  type: 'password' | 'privateKey';
  password?: string;
  path?: string;
  passphrase?: string;
}

/**
 * CreateSftpResponse - Response from creating SFTP session
 * Mirrors: src-tauri/src/sftp/types.rs CreateSftpResponse
 */
export interface CreateSftpResponse {
  sessionId: string;
  host: string;
  username: string;
  initialPath: string;
}

/**
 * File transfer status
 */
export interface FileTransfer {
  id: string;
  type: 'upload' | 'download';
  localPath: string;
  remotePath: string;
  size: number;
  transferred: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  error?: string;
  startTime: number;
}

/**
 * SFTP connection state
 */
export type SftpConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

/**
 * Convert SFTPConfig (from connection.ts) to backend SftpConfig format
 */
export function toBackendSftpConfig(
  config: import('@/types/connection').SFTPConfig
): SftpConfig {
  let authMethod: SftpAuthMethod | undefined;

  if (config.password) {
    authMethod = { type: 'password', password: config.password };
  } else if (config.privateKey) {
    authMethod = {
      type: 'privateKey',
      path: config.privateKey,
      passphrase: config.passphrase,
    };
  }

  return {
    host: config.host,
    port: config.port,
    username: config.username,
    authMethod,
  };
}
