import { Home } from '@/components/home/Home';
import { Terminal } from '@/components/terminal/Terminal';
import { useTabStore, useSettingsStore } from '@/stores';
import { getThemeById } from '@/constants/terminal-themes';
import { TabBar } from './TabBar';
import { TitleBar } from './TitleBar';

interface MainLayoutProps {
  showDemoButton?: boolean;
  onDemoClick?: () => void;
  onShowSettings?: () => void;
}

/**
 * MainLayout component
 * Manages the overall application layout with title bar, tab bar and terminal area
 */
export function MainLayout({ showDemoButton, onDemoClick, onShowSettings }: MainLayoutProps) {
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const terminalThemeId = useSettingsStore((state) => state.settings?.terminalThemeId);

  // Check if current active tab is a terminal
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const isTerminalActive = activeTab?.type === 'terminal';

  // Get terminal theme from ID
  const terminalTheme = terminalThemeId ? getThemeById(terminalThemeId)?.theme : undefined;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Title bar */}
      <TitleBar
        showDemoButton={showDemoButton}
        onDemoClick={onDemoClick}
        isTerminalActive={isTerminalActive}
        terminalTheme={terminalTheme}
      />

      {/* Tab bar */}
      <TabBar isTerminalActive={isTerminalActive} terminalTheme={terminalTheme} />

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        {tabs.length === 0 ? (
          // Empty state when no tabs (should not happen)
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">No tabs open</p>
              <p className="text-sm">Something went wrong</p>
            </div>
          </div>
        ) : (
          // Render all tabs, show only active one
          tabs.map((tab) => (
            <div
              key={tab.id}
              className="absolute inset-0"
              style={{
                visibility: tab.id === activeTabId ? 'visible' : 'hidden',
                zIndex: tab.id === activeTabId ? 1 : 0,
              }}
            >
              {tab.type === 'home' ? <Home onShowSettings={onShowSettings} /> : <Terminal id={tab.id} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
