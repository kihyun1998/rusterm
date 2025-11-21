import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { CommandPalette } from '@/components/command/CommandPalette';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { SSHConnectionDialog } from '@/components/ssh/SSHConnectionDialog';
import { SftpConnectionDialog } from '@/components/sftp/SftpConnectionDialog';
import { isDevelopment } from '@/config';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { useTheme } from '@/hooks/use-theme';
import ComponentDemo from '@/pages/ComponentDemo';
import { useSettingsStore, useTabStore } from '@/stores';
import { useConnectionProfileStore } from '@/stores/use-connection-profile-store';

function App() {
  const [showDemo, setShowDemo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sshDialogOpen, setSshDialogOpen] = useState(false);
  const [sftpDialogOpen, setSftpDialogOpen] = useState(false);
  const [commandPaletteMode, setCommandPaletteMode] = useState<'command' | 'connection'>('command');
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
    const unlistenTabCreated = listen('tab-created', (event: any) => {
      const payload = event.payload;
      console.log('[IPC] tab-created event received:', payload);

      useTabStore.getState().addTab({
        id: payload.tabId,
        title: payload.title,
        type: 'terminal',
        closable: true,
        ptyId: payload.ptyId ? parseInt(payload.ptyId) : undefined,
        connectionType: payload.tabType === 'ssh' ? 'ssh' : 'local',
        connectionProfileId: payload.sessionId,
      });
    });

    // Listen for tab-closed events from IPC
    const unlistenTabClosed = listen('tab-closed', (event: any) => {
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

  // Open connection selection Command Palette
  const openConnectionPalette = () => {
    setCommandPaletteMode('connection');
    setCommandPaletteOpen(true);
  };

  // Open SSH connection dialog
  const openSshDialog = () => {
    setSshDialogOpen(true);
  };

  // Open SFTP connection dialog
  const openSftpDialog = () => {
    setSftpDialogOpen(true);
  };

  // Handle SSH connection from dialog
  const handleSshConnect = (profileId: string) => {
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
  const handleSftpConnect = (profileId: string) => {
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
      title: `SFTP: ${profile.name}`,
      type: 'sftp',
      closable: true,
      connectionType: 'sftp',
      connectionProfileId: profileId, // SftpBrowser will restore credentials from keyring
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
          onOpenConnectionPalette={openConnectionPalette}
          onOpenSshDialog={openSshDialog}
          onOpenSftpDialog={openSftpDialog}
        />
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        mode={commandPaletteMode}
        open={commandPaletteOpen}
        onOpenChange={(open) => {
          setCommandPaletteOpen(open);
          // Reset mode to 'command' when closing
          if (!open) {
            setCommandPaletteMode('command');
          }
        }}
        onShowDemo={() => setShowDemo(true)}
        onShowSettings={() => setShowSettings(true)}
        onOpenSshDialog={openSshDialog}
        onOpenSftpDialog={openSftpDialog}
      />

      {/* SSH Connection Dialog */}
      <SSHConnectionDialog
        open={sshDialogOpen}
        onOpenChange={setSshDialogOpen}
        onConnect={handleSshConnect}
      />

      {/* SFTP Connection Dialog */}
      <SftpConnectionDialog
        open={sftpDialogOpen}
        onOpenChange={setSftpDialogOpen}
        onConnect={handleSftpConnect}
      />

      {/* Settings Dialog */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
}

export default App;
