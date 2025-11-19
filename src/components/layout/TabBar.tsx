import { Plus, Server, Terminal as TerminalIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTabStore } from '@/stores';
import type { TerminalTheme } from '@/types/settings';

interface TabBarProps {
  isTerminalActive?: boolean;
  terminalTheme?: TerminalTheme;
  onOpenConnectionPalette?: () => void;
}

/**
 * TabBar component
 * Displays all terminal tabs with controls for switching, closing, and adding tabs
 */
export function TabBar({ isTerminalActive, terminalTheme, onOpenConnectionPalette }: TabBarProps) {
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const addTab = useTabStore((state) => state.addTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const closeTab = useTabStore((state) => state.closeTab);

  const handleNewTab = () => {
    if (onOpenConnectionPalette) {
      // Open connection selection palette
      onOpenConnectionPalette();
    } else {
      // Fallback: create local terminal immediately
      const newTabId = crypto.randomUUID();
      const terminalCount = tabs.filter((t) => t.type === 'terminal').length;
      addTab({
        id: newTabId,
        title: `Terminal ${terminalCount + 1}`,
        type: 'terminal',
        closable: true,
      });
    }
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

  // Helper function to darken or lighten a color
  const adjustBrightness = (color: string, amount: number) => {
    if (color.startsWith('#')) {
      const r = Math.max(0, Math.min(255, parseInt(color.slice(1, 3), 16) + amount));
      const g = Math.max(0, Math.min(255, parseInt(color.slice(3, 5), 16) + amount));
      const b = Math.max(0, Math.min(255, parseInt(color.slice(5, 7), 16) + amount));
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    return color;
  };

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 border-b ${isTerminalActive ? '' : 'bg-muted border-border'}`}
      style={
        isTerminalActive && terminalTheme
          ? {
              backgroundColor: terminalTheme.background,
              color: terminalTheme.foreground,
              borderBottomColor: addOpacity(terminalTheme.foreground, 0.2),
            }
          : undefined
      }
    >
      {/* Tab list */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const useTerminalColors = isTerminalActive && terminalTheme;

          // Prepare styles for inactive tabs with hover effect
          const inactiveTabStyle = useTerminalColors
            ? {
                backgroundColor: adjustBrightness(terminalTheme.background, -40),
                color: addOpacity(terminalTheme.foreground, 0.6),
                borderColor: 'transparent',
              }
            : {};

          const activeTabStyle = useTerminalColors
            ? {
                backgroundColor: terminalTheme.background,
                color: terminalTheme.foreground,
                borderColor: addOpacity(terminalTheme.foreground, 0.2),
              }
            : {};

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
                      ? 'border border-b-0'
                      : ''
                }
              `}
              style={isActive ? activeTabStyle : inactiveTabStyle}
              onMouseEnter={(e) => {
                if (!isActive && useTerminalColors) {
                  e.currentTarget.style.backgroundColor = adjustBrightness(
                    terminalTheme.background,
                    -25
                  );
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive && useTerminalColors) {
                  e.currentTarget.style.backgroundColor = adjustBrightness(
                    terminalTheme.background,
                    -40
                  );
                }
              }}
            >
              {/* Tab title button */}
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 flex-1 text-sm truncate select-none text-left"
              >
                {/* Connection type icon */}
                {tab.type === 'terminal' && (
                  <>
                    {tab.connectionType === 'ssh' ? (
                      <Server className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <TerminalIcon className="w-3 h-3 flex-shrink-0" />
                    )}
                  </>
                )}
                <span className="truncate">{tab.title}</span>
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
        style={isTerminalActive && terminalTheme ? { color: terminalTheme.foreground } : undefined}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
