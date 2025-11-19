import { create } from 'zustand';

import type { ConnectionConfig, ConnectionType } from '@/types/connection';

export type TabType = 'home' | 'terminal';

export interface Tab {
  id: string;
  title: string;
  type: TabType;
  closable: boolean;
  ptyId?: number;
  isActive: boolean;
  workingDirectory?: string;
  // Connection-related fields
  connectionType?: ConnectionType; // Connection type (default: 'local' if not specified)
  connectionProfileId?: string; // Profile ID - credentials will be restored from keyring
}

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;

  // Actions
  addTab: (tab: Omit<Tab, 'isActive'>) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  closeTab: (id: string) => void;
}

export const useTabStore = create<TabState>((set) => ({
  tabs: [
    {
      id: 'home',
      title: 'Home',
      type: 'home',
      closable: false,
      isActive: true,
    },
  ],
  activeTabId: 'home',

  addTab: (tab) =>
    set((state) => {
      const newTab = { ...tab, isActive: false };
      const newTabs = state.tabs.map((t) => ({ ...t, isActive: false }));
      newTabs.push({ ...newTab, isActive: true });

      return {
        tabs: newTabs,
        activeTabId: newTab.id,
      };
    }),

  removeTab: (id) =>
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id);
      let newActiveId = state.activeTabId;

      // If removing active tab, activate another one
      if (state.activeTabId === id && newTabs.length > 0) {
        const removedIndex = state.tabs.findIndex((t) => t.id === id);
        const nextIndex = Math.min(removedIndex, newTabs.length - 1);
        newActiveId = newTabs[nextIndex].id;
        newTabs[nextIndex].isActive = true;
      } else if (newTabs.length === 0) {
        newActiveId = null;
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveId,
      };
    }),

  setActiveTab: (id) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => ({
        ...tab,
        isActive: tab.id === id,
      })),
      activeTabId: id,
    })),

  updateTab: (id, updates) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, ...updates } : tab)),
    })),

  closeTab: (id) =>
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id);
      let newActiveId = state.activeTabId;

      if (state.activeTabId === id && newTabs.length > 0) {
        const removedIndex = state.tabs.findIndex((t) => t.id === id);
        const nextIndex = Math.min(removedIndex, newTabs.length - 1);
        newActiveId = newTabs[nextIndex].id;
        newTabs[nextIndex].isActive = true;
      } else if (newTabs.length === 0) {
        newActiveId = null;
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveId,
      };
    }),
}));
