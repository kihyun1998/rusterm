import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConnectionProfile, StoredConnectionProfile } from '@/types/connection';
import {
  sanitizeProfile,
  isSSHConfig,
  isRDPConfig,
  isSFTPConfig,
} from '@/types/connection';
import { saveCredential, deleteAllCredentials } from '@/lib/keyring';

interface ConnectionProfileState {
  profiles: StoredConnectionProfile[];
  recentConnections: string[]; // Profile IDs (max 10)

  // Profile management
  addProfile: (profile: ConnectionProfile) => Promise<void>;
  updateProfile: (id: string, updates: Partial<ConnectionProfile>) => void;
  deleteProfile: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;

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

      toggleFavorite: (id: string) => {
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === id ? { ...profile, favorite: !profile.favorite } : profile
          ),
        }));
      },

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
        const { profiles } = get();
        return profiles
          .filter((profile) => profile.favorite)
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort by name
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
      version: 1,
    }
  )
);
