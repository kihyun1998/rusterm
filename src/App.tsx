import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';
import { CommandPalette } from '@/components/command/CommandPalette';
import { NewSessionDialog } from '@/components/connection/NewSessionDialog';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { isDevelopment } from '@/config';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { useTheme } from '@/hooks/use-theme';
import ComponentDemo from '@/pages/ComponentDemo';
import { useSettingsStore, useTabStore } from '@/stores';
import { useConnectionProfileStore } from '@/stores/use-connection-profile-store';
import type { TabClosedPayload, TabCreatedPayload } from '@/types/ipc';

function App() {
  const [showDemo, setShowDemo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newSessionDialogOpen, setNewSessionDialogOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { setTheme } = useTheme();
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const settings = useSettingsStore((state) => state.settings);
  const addTab = useTabStore((state) => state.addTab);

  // Load settings on app start
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Apply app theme from settings
  useEffect(() => {
    if (settings?.appTheme) {
      setTheme(settings.appTheme);
    }
  }, [settings?.appTheme, setTheme]);

  // IPC event listeners for tab management
  useEffect(() => {
    // Listen for tab-created events from IPC
    const unlistenTabCreated = listen<TabCreatedPayload>('tab-created', (event) => {
      const payload = event.payload;
      console.log('[IPC] tab-created event received:', payload);

      useTabStore.getState().addTab({
        id: payload.tabId,
        title: payload.title,
        type: 'terminal',
        closable: true,
        ptyId: payload.ptyId ? parseInt(payload.ptyId, 10) : undefined,
        connectionType: payload.tabType === 'ssh' ? 'ssh' : 'local',
        connectionProfileId: payload.sessionId,
      });
    });

    // Listen for tab-closed events from IPC
    const unlistenTabClosed = listen<TabClosedPayload>('tab-closed', (event) => {
      const payload = event.payload;
      console.log('[IPC] tab-closed event received:', payload);

      useTabStore.getState().closeTab(payload.tabId);
    });

    // Cleanup
    return () => {
      unlistenTabCreated.then((fn) => fn());
      unlistenTabClosed.then((fn) => fn());
    };
  }, []);

  // Global keyboard shortcuts
  useShortcuts({
    onOpenSettings: () => setShowSettings(true),
  });

  // Open new session dialog
  const openNewSessionDialog = () => {
    setNewSessionDialogOpen(true);
  };

  // Handle local terminal creation
  const handleCreateLocal = () => {
    const terminalCount = useTabStore.getState().tabs.filter((t) => t.type === 'terminal').length;
    const newTabId = crypto.randomUUID();
    addTab({
      id: newTabId,
      title: `Terminal ${terminalCount + 1}`,
      type: 'terminal',
      closable: true,
      connectionType: 'local',
    });
  };

  // Handle SSH connection from dialog
  const handleCreateSSH = (profileId: string) => {
    // Get profile to extract connection info for tab title
    const profile = useConnectionProfileStore.getState().getProfileById(profileId);

    if (!profile) {
      console.error('Profile not found:', profileId);
      return;
    }

    // Create new SSH tab with profile name as title
    const newTabId = crypto.randomUUID();
    addTab({
      id: newTabId,
      title: profile.name,
      type: 'terminal',
      closable: true,
      connectionType: 'ssh',
      connectionProfileId: profileId, // Terminal will restore credentials from keyring
    });
  };

  // Handle SFTP connection from dialog
  const handleCreateSFTP = (profileId: string) => {
    // Get profile to extract connection info for tab title
    const profile = useConnectionProfileStore.getState().getProfileById(profileId);

    if (!profile) {
      console.error('Profile not found:', profileId);
      return;
    }

    // Create new SFTP tab with profile name as title
    const newTabId = crypto.randomUUID();
    addTab({
      id: newTabId,
      title: profile.name,
      type: 'sftp',
      closable: true,
      connectionType: 'sftp',
      connectionProfileId: profileId, // SFTP browser will restore credentials from keyring
    });
  };

  // Show demo page in development mode
  if (isDevelopment && showDemo) {
    return <ComponentDemo onBack={() => setShowDemo(false)} />;
  }

  return (
    <>
      <div className="h-screen w-screen overflow-hidden bg-background">
        <MainLayout
          showDemoButton={isDevelopment}
          onDemoClick={() => setShowDemo(true)}
          onShowSettings={() => setShowSettings(true)}
          onOpenConnectionPalette={openNewSessionDialog}
          onOpenNewSession={openNewSessionDialog}
        />
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onOpenNewSession={openNewSessionDialog}
      />

      {/* New Session Dialog */}
      <NewSessionDialog
        open={newSessionDialogOpen}
        onOpenChange={setNewSessionDialogOpen}
        onCreateLocal={handleCreateLocal}
        onCreateSSH={handleCreateSSH}
        onCreateSFTP={handleCreateSFTP}
      />

      {/* Settings Dialog */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
}

export default App;
