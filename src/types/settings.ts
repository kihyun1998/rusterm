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
  theme: TerminalTheme;
  terminalThemeId?: string;
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
 * Default settings values (Retro theme)
 */
export const defaultSettings: Settings = {
  version: '1.0.0',
  appTheme: 'dark',
  fontSize: 14,
  fontFamily: 'Cascadia Code, Consolas, Monaco, monospace',
  terminalThemeId: 'retro',
  theme: {
    background: '#000000',
    foreground: '#13a10e',
    cursor: '#13a10e',
    cursorAccent: '#000000',
    selectionBackground: '#ffffff',
    black: '#13a10e',
    red: '#13a10e',
    green: '#13a10e',
    yellow: '#13a10e',
    blue: '#13a10e',
    magenta: '#13a10e',
    cyan: '#13a10e',
    white: '#13a10e',
    brightBlack: '#16ba10',
    brightRed: '#16ba10',
    brightGreen: '#16ba10',
    brightYellow: '#16ba10',
    brightBlue: '#16ba10',
    brightMagenta: '#16ba10',
    brightCyan: '#16ba10',
    brightWhite: '#16ba10',
  },
};
