import { WindowControls } from './WindowControls';
import { useWindowControls } from '@/hooks/use-window-controls';

/**
 * TitleBar component
 * Custom title bar with drag region and window controls
 */
export function TitleBar() {
  const { toggleMaximize, platform } = useWindowControls();

  const handleDoubleClick = () => {
    // Double-click to maximize/restore (Windows/Linux behavior)
    if (platform !== 'macos') {
      toggleMaximize();
    }
  };

  return (
    <div
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

      {/* Right section: Window controls */}
      <WindowControls />
    </div>
  );
}
