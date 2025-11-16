import { useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTabStore } from '@/stores';

function App() {
  const tabs = useTabStore((state) => state.tabs);
  const addTab = useTabStore((state) => state.addTab);

  // Initialize with first tab on app start
  useEffect(() => {
    if (tabs.length === 0) {
      addTab({
        id: crypto.randomUUID(),
        title: 'Terminal 1',
      });
    }
  }, [tabs.length, addTab]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <MainLayout />
    </div>
  );
}

export default App;
