import { TabBar } from './TabBar';
import { Terminal } from '@/components/terminal/Terminal';
import { useTabStore } from '@/stores';

/**
 * MainLayout component
 * Manages the overall application layout with tab bar and terminal area
 */
export function MainLayout() {
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);

  console.log('MainLayout render:', { tabs, activeTabId });

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Tab bar */}
      <TabBar />

      {/* Terminal area */}
      <div className="flex-1 relative overflow-hidden">
        {tabs.length === 0 ? (
          // Empty state when no tabs
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">No terminal tabs open</p>
              <p className="text-sm">Click the + button to create a new terminal</p>
            </div>
          </div>
        ) : (
          // Render all terminals, show only active one
          tabs.map((tab) => (
            <div
              key={tab.id}
              className={`absolute inset-0 ${
                tab.id === activeTabId ? 'block' : 'hidden'
              }`}
            >
              <Terminal id={tab.id} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
