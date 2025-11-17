import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTabStore } from '@/stores';

/**
 * TabBar component
 * Displays all terminal tabs with controls for switching, closing, and adding tabs
 */
export function TabBar() {
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

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-muted border-b border-border">
      {/* Tab list */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              group flex items-center gap-2 px-3 py-1.5 min-w-[120px] max-w-[200px]
              rounded-t-md cursor-pointer transition-colors
              ${
                tab.id === activeTabId
                  ? 'bg-background border border-border border-b-0 text-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
              }
            `}
          >
            {/* Tab title */}
            <span className="flex-1 text-sm truncate select-none">{tab.title}</span>

            {/* Close button (only for closable tabs) */}
            {tab.closable && (
              <button
                onClick={(e) => handleCloseTab(tab.id, e)}
                className={`
                  flex items-center justify-center w-4 h-4 rounded-sm
                  transition-colors
                  ${
                    tab.id === activeTabId
                      ? 'hover:bg-muted/50'
                      : 'opacity-0 group-hover:opacity-100 hover:bg-muted'
                  }
                `}
                aria-label="Close tab"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* New tab button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNewTab}
        className="h-8 w-8 p-0 flex-shrink-0"
        aria-label="New tab"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
