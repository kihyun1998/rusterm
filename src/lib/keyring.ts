/**
 * Keyring Utilities
 *
 * Functions for secure credential storage using OS keychain
 */

import { invoke } from '@tauri-apps/api/core';
import type { ConnectionType } from '@/types/connection';
import {
  getServiceName,
  getAccountName,
  type CredentialType,
  KeyringError,
} from '@/types/keyring';

/**
 * Save credential to OS keychain
 *
 * @param profileId - The profile ID
 * @param connectionType - The connection type
 * @param credentialType - The credential type (password, privatekey, passphrase)
 * @param secret - The secret to store
 * @throws {KeyringError} If saving fails
 */
export async function saveCredential(
  profileId: string,
  connectionType: ConnectionType,
  credentialType: CredentialType,
  secret: string
): Promise<void> {
  const service = getServiceName(connectionType);
  const account = getAccountName(profileId, credentialType);

  try {
    await invoke('save_credential', { service, account, secret });
  } catch (error) {
    throw new KeyringError(`Failed to save credential: ${error}`);
  }
}

/**
 * Get credential from OS keychain
 *
 * @param profileId - The profile ID
 * @param connectionType - The connection type
 * @param credentialType - The credential type (password, privatekey, passphrase)
 * @returns The secret, or null if not found
 */
export async function getCredential(
  profileId: string,
  connectionType: ConnectionType,
  credentialType: CredentialType
): Promise<string | null> {
  const service = getServiceName(connectionType);
  const account = getAccountName(profileId, credentialType);

  try {
    return await invoke<string>('get_credential', { service, account });
  } catch (error) {
    // Credential not found is expected, return null
    console.warn(`Credential not found for ${account}:`, error);
    return null;
  }
}

/**
 * Delete credential from OS keychain
 *
 * @param profileId - The profile ID
 * @param connectionType - The connection type
 * @param credentialType - The credential type (password, privatekey, passphrase)
 */
export async function deleteCredential(
  profileId: string,
  connectionType: ConnectionType,
  credentialType: CredentialType
): Promise<void> {
  const service = getServiceName(connectionType);
  const account = getAccountName(profileId, credentialType);

  try {
    await invoke('delete_credential', { service, account });
  } catch (error) {
    // Credential already deleted or not found - ignore
    console.warn(`Credential already deleted or not found for ${account}:`, error);
  }
}

/**
 * Delete all credentials for a profile
 *
 * @param profileId - The profile ID
 * @param connectionType - The connection type
 */
export async function deleteAllCredentials(
  profileId: string,
  connectionType: ConnectionType
): Promise<void> {
  const credTypes: CredentialType[] = ['password', 'privatekey', 'passphrase'];

  await Promise.all(
    credTypes.map((credType) => deleteCredential(profileId, connectionType, credType))
  );
}
