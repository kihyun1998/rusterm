import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTabStore } from '@/stores';
import type { TerminalTheme } from '@/types/settings';

interface TabBarProps {
  isTerminalActive?: boolean;
  terminalTheme?: TerminalTheme;
}

/**
 * TabBar component
 * Displays all terminal tabs with controls for switching, closing, and adding tabs
 */
export function TabBar({ isTerminalActive, terminalTheme }: TabBarProps) {
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const addTab = useTabStore((state) => state.addTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const closeTab = useTabStore((state) => state.closeTab);

  const handleNewTab = () => {
    const newTabId = crypto.randomUUID();
    const terminalCount = tabs.filter((t) => t.type === 'terminal').length;
    addTab({
      id: newTabId,
      title: `Terminal ${terminalCount + 1}`,
      type: 'terminal',
      closable: true,
    });
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  // Helper function to add opacity to hex color
  const addOpacity = (color: string, opacity: number) => {
    // If color is in hex format, convert to rgba
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  };

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 border-b border-border ${
        isTerminalActive ? '' : 'bg-muted'
      }`}
      style={
        isTerminalActive && terminalTheme
          ? {
              backgroundColor: terminalTheme.background,
              color: terminalTheme.foreground,
            }
          : undefined
      }
    >
      {/* Tab list */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const useTerminalColors = isTerminalActive && terminalTheme;

          return (
            <div
              key={tab.id}
              className={`
                group flex items-center gap-2 px-3 py-1.5 min-w-[120px] max-w-[200px]
                rounded-t-md transition-colors
                ${
                  !useTerminalColors
                    ? isActive
                      ? 'bg-background border border-border border-b-0 text-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
                    : isActive
                      ? 'border border-border border-b-0'
                      : ''
                }
              `}
              style={
                useTerminalColors
                  ? {
                      backgroundColor: isActive
                        ? terminalTheme.background
                        : addOpacity(terminalTheme.background, 0.5),
                      color: isActive ? terminalTheme.foreground : addOpacity(terminalTheme.foreground, 0.7),
                    }
                  : undefined
              }
            >
              {/* Tab title button */}
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 text-sm truncate select-none text-left"
              >
                {tab.title}
              </button>

              {/* Close button (only for closable tabs) */}
              {tab.closable && (
                <button
                  type="button"
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className={`
                    flex items-center justify-center w-4 h-4 rounded-sm
                    transition-colors flex-shrink-0
                    ${
                      !useTerminalColors
                        ? isActive
                          ? 'hover:bg-muted/50'
                          : 'opacity-0 group-hover:opacity-100 hover:bg-muted'
                        : isActive
                          ? ''
                          : 'opacity-0 group-hover:opacity-100'
                    }
                  `}
                  style={
                    useTerminalColors && isActive
                      ? {
                          backgroundColor: 'transparent',
                        }
                      : undefined
                  }
                  aria-label="Close tab"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* New tab button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNewTab}
        className="h-8 w-8 p-0 flex-shrink-0"
        aria-label="New tab"
        style={
          isTerminalActive && terminalTheme ? { color: terminalTheme.foreground } : undefined
        }
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
