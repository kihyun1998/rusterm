/**
 * Window control types for custom title bar
 */

export type Platform = 'windows' | 'macos' | 'linux';

export type WindowControlType = 'minimize' | 'maximize' | 'close';

export interface WindowControlButton {
  type: WindowControlType;
  icon: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
}

export interface UseWindowControlsReturn {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: boolean;
  platform: Platform;
}
