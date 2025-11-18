import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';
import type { Settings, TerminalTheme } from '@/types/settings';

interface SettingsState {
  settings: Settings | null;
  isLoaded: boolean;
  isLoading: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
  updateSettings: (updates: Partial<Omit<Settings, 'version'>>) => Promise<void>;
  updateTheme: (theme: Partial<TerminalTheme>) => Promise<void>;
  updateFontSize: (fontSize: number) => Promise<void>;
  updateFontFamily: (fontFamily: string) => Promise<void>;
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

  updateSettings: async (updates: Partial<Omit<Settings, 'version'>>) => {
    const { settings, saveSettings } = get();
    if (!settings) return;

    const newSettings: Settings = {
      ...settings,
      ...updates,
    };
    await saveSettings(newSettings);
  },

  updateTheme: async (theme: Partial<TerminalTheme>) => {
    const { settings, saveSettings } = get();
    if (!settings) return;

    const newSettings: Settings = {
      ...settings,
      theme: { ...settings.theme, ...theme },
    };
    await saveSettings(newSettings);
  },

  updateFontSize: async (fontSize: number) => {
    const { settings, saveSettings } = get();
    if (!settings) return;

    const newSettings: Settings = {
      ...settings,
      fontSize,
    };
    await saveSettings(newSettings);
  },

  updateFontFamily: async (fontFamily: string) => {
    const { settings, saveSettings } = get();
    if (!settings) return;

    const newSettings: Settings = {
      ...settings,
      fontFamily,
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
export type { Settings, TerminalTheme };
