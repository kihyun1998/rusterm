import { useState, useMemo } from 'react';
import { Keyboard, Settings, Terminal, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTabStore } from '@/stores';
import { useConnectionProfileStore } from '@/stores/use-connection-profile-store';
import { ConnectionCard } from '@/components/connection/ConnectionCard';
import { EditProfileDialog } from '@/components/connection/EditProfileDialog';
import { DeleteConfirmDialog } from '@/components/connection/DeleteConfirmDialog';
import type { StoredConnectionProfile } from '@/types/connection';
import { isSSHConfig } from '@/types/connection';

interface HomeProps {
  onShowSettings?: () => void;
  onOpenSshDialog?: () => void;
}

/**
 * Home component
 * Displays the welcome screen with quick actions and connection management
 */
export function Home({ onShowSettings, onOpenSshDialog }: HomeProps) {
  const addTab = useTabStore((state) => state.addTab);
  const tabs = useTabStore((state) => state.tabs);

  const getAllProfiles = useConnectionProfileStore((state) => state.getAllProfiles);
  const addToRecent = useConnectionProfileStore((state) => state.addToRecent);
  const getProfileById = useConnectionProfileStore((state) => state.getProfileById);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingProfile, setEditingProfile] = useState<StoredConnectionProfile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<StoredConnectionProfile | null>(null);

  // Get all profiles (already sorted by lastUsed)
  const allProfiles = getAllProfiles();

  // Filter profiles based on search query
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return allProfiles;

    const query = searchQuery.toLowerCase();
    return allProfiles.filter((profile) => {
      // Search in name
      if (profile.name.toLowerCase().includes(query)) return true;

      // Search in type
      if (profile.type.toLowerCase().includes(query)) return true;

      // Search in connection details (for SSH)
      if (profile.type === 'ssh' && isSSHConfig(profile.config)) {
        if (profile.config.host.toLowerCase().includes(query)) return true;
        if (profile.config.username.toLowerCase().includes(query)) return true;
      }

      return false;
    });
  }, [allProfiles, searchQuery]);

  const handleNewTerminal = () => {
    const terminalCount = tabs.filter((t) => t.type === 'terminal').length;
    addTab({
      id: crypto.randomUUID(),
      title: `Terminal ${terminalCount + 1}`,
      type: 'terminal',
      closable: true,
      connectionType: 'local',
    });
  };

  const handleConnectProfile = async (profileId: string) => {
    const profile = getProfileById(profileId);
    if (!profile) return;

    // Restore credentials from keyring if it's an SSH profile
    let connectionConfig = profile.config;

    if (profile.type === 'ssh') {
      try {
        const { getCredential } = await import('@/lib/keyring');
        const [password, privateKey, passphrase] = await Promise.all([
          getCredential(profileId, 'ssh', 'password'),
          getCredential(profileId, 'ssh', 'privatekey'),
          getCredential(profileId, 'ssh', 'passphrase'),
        ]);

        connectionConfig = {
          ...profile.config,
          password: password || undefined,
          privateKey: privateKey || undefined,
          passphrase: passphrase || undefined,
        };
      } catch (error) {
        console.error('Failed to retrieve credentials from keyring:', error);
        // Continue with stored config (without credentials)
      }
    }

    const newTabId = crypto.randomUUID();
    addTab({
      id: newTabId,
      title: profile.name,
      type: 'terminal',
      closable: true,
      connectionType: profile.type,
      connectionConfig,
      connectionProfileId: profileId,
    });

    // Add to recent connections
    addToRecent(profileId);
  };

  const handleEditProfile = (profileId: string) => {
    const profile = getProfileById(profileId);
    if (profile) {
      setEditingProfile(profile);
    }
  };

  const handleDeleteProfile = (profileId: string) => {
    const profile = getProfileById(profileId);
    if (profile) {
      setDeletingProfile(profile);
    }
  };

  const hasProfiles = allProfiles.length > 0;

  return (
    <div className="flex flex-col h-full bg-background text-foreground p-8 overflow-y-auto">
      <div className="max-w-7xl w-full mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">RusTerm</h1>
          <p className="text-lg text-muted-foreground">Modern Terminal Emulator</p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              if (onOpenSshDialog) {
                onOpenSshDialog();
              }
            }}
            className="h-24 flex flex-col gap-2"
          >
            <Plus className="w-6 h-6" />
            <span>New Connection</span>
            <span className="text-xs text-muted-foreground">SSH, Telnet, etc.</span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={handleNewTerminal}
            className="h-24 flex flex-col gap-2"
          >
            <Terminal className="w-6 h-6" />
            <span>Local Terminal</span>
            <span className="text-xs text-muted-foreground">Ctrl+Shift+T</span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="h-24 flex flex-col gap-2"
            onClick={() => {
              if (onShowSettings) {
                onShowSettings();
              }
            }}
          >
            <Settings className="w-6 h-6" />
            <span>Settings</span>
            <span className="text-xs text-muted-foreground">Ctrl+,</span>
          </Button>
        </div>

        {/* All Connections Section */}
        {hasProfiles && (
          <div className="space-y-4">
            {/* Section Header with Search */}
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">All Connections</h2>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search connections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Connection Cards Grid */}
            {filteredProfiles.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredProfiles.map((profile) => (
                  <ConnectionCard
                    key={profile.id}
                    profile={profile}
                    onConnect={handleConnectProfile}
                    onEdit={handleEditProfile}
                    onDelete={handleDeleteProfile}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No connections found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!hasProfiles && (
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>No connections yet. Create your first connection!</p>
          </div>
        )}

        {/* Command Palette Hint */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Press{' '}
            <kbd className="px-2 py-1 text-xs bg-muted rounded border">Ctrl+K</kbd> to open
            Command Palette
          </p>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        open={!!editingProfile}
        onOpenChange={(open) => !open && setEditingProfile(null)}
        profile={editingProfile}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deletingProfile}
        onOpenChange={(open) => !open && setDeletingProfile(null)}
        profile={deletingProfile}
      />
    </div>
  );
}
