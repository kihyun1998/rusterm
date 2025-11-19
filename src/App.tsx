import { useEffect, useState } from 'react';
import { CommandPalette } from '@/components/command/CommandPalette';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { SSHConnectionDialog } from '@/components/ssh/SSHConnectionDialog';
import { isDevelopment } from '@/config';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { useTheme } from '@/hooks/use-theme';
import ComponentDemo from '@/pages/ComponentDemo';
import { useSettingsStore, useTabStore } from '@/stores';
import type { SSHConfig } from '@/types/connection';

function App() {
  const [showDemo, setShowDemo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sshDialogOpen, setSshDialogOpen] = useState(false);
  const [commandPaletteMode, setCommandPaletteMode] = useState<'command' | 'connection'>(
    'command'
  );
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

  // Handle SSH connection from dialog
  const handleSshConnect = (config: SSHConfig, profileId: string) => {
    // Create new SSH tab
    const newTabId = crypto.randomUUID();
    addTab({
      id: newTabId,
      title: `${config.username}@${config.host}`,
      type: 'terminal',
      closable: true,
      connectionType: 'ssh',
      connectionConfig: config,
      connectionProfileId: profileId, // Save profile ID for credential restoration
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
      />

      {/* SSH Connection Dialog */}
      <SSHConnectionDialog
        open={sshDialogOpen}
        onOpenChange={setSshDialogOpen}
        onConnect={handleSshConnect}
      />

      {/* Settings Dialog */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
}

export default App;
