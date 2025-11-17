// Terminal configuration and types for xterm.js

// Terminal instance configuration
export interface TerminalConfig {
  fontSize: number; // Default: 14
  fontFamily: string; // Default: 'Consolas, Monaco, monospace'
  theme: TerminalTheme; // Color theme
  cursorBlink: boolean; // Cursor blinking
  scrollback: number; // Scrollback history lines (default: 1000)
}

// xterm theme colors
export interface TerminalTheme {
  background: string; // Background color
  foreground: string; // Foreground color (text)
  cursor?: string; // Cursor color
  selection?: string; // Selection background
  selectionForeground?: string; // Selection text color
  cursorAccent?: string; // Cursor accent color
  black?: string; // ANSI 0
  red?: string; // ANSI 1
  green?: string; // ANSI 2
  yellow?: string; // ANSI 3
  blue?: string; // ANSI 4
  magenta?: string; // ANSI 5
  cyan?: string; // ANSI 6
  white?: string; // ANSI 7
  brightBlack?: string; // ANSI 8
  brightRed?: string; // ANSI 9
  brightGreen?: string; // ANSI 10
  brightYellow?: string; // ANSI 11
  brightBlue?: string; // ANSI 12
  brightMagenta?: string; // ANSI 13
  brightCyan?: string; // ANSI 14
  brightWhite?: string; // ANSI 15
}

// Terminal status
export type TerminalStatus = 'idle' | 'running' | 'error' | 'closed';

// Terminal metadata (for tab/panel management)
export interface TerminalMetadata {
  id: string; // UUID
  title: string; // Tab title (default: 'Terminal')
  status: TerminalStatus;
  createdAt: number; // Creation time (timestamp)
  pid?: number; // Process ID (from backend)
}
