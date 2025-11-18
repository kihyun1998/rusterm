import type { TerminalTheme } from '@/types/settings';

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  theme: TerminalTheme;
}

/**
 * Terminal Theme Presets
 * Popular color schemes for terminal emulators
 */
export const TERMINAL_THEMES: ThemePreset[] = [
  {
    id: 'retro',
    name: 'Retro',
    description: 'Classic green terminal on black background',
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
  },
];

/**
 * Get theme preset by ID
 */
export function getThemeById(id: string): ThemePreset | undefined {
  return TERMINAL_THEMES.find((theme) => theme.id === id);
}

/**
 * Get theme names for dropdown
 */
export function getThemeNames(): Array<{ value: string; label: string }> {
  return TERMINAL_THEMES.map((theme) => ({
    value: theme.id,
    label: theme.name,
  }));
}
