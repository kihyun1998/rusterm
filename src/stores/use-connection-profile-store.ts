import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConnectionProfile, StoredConnectionProfile } from '@/types/connection';
import {
  sanitizeProfile,
  isSSHConfig,
  isRDPConfig,
  isSFTPConfig,
  getAuthMethod,
  type AuthMethod,
} from '@/types/connection';
import { saveCredential, deleteAllCredentials } from '@/lib/keyring';

interface ConnectionProfileState {
  profiles: StoredConnectionProfile[];
  recentConnections: string[]; // Profile IDs (max 10)

  // Profile management
  addProfile: (profile: ConnectionProfile) => Promise<void>;
  findOrCreateProfile: (profile: ConnectionProfile) => Promise<string>; // Returns profile ID
  updateProfile: (id: string, updates: Partial<ConnectionProfile>) => void;
  deleteProfile: (id: string) => Promise<void>;

  // Recent connections
  addToRecent: (id: string) => void;

  // Query helpers
  getRecentProfiles: (limit?: number) => StoredConnectionProfile[];
  getFavoriteProfiles: () => StoredConnectionProfile[];
  getAllProfiles: () => StoredConnectionProfile[];
  getProfileById: (id: string) => StoredConnectionProfile | undefined;
}

const MAX_RECENT_CONNECTIONS = 10;

export const useConnectionProfileStore = create<ConnectionProfileState>()(
  persist(
    (set, get) => ({
      profiles: [],
      recentConnections: [],

      addProfile: async (profile: ConnectionProfile) => {
        const { config, type, id } = profile;

        // Save sensitive information to keyring
        try {
          if (isSSHConfig(config)) {
            if (config.password) {
              await saveCredential(id, type, 'password', config.password);
            }
            if (config.privateKey) {
              await saveCredential(id, type, 'privatekey', config.privateKey);
            }
            if (config.passphrase) {
              await saveCredential(id, type, 'passphrase', config.passphrase);
            }
          } else if (isRDPConfig(config)) {
            if (config.password) {
              await saveCredential(id, type, 'password', config.password);
            }
          } else if (isSFTPConfig(config)) {
            if (config.password) {
              await saveCredential(id, type, 'password', config.password);
            }
            if (config.privateKey) {
              await saveCredential(id, type, 'privatekey', config.privateKey);
            }
            if (config.passphrase) {
              await saveCredential(id, type, 'passphrase', config.passphrase);
            }
          }
        } catch (error) {
          console.error('Failed to save credentials to keyring:', error);
          // Continue anyway - credentials can be re-entered later
        }

        // Sanitize and store in localStorage
        const sanitized = sanitizeProfile(profile);
        set((state) => ({
          profiles: [...state.profiles, sanitized],
        }));
      },

      findOrCreateProfile: async (profile: ConnectionProfile) => {
        const { config, type, name } = profile;

        // 5-condition deduplication check (only for SSH connections)
        if (type === 'ssh' && isSSHConfig(config)) {
          const authMethod = getAuthMethod(config);

          // Find existing profile with same 5 conditions
          const existing = get().profiles.find((p) => {
            if (p.type !== 'ssh' || !isSSHConfig(p.config)) return false;

            return (
              p.config.host === config.host &&
              p.config.port === config.port &&
              p.config.username === config.username &&
              getAuthMethod(p.config) === authMethod
            );
          });

          if (existing) {
            // Update existing profile
            const updates: Partial<ConnectionProfile> = {
              name: name || existing.name, // Keep existing name if not provided
              config,
              lastUsed: Date.now(),
            };

            // Save credentials to keyring
            try {
              if (config.password) {
                await saveCredential(existing.id, type, 'password', config.password);
              }
              if (config.privateKey) {
                await saveCredential(existing.id, type, 'privatekey', config.privateKey);
              }
              if (config.passphrase) {
                await saveCredential(existing.id, type, 'passphrase', config.passphrase);
              }
            } catch (error) {
              console.error('Failed to update credentials in keyring:', error);
            }

            // Update profile in store
            get().updateProfile(existing.id, updates);

            return existing.id;
          }
        }

        // No existing profile found - create new one
        await get().addProfile(profile);

        // Find and return the newly created profile ID
        const newProfile = get().profiles.find((p) =>
          p.name === profile.name &&
          p.createdAt === profile.createdAt
        );

        return newProfile?.id || profile.id;
      },

      updateProfile: (id: string, updates: Partial<ConnectionProfile>) => {
        set((state) => ({
          profiles: state.profiles.map((profile) => {
            if (profile.id === id) {
              // Merge updates with existing profile
              const merged = { ...profile, ...updates } as ConnectionProfile;
              // Update lastUsed timestamp
              merged.lastUsed = Date.now();
              // Sanitize before storing
              return sanitizeProfile(merged);
            }
            return profile;
          }),
        }));
      },

      deleteProfile: async (id: string) => {
        const profile = get().profiles.find((p) => p.id === id);

        if (profile) {
          // Delete credentials from keyring
          try {
            await deleteAllCredentials(id, profile.type);
          } catch (error) {
            console.error('Failed to delete credentials from keyring:', error);
            // Continue anyway to remove profile from localStorage
          }
        }

        // Remove from localStorage
        set((state) => ({
          profiles: state.profiles.filter((profile) => profile.id !== id),
          recentConnections: state.recentConnections.filter((recentId) => recentId !== id),
        }));
      },

      // toggleFavorite removed - favorite feature deprecated

      addToRecent: (id: string) => {
        set((state) => {
          // Remove if already exists (to move to front)
          const filtered = state.recentConnections.filter((recentId) => recentId !== id);
          // Add to front
          const updated = [id, ...filtered];
          // Keep only the last MAX_RECENT_CONNECTIONS
          return {
            recentConnections: updated.slice(0, MAX_RECENT_CONNECTIONS),
          };
        });

        // Update lastUsed timestamp
        get().updateProfile(id, { lastUsed: Date.now() } as Partial<ConnectionProfile>);
      },

      getRecentProfiles: (limit = MAX_RECENT_CONNECTIONS) => {
        const { profiles, recentConnections } = get();
        return recentConnections
          .slice(0, limit)
          .map((id) => profiles.find((profile) => profile.id === id))
          .filter((profile): profile is StoredConnectionProfile => profile !== undefined);
      },

      getFavoriteProfiles: () => {
        // Deprecated: Favorite feature removed
        // Returning empty array for backward compatibility
        // Will be removed in Phase 5
        return [];
      },

      getAllProfiles: () => {
        const { profiles } = get();
        return profiles.sort((a, b) => {
          // Sort by lastUsed (most recent first), then by name
          if (a.lastUsed && b.lastUsed) {
            return b.lastUsed - a.lastUsed;
          }
          if (a.lastUsed) return -1;
          if (b.lastUsed) return 1;
          return a.name.localeCompare(b.name);
        });
      },

      getProfileById: (id: string) => {
        const { profiles } = get();
        return profiles.find((profile) => profile.id === id);
      },
    }),
    {
      name: 'rusterm-connection-profiles', // localStorage key
      version: 2, // Incremented for favorite removal and lastUsed required migration
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Migration from v1 to v2: Remove favorite field, ensure lastUsed is set
          return {
            ...persistedState,
            profiles: (persistedState.profiles || []).map((profile: any) => {
              const { favorite, ...rest } = profile; // Remove favorite field
              return {
                ...rest,
                lastUsed: profile.lastUsed || profile.createdAt || Date.now(), // Ensure lastUsed is set
              };
            }),
          };
        }
        return persistedState;
      },
    }
  )
);
