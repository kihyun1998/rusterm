import { Minus, Square, Copy, X } from 'lucide-react';
import { useWindowControls } from '@/hooks/use-window-controls';
import type { Platform } from '@/types/window';

/**
 * WindowControls component
 * Renders minimize, maximize/restore, and close buttons for custom title bar
 */
export function WindowControls() {
  const { minimize, toggleMaximize, close, isMaximized, platform } = useWindowControls();

  // Button configuration
  const buttons = [
    {
      type: 'minimize' as const,
      icon: <Minus className="w-3.5 h-3.5" />,
      onClick: minimize,
      ariaLabel: 'Minimize window',
    },
    {
      type: 'maximize' as const,
      icon: isMaximized ? (
        <Copy className="w-3.5 h-3.5" />
      ) : (
        <Square className="w-3.5 h-3.5" />
      ),
      onClick: toggleMaximize,
      ariaLabel: isMaximized ? 'Restore window' : 'Maximize window',
    },
    {
      type: 'close' as const,
      icon: <X className="w-3.5 h-3.5" />,
      onClick: close,
      ariaLabel: 'Close window',
    },
  ];

  // Platform-specific button order
  const orderedButtons = getOrderedButtons(buttons, platform);

  return (
    <div className={`flex items-center h-full ${platform === 'macos' ? 'order-first ml-2' : 'order-last'}`}>
      {orderedButtons.map((button) => (
        <button
          key={button.type}
          onClick={button.onClick}
          aria-label={button.ariaLabel}
          className={`
            h-8 w-12
            flex items-center justify-center
            transition-colors
            ${
              button.type === 'close'
                ? 'hover:bg-red-500 hover:text-white'
                : 'hover:bg-muted-foreground/10'
            }
          `}
        >
          {button.icon}
        </button>
      ))}
    </div>
  );
}

/**
 * Returns buttons in platform-specific order
 */
function getOrderedButtons(
  buttons: Array<{
    type: 'minimize' | 'maximize' | 'close';
    icon: React.ReactNode;
    onClick: () => void;
    ariaLabel: string;
  }>,
  platform: Platform
) {
  if (platform === 'macos') {
    // macOS: close, minimize, maximize (left side)
    return [
      buttons[2], // close
      buttons[0], // minimize
      buttons[1], // maximize
    ];
  }

  // Windows/Linux: minimize, maximize, close (right side)
  return buttons;
}
