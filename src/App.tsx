import { useEffect, useState } from 'react';
import { CommandPalette } from '@/components/command/CommandPalette';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { isDevelopment } from '@/config';
import { useShortcuts } from '@/hooks/use-shortcuts';
import ComponentDemo from '@/pages/ComponentDemo';
import { useSettingsStore } from '@/stores';

function App() {
  const [showDemo, setShowDemo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  // Load settings on app start
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Global keyboard shortcuts
  useShortcuts({
    onOpenSettings: () => setShowSettings(true),
  });

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
        />
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        onShowDemo={() => setShowDemo(true)}
        onShowSettings={() => setShowSettings(true)}
      />

      {/* Settings Dialog */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
}

export default App;
