import { Button } from '@/components/ui/button';
import { useWindowControls } from '@/hooks/use-window-controls';
import type { TerminalTheme } from '@/types/settings';
import { WindowControls } from './WindowControls';

interface TitleBarProps {
  showDemoButton?: boolean;
  onDemoClick?: () => void;
  isTerminalActive?: boolean;
  terminalTheme?: TerminalTheme;
  title?: string;
}

/**
 * TitleBar component
 * Custom title bar with drag region and window controls
 */
export function TitleBar({
  showDemoButton,
  onDemoClick,
  isTerminalActive,
  terminalTheme,
  title,
}: TitleBarProps) {
  const { toggleMaximize, platform } = useWindowControls();

  const handleDoubleClick = () => {
    // Double-click to maximize/restore (Windows/Linux behavior)
    if (platform !== 'macos') {
      toggleMaximize();
    }
  };

  // Helper function to add opacity to hex color
  const addOpacity = (color: string, opacity: number) => {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  };

  return (
    <header
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
      className={`
        h-8
        flex items-center justify-between
        px-2
        border-b
        select-none
        ${isTerminalActive ? '' : 'bg-muted border-border'}
      `}
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
      {/* Left section: App title */}
      <div data-tauri-drag-region className="flex items-center gap-2 flex-1 min-w-0">
        <span
          data-tauri-drag-region
          className={`text-sm font-medium truncate ${isTerminalActive ? '' : 'text-foreground'}`}
        >
          {title || 'rusterm'}
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
      <WindowControls
        isTerminalActive={isTerminalActive}
        terminalForegroundColor={terminalTheme?.foreground}
      />
    </header>
  );
}
