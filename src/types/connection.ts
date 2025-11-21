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

// Auth method types for UI display
export type AuthMethod = 'password' | 'privateKey' | 'noAuth';

/**
 * Get authentication method from connection profile
 * Used for UI display in ConnectionCard
 */
export function getAuthMethod(profile: {
  type: ConnectionType;
  savedAuthType?: 'password' | 'privateKey' | 'passphrase' | 'interactive'
}): AuthMethod {
  if (profile.type === 'ssh') {
    // Both passphrase and privateKey display as "Private Key" in UI
    if (profile.savedAuthType === 'passphrase' || profile.savedAuthType === 'privateKey') {
      return 'privateKey';
    }
    if (profile.savedAuthType === 'password') {
      return 'password';
    }
    return 'noAuth'; // interactive or undefined
  }
  return 'noAuth';
}

// Connection profile for saved connections
export interface ConnectionProfile {
  id: string; // UUID
  name: string; // User-defined profile name (default: host address)
  icon?: string; // Lucide icon name (optional)
  type: ConnectionType; // Connection type
  config: ConnectionConfig; // Type-specific configuration
  savedAuthType?: 'password' | 'privateKey' | 'passphrase' | 'interactive'; // Auth type saved in keyring (for UI display)
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
  return (
    'host' in config &&
    'username' in config &&
    !('domain' in config) &&
    !('strictHostKeyChecking' in config) &&
    !('keepAlive' in config)
  );
}

// Stored connection config types (sensitive information excluded)
export type StoredSSHConfig = Omit<SSHConfig, 'password' | 'privateKey' | 'passphrase'>;
export type StoredRDPConfig = Omit<RDPConfig, 'password'>;
export type StoredSFTPConfig = Omit<SFTPConfig, 'password' | 'privateKey' | 'passphrase'>;

// Union type for stored connection configurations (no sensitive data)
export type StoredConnectionConfig =
  | LocalConfig // No sensitive information
  | StoredSSHConfig
  | TelnetConfig // No sensitive information
  | StoredRDPConfig
  | StoredSFTPConfig;

// Stored connection profile (sensitive information excluded)
export type StoredConnectionProfile = Omit<ConnectionProfile, 'config'> & {
  config: StoredConnectionConfig;
};

// Utility function to sanitize connection profile by removing sensitive information
export function sanitizeProfile(profile: ConnectionProfile): StoredConnectionProfile {
  const { config, ...rest } = profile;

  let sanitizedConfig: StoredConnectionConfig;

  if (isSSHConfig(config)) {
    const { password, privateKey, passphrase, ...sshRest } = config;
    sanitizedConfig = sshRest as StoredSSHConfig;
  } else if (isRDPConfig(config)) {
    const { password, ...rdpRest } = config;
    sanitizedConfig = rdpRest as StoredRDPConfig;
  } else if (isSFTPConfig(config)) {
    const { password, privateKey, passphrase, ...sftpRest } = config;
    sanitizedConfig = sftpRest as StoredSFTPConfig;
  } else {
    // LocalConfig or TelnetConfig - no sensitive information
    sanitizedConfig = config as StoredConnectionConfig;
  }

  return {
    ...rest,
    config: sanitizedConfig,
  };
}
