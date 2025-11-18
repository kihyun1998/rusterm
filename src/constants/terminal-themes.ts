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
  {
    id: 'apple-system',
    name: 'Apple System Colors',
    description: 'macOS system color palette',
    theme: {
      background: '#1e1e1e',
      foreground: '#ffffff',
      cursor: '#98989d',
      cursorAccent: '#1e1e1e',
      selectionBackground: '#3f638b',
      black: '#1a1a1a',
      red: '#cc372e',
      green: '#26a439',
      yellow: '#cdac08',
      blue: '#0869cb',
      magenta: '#9647bf',
      cyan: '#479ec2',
      white: '#98989d',
      brightBlack: '#464646',
      brightRed: '#ff453a',
      brightGreen: '#32d74b',
      brightYellow: '#ffd60a',
      brightBlue: '#0a84ff',
      brightMagenta: '#bf5af2',
      brightCyan: '#76d6ff',
      brightWhite: '#ffffff',
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
