import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deleteAllCredentials } from '@/lib/keyring';
import type { ConnectionProfile, StoredConnectionProfile } from '@/types/connection';
import { isSSHConfig, sanitizeProfile } from '@/types/connection';

interface ConnectionProfileState {
  profiles: StoredConnectionProfile[];
  recentConnections: string[]; // Profile IDs (max 10)

  // Profile management
  addProfile: (profile: ConnectionProfile) => Promise<string>; // Returns profile ID
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
        // NOTE: Credentials are NOT saved here - they should be saved by the caller
        // using the profile ID returned from this function

        // Sanitize and store in localStorage (credentials already removed by sanitize)
        const sanitized = sanitizeProfile(profile);
        set((state) => ({
          profiles: [...state.profiles, sanitized],
        }));

        // Return the profile ID
        return profile.id;
      },

      updateProfile: (id: string, updates: Partial<ConnectionProfile>) => {
        set((state) => ({
          profiles: state.profiles.map((profile) => {
            if (profile.id === id) {
              // Merge updates with existing profile
              const merged = { ...profile, ...updates } as ConnectionProfile;
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
        // Sort by name alphabetically
        return profiles.sort((a, b) => a.name.localeCompare(b.name));
      },

      getProfileById: (id: string) => {
        const { profiles } = get();
        return profiles.find((profile) => profile.id === id);
      },
    }),
    {
      name: 'rusterm-connection-profiles', // localStorage key
      version: 3, // Incremented for lastUsed removal
      migrate: (persistedState: any, version: number) => {
        if (version < 3) {
          // Migration to v3: Remove favorite and lastUsed fields
          return {
            ...persistedState,
            profiles: (persistedState.profiles || []).map((profile: any) => {
              const { favorite, lastUsed, ...rest } = profile; // Remove favorite and lastUsed fields
              return rest;
            }),
          };
        }
        return persistedState;
      },
    }
  )
);
