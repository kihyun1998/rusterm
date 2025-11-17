import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';
import type { Settings, TerminalSettings, TerminalTheme } from '@/types/settings';

interface SettingsState {
  settings: Settings | null;
  isLoaded: boolean;
  isLoading: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
  updateTerminalSettings: (updates: Partial<TerminalSettings>) => Promise<void>;
  updateTheme: (theme: Partial<TerminalTheme>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoaded: false,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await invoke<Settings>('load_settings');
      set({ settings, isLoaded: true, isLoading: false });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  saveSettings: async (settings: Settings) => {
    try {
      await invoke('save_settings', { settings });
      set({ settings });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  },

  updateTerminalSettings: async (updates: Partial<TerminalSettings>) => {
    const { settings, saveSettings } = get();
    if (!settings) return;

    const newSettings: Settings = {
      ...settings,
      terminal: { ...settings.terminal, ...updates },
    };
    await saveSettings(newSettings);
  },

  updateTheme: async (theme: Partial<TerminalTheme>) => {
    const { settings, saveSettings } = get();
    if (!settings) return;

    const newSettings: Settings = {
      ...settings,
      terminal: {
        ...settings.terminal,
        theme: { ...settings.terminal.theme, ...theme },
      },
    };
    await saveSettings(newSettings);
  },

  resetSettings: async () => {
    try {
      const defaultSettings = await invoke<Settings>('reset_settings');
      set({ settings: defaultSettings });
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  },
}));

// Export types for convenience
export type { Settings, TerminalSettings, TerminalTheme };
