/**
 * Keyring Types
 *
 * Types and utilities for secure credential storage using OS keychain
 */

import type { ConnectionType } from './connection';

/**
 * Keyring service types for different connection types
 */
export type KeyringService =
  | 'rusterm-ssh'
  | 'rusterm-telnet'
  | 'rusterm-rdp'
  | 'rusterm-sftp'
  | 'rusterm-local';

/**
 * Credential types that can be stored in keyring
 */
export type CredentialType = 'password' | 'privatekey' | 'passphrase';

/**
 * Generate service name for a connection type
 *
 * @param connectionType - The connection type
 * @returns The keyring service name
 */
export function getServiceName(connectionType: ConnectionType): KeyringService {
  return `rusterm-${connectionType}` as KeyringService;
}

/**
 * Generate account name for profile and credential type
 *
 * @param profileId - The profile ID
 * @param credType - The credential type
 * @returns The keyring account name
 */
export function getAccountName(profileId: string, credType: CredentialType): string {
  return `${profileId}-${credType}`;
}

/**
 * Keyring error class
 */
export class KeyringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KeyringError';
  }
}
