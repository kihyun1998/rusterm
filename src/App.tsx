import { useEffect, useState } from 'react';
import { CommandPalette } from '@/components/command/CommandPalette';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { isDevelopment } from '@/config';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { useTheme } from '@/hooks/use-theme';
import ComponentDemo from '@/pages/ComponentDemo';
import { useSettingsStore } from '@/stores';

function App() {
  const [showDemo, setShowDemo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [commandPaletteMode, setCommandPaletteMode] = useState<'command' | 'connection'>(
    'command'
  );
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { setTheme } = useTheme();
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const settings = useSettingsStore((state) => state.settings);

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
      />

      {/* Settings Dialog */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
}

export default App;
