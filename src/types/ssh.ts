/**
 * SSH Types for Backend Communication
 *
 * These types match exactly with Rust backend types (src-tauri/src/ssh/types.rs)
 * Use these types when calling Tauri SSH commands
 */

// ============================================================================
// Backend Communication Types (1:1 match with Rust)
// ============================================================================

/**
 * SSH authentication method (tagged union)
 * Matches: Rust AuthMethod enum with serde(tag = "type", rename_all = "camelCase")
 */
export type AuthMethod =
  | { type: 'password'; password: string }
  | { type: 'privateKey'; path: string; passphrase?: string };

/**
 * SSH configuration for backend commands
 * Matches: Rust SshConfig struct
 */
export interface SshConfig {
  host: string;
  port: number;
  username: string;
  authMethod?: AuthMethod; // Optional - allows keyboard-interactive auth
}

/**
 * SSH session creation response
 * Matches: Rust CreateSshResponse
 */
export interface CreateSshResponse {
  session_id: string; // snake_case from Rust
  host: string;
  username: string;
}

// ============================================================================
// Frontend State Management Types
// ============================================================================

/**
 * SSH connection state
 */
export type SshConnectionState =
  | 'connecting' // Initial connection attempt
  | 'authenticating' // SSH handshake complete, authenticating
  | 'connected' // Fully connected and ready
  | 'disconnected' // User initiated disconnect
  | 'failed' // Connection/authentication failed
  | 'error'; // Runtime error

// ============================================================================
// SSH Output/Exit Events (from Backend)
// ============================================================================

/**
 * SSH output event payload
 * Matches: Rust SshOutputEvent
 */
export interface SshOutputEvent {
  session_id: string;
  data: string;
}

/**
 * SSH exit event payload
 * Matches: Rust SshExitEvent
 */
export interface SshExitEvent {
  session_id: string;
  reason: string;
}

// ============================================================================
// Conversion Utilities (connection.ts <-> ssh.ts)
// ============================================================================

/**
 * Convert UI SSHConfig (connection.ts) to Backend SshConfig (ssh.ts)
 *
 * @param uiConfig - SSHConfig from connection.ts (flat structure)
 * @returns SshConfig for backend commands (tagged union)
 */
export function toBackendSshConfig(uiConfig: import('./connection').SSHConfig): SshConfig {
  let authMethod: AuthMethod | undefined;

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
  // This allows keyboard-interactive authentication

  return {
    host: uiConfig.host,
    port: uiConfig.port,
    username: uiConfig.username,
    authMethod,
  };
}
