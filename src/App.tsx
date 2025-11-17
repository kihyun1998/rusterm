import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import ComponentDemo from '@/pages/ComponentDemo';
import { CommandPalette } from '@/components/command/CommandPalette';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { isDevelopment } from '@/config';

function App() {
  const [showDemo, setShowDemo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+, to open settings
      if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowSettings(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
