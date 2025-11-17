import { Button } from '@/components/ui/button';
import { useWindowControls } from '@/hooks/use-window-controls';
import { WindowControls } from './WindowControls';

interface TitleBarProps {
  showDemoButton?: boolean;
  onDemoClick?: () => void;
}

/**
 * TitleBar component
 * Custom title bar with drag region and window controls
 */
export function TitleBar({ showDemoButton, onDemoClick }: TitleBarProps) {
  const { toggleMaximize, platform } = useWindowControls();

  const handleDoubleClick = () => {
    // Double-click to maximize/restore (Windows/Linux behavior)
    if (platform !== 'macos') {
      toggleMaximize();
    }
  };

  return (
    <header
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
      className="
        h-8
        flex items-center justify-between
        px-2
        bg-muted
        border-b border-border
        select-none
      "
    >
      {/* Left section: App title */}
      <div data-tauri-drag-region className="flex items-center gap-2 flex-1 min-w-0">
        <span data-tauri-drag-region className="text-sm font-medium text-foreground truncate">
          rusterm
        </span>
      </div>

      {/* Center section: Dev tools (development mode only) */}
      {showDemoButton && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onDemoClick} className="h-6 px-2 text-xs">
            Demo
          </Button>
        </div>
      )}

      {/* Right section: Window controls */}
      <WindowControls />
    </header>
  );
}
