import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import ComponentDemo from '@/pages/ComponentDemo';
import { useTabStore } from '@/stores';
import { isDevelopment } from '@/config';

function App() {
  const tabs = useTabStore((state) => state.tabs);
  const addTab = useTabStore((state) => state.addTab);
  const [showDemo, setShowDemo] = useState(false);

  // Initialize with first tab on app start
  useEffect(() => {
    if (tabs.length === 0) {
      addTab({
        id: crypto.randomUUID(),
        title: 'Terminal 1',
      });
    }
  }, [tabs.length, addTab]);

  // Show demo page in development mode
  if (isDevelopment && showDemo) {
    return <ComponentDemo onBack={() => setShowDemo(false)} />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <MainLayout
        showDemoButton={isDevelopment}
        onDemoClick={() => setShowDemo(true)}
      />
    </div>
  );
}

export default App;
