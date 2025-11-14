import type { ITerminalOptions } from '@xterm/xterm';

/**
 * Default xterm.js configuration
 * Provides base settings for terminal instances
 */
export const defaultTerminalConfig: ITerminalOptions = {
  // Font settings
  fontSize: 14,
  fontFamily: 'Cascadia Code, Consolas, Monaco, "Courier New", monospace',
  fontWeight: 'normal',
  fontWeightBold: 'bold',

  // Cursor settings
  cursorBlink: true,
  cursorStyle: 'block',
  cursorWidth: 1,

  // Scrollback settings
  scrollback: 1000,

  // Theme colors (dark theme)
  theme: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#d4d4d4',
    cursorAccent: '#1e1e1e',
    selectionBackground: '#264f78',
    selectionForeground: undefined,

    // ANSI colors (VS Code Dark+ theme)
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',

    // Bright colors
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#e5e5e5',
  },

  // Behavior settings
  allowProposedApi: true,
  allowTransparency: false,
  rightClickSelectsWord: true,

  // Performance
  convertEol: false,
};

/**
 * Get terminal configuration with optional overrides
 */
export function getTerminalConfig(overrides?: Partial<ITerminalOptions>): ITerminalOptions {
  return {
    ...defaultTerminalConfig,
    ...overrides,
  };
}
