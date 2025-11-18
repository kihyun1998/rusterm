/**
 * Settings Types
 *
 * IMPORTANT: These types must match the Rust types in src-tauri/src/settings/types.rs
 * Keep them in sync when making changes!
 */

export interface Settings {
  version: string;
  appTheme: 'dark' | 'light';
  fontSize: number;
  fontFamily: string;
  terminalThemeId: string;
}

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent?: string;
  selectionBackground?: string;
  // ANSI colors
  black?: string;
  red?: string;
  green?: string;
  yellow?: string;
  blue?: string;
  magenta?: string;
  cyan?: string;
  white?: string;
  brightBlack?: string;
  brightRed?: string;
  brightGreen?: string;
  brightYellow?: string;
  brightBlue?: string;
  brightMagenta?: string;
  brightCyan?: string;
  brightWhite?: string;
}

/**
 * Default settings values
 */
export const defaultSettings: Settings = {
  version: '1.0.0',
  appTheme: 'dark',
  fontSize: 14,
  fontFamily: 'Cascadia Code, Consolas, Monaco, monospace',
  terminalThemeId: 'retro',
};
