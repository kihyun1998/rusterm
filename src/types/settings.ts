/**
 * Settings Types
 *
 * IMPORTANT: These types must match the Rust types in src-tauri/src/settings/types.rs
 * Keep them in sync when making changes!
 */

export interface Settings {
  version: string;
  terminal: TerminalSettings;
  window: WindowSettings;
  general: GeneralSettings;
}

export interface TerminalSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  scrollback: number;
  shell: string;
  startupDirectory?: string;
  theme: TerminalTheme;
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

export interface WindowSettings {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export interface GeneralSettings {
  confirmBeforeQuit: boolean;
  autoSave: boolean;
}

/**
 * Default settings values
 */
export const defaultSettings: Settings = {
  version: '1.0.0',
  terminal: {
    fontSize: 14,
    fontFamily: 'Consolas, "Courier New", monospace',
    lineHeight: 1.2,
    cursorStyle: 'block',
    cursorBlink: true,
    scrollback: 1000,
    shell: '',
    startupDirectory: undefined,
    theme: {
      background: '#1e1e1e',
      foreground: '#cccccc',
      cursor: '#ffffff',
      cursorAccent: '#000000',
      selectionBackground: '#264f78',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#ffffff',
    },
  },
  window: {
    width: 1200,
    height: 800,
    x: undefined,
    y: undefined,
  },
  general: {
    confirmBeforeQuit: true,
    autoSave: true,
  },
};
