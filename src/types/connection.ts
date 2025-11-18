/**
 * Connection Types
 *
 * Types for managing different connection types in terminal tabs
 * Supports local, SSH, Telnet, RDP, and SFTP connections
 */

// Connection type enum
export type ConnectionType = 'local' | 'ssh' | 'telnet' | 'rdp' | 'sftp';

// Local terminal configuration
export interface LocalConfig {
  shell?: string; // Shell path (null = default shell)
  cwd?: string; // Starting directory (null = home)
  env?: Record<string, string>; // Environment variables
}

// SSH connection configuration
export interface SSHConfig {
  host: string; // Hostname or IP address
  port: number; // SSH port (default: 22)
  username: string; // SSH username
  password?: string; // Password authentication (optional)
  privateKey?: string; // Private key path or content (optional)
  passphrase?: string; // Passphrase for private key (optional)
  strictHostKeyChecking?: boolean; // Verify host key (default: true)
  keepAlive?: boolean; // Keep connection alive (default: true)
}

// Telnet connection configuration
export interface TelnetConfig {
  host: string; // Hostname or IP address
  port: number; // Telnet port (default: 23)
}

// RDP connection configuration (future implementation)
export interface RDPConfig {
  host: string; // Hostname or IP address
  port: number; // RDP port (default: 3389)
  username?: string; // RDP username (optional)
  password?: string; // RDP password (optional)
  domain?: string; // Windows domain (optional)
}

// SFTP connection configuration (future implementation)
export interface SFTPConfig {
  host: string; // Hostname or IP address
  port: number; // SFTP port (default: 22)
  username: string; // SFTP username
  password?: string; // Password authentication (optional)
  privateKey?: string; // Private key path or content (optional)
  passphrase?: string; // Passphrase for private key (optional)
}

// Union type for all connection configurations
export type ConnectionConfig = LocalConfig | SSHConfig | TelnetConfig | RDPConfig | SFTPConfig;

// Connection profile for saved connections
export interface ConnectionProfile {
  id: string; // UUID
  name: string; // User-defined profile name
  icon?: string; // Lucide icon name (optional)
  type: ConnectionType; // Connection type
  config: ConnectionConfig; // Type-specific configuration
  favorite: boolean; // Favorite status
  lastUsed?: number; // Last used timestamp (optional)
  tags?: string[]; // Tags for search/categorization (optional)
  createdAt: number; // Creation timestamp
}

// Type guards for connection config
export function isLocalConfig(config: ConnectionConfig): config is LocalConfig {
  return !('host' in config);
}

export function isSSHConfig(config: ConnectionConfig): config is SSHConfig {
  return 'host' in config && 'username' in config && !('domain' in config);
}

export function isTelnetConfig(config: ConnectionConfig): config is TelnetConfig {
  return 'host' in config && !('username' in config) && 'port' in config;
}

export function isRDPConfig(config: ConnectionConfig): config is RDPConfig {
  return 'host' in config && 'domain' in config;
}

export function isSFTPConfig(config: ConnectionConfig): config is SFTPConfig {
  return 'host' in config && 'username' in config && 'privateKey' in config;
}
