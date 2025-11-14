import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent?: string;
  selectionBackground?: string;
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

export interface TerminalSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  scrollback: number;
  theme: TerminalTheme;
  shell: string;
  startupDirectory?: string;
}

interface SettingsState {
  settings: TerminalSettings;

  // Actions
  updateSettings: (updates: Partial<TerminalSettings>) => void;
  updateTheme: (theme: Partial<TerminalTheme>) => void;
  resetSettings: () => void;
}

const defaultTheme: TerminalTheme = {
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
};

const defaultSettings: TerminalSettings = {
  fontSize: 14,
  fontFamily: 'Consolas, "Courier New", monospace',
  lineHeight: 1.2,
  cursorStyle: 'block',
  cursorBlink: true,
  scrollback: 1000,
  theme: defaultTheme,
  shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      updateTheme: (theme) =>
        set((state) => ({
          settings: {
            ...state.settings,
            theme: { ...state.settings.theme, ...theme },
          },
        })),

      resetSettings: () =>
        set({
          settings: defaultSettings,
        }),
    }),
    {
      name: 'rusterm-settings', // localStorage key
    }
  )
);
