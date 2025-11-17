import { Keyboard, Settings, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTabStore } from '@/stores';

/**
 * Home component
 * Displays the welcome screen with quick actions
 */
export function Home() {
  const addTab = useTabStore((state) => state.addTab);
  const tabs = useTabStore((state) => state.tabs);

  const handleNewTerminal = () => {
    const terminalCount = tabs.filter((t) => t.type === 'terminal').length;
    addTab({
      id: crypto.randomUUID(),
      title: `Terminal ${terminalCount + 1}`,
      type: 'terminal',
      closable: true,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-background text-foreground p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">RusTerm</h1>
          <p className="text-lg text-muted-foreground">Modern Terminal Emulator</p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Button
            variant="outline"
            size="lg"
            onClick={handleNewTerminal}
            className="h-24 flex flex-col gap-2"
          >
            <Terminal className="w-6 h-6" />
            <span>New Terminal</span>
            <span className="text-xs text-muted-foreground">Ctrl+Shift+T</span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="h-24 flex flex-col gap-2"
            onClick={() => {
              // Will be handled by global keyboard shortcut
              const event = new KeyboardEvent('keydown', {
                key: ',',
                ctrlKey: true,
                bubbles: true,
              });
              document.dispatchEvent(event);
            }}
          >
            <Settings className="w-6 h-6" />
            <span>Settings</span>
            <span className="text-xs text-muted-foreground">Ctrl+,</span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="h-24 flex flex-col gap-2"
            onClick={() => {
              // Will be handled by global keyboard shortcut
              const event = new KeyboardEvent('keydown', {
                key: 'k',
                ctrlKey: true,
                bubbles: true,
              });
              document.dispatchEvent(event);
            }}
          >
            <Keyboard className="w-6 h-6" />
            <span>Command Palette</span>
            <span className="text-xs text-muted-foreground">Ctrl+K</span>
          </Button>
        </div>

        {/* Info */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>Get started by creating a new terminal or using quick actions above</p>
        </div>
      </div>
    </div>
  );
}
