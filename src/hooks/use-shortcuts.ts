import { useEffect } from 'react';
import { useTabStore } from '@/stores';
import { useSettingsStore } from '@/stores/use-settings-store';
import { emitTerminalEvent, TERMINAL_EVENTS } from '@/lib/terminal-events';

/**
 * Options for the useShortcuts hook
 */
export interface UseShortcutsOptions {
  onOpenSettings: () => void;
}

/**
 * Detect if the current platform is macOS
 */
const isMac = (): boolean => {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

/**
 * Custom hook for managing global keyboard shortcuts
 *
 * Handles all keyboard shortcuts for the application including:
 * - Tab management (Ctrl/Cmd + Shift + T/W, Ctrl/Cmd + Tab)
 * - Settings (Ctrl/Cmd + ,)
 * - Font size control (Ctrl/Cmd + +/-/0)
 * - Terminal actions (Ctrl/Cmd + L, Shift + C/V/A)
 */
export function useShortcuts(options: UseShortcutsOptions) {
  const { onOpenSettings } = options;

  // Tab store
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const addTab = useTabStore((state) => state.addTab);
  const closeTab = useTabStore((state) => state.closeTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);

  // Settings store
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Determine the correct modifier key based on platform
      const modifier = isMac() ? e.metaKey : e.ctrlKey;

      // Check if we're in an input field (excluding terminal)
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // ========== Tab Management ==========

      // Ctrl/Cmd + Shift + T: New tab
      if (e.key === 'T' && modifier && e.shiftKey) {
        e.preventDefault();
        const terminalCount = tabs.filter((t) => t.type === 'terminal').length;
        addTab({
          id: crypto.randomUUID(),
          title: `Terminal ${terminalCount + 1}`,
          type: 'terminal',
          closable: true,
        });
        return;
      }

      // Ctrl/Cmd + Shift + W: Close current tab
      if (e.key === 'W' && modifier && e.shiftKey) {
        e.preventDefault();
        if (activeTabId) {
          const activeTab = tabs.find((t) => t.id === activeTabId);
          if (activeTab && activeTab.closable) {
            closeTab(activeTabId);
          }
        }
        return;
      }

      // Ctrl/Cmd + Tab: Next tab
      if (e.key === 'Tab' && modifier && !e.shiftKey) {
        e.preventDefault();
        if (tabs.length > 1) {
          const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
          const nextIndex = (currentIndex + 1) % tabs.length;
          if (tabs[nextIndex]) {
            setActiveTab(tabs[nextIndex].id);
          }
        }
        return;
      }

      // Ctrl/Cmd + Shift + Tab: Previous tab
      if (e.key === 'Tab' && modifier && e.shiftKey) {
        e.preventDefault();
        if (tabs.length > 1) {
          const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
          const previousIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          if (tabs[previousIndex]) {
            setActiveTab(tabs[previousIndex].id);
          }
        }
        return;
      }

      // ========== Settings ==========

      // Ctrl/Cmd + ,: Open settings
      if (e.key === ',' && modifier) {
        e.preventDefault();
        onOpenSettings();
        return;
      }

      // ========== Font Size Control ==========

      // Ctrl/Cmd + +: Increase font size
      if ((e.key === '+' || e.key === '=') && modifier && !e.shiftKey) {
        e.preventDefault();
        const newSize = Math.min(settings.fontSize + 2, 30); // Max 30
        updateSettings({ fontSize: newSize });
        emitTerminalEvent(TERMINAL_EVENTS.UPDATE_FONT_SIZE, { fontSize: newSize });
        return;
      }

      // Ctrl/Cmd + -: Decrease font size
      if (e.key === '-' && modifier && !e.shiftKey) {
        e.preventDefault();
        const newSize = Math.max(settings.fontSize - 2, 8); // Min 8
        updateSettings({ fontSize: newSize });
        emitTerminalEvent(TERMINAL_EVENTS.UPDATE_FONT_SIZE, { fontSize: newSize });
        return;
      }

      // Ctrl/Cmd + 0: Reset font size
      if (e.key === '0' && modifier) {
        e.preventDefault();
        const defaultSize = 14;
        updateSettings({ fontSize: defaultSize });
        emitTerminalEvent(TERMINAL_EVENTS.UPDATE_FONT_SIZE, { fontSize: defaultSize });
        return;
      }

      // ========== Terminal Actions ==========

      // Don't handle terminal actions if we're in an input field
      if (isInputField) {
        return;
      }

      // Ctrl/Cmd + L: Clear terminal
      if (e.key === 'l' && modifier && !e.shiftKey) {
        e.preventDefault();
        emitTerminalEvent(TERMINAL_EVENTS.CLEAR);
        return;
      }

      // Ctrl/Cmd + Shift + C: Copy
      if (e.key === 'C' && modifier && e.shiftKey) {
        e.preventDefault();
        emitTerminalEvent(TERMINAL_EVENTS.COPY);
        return;
      }

      // Ctrl/Cmd + Shift + V: Paste
      if (e.key === 'V' && modifier && e.shiftKey) {
        e.preventDefault();
        try {
          const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
          const text = await readText();
          if (text) {
            emitTerminalEvent(TERMINAL_EVENTS.PASTE, { text });
          }
        } catch (err) {
          console.error('Failed to paste:', err);
        }
        return;
      }

      // Ctrl/Cmd + Shift + A: Select all
      if (e.key === 'A' && modifier && e.shiftKey) {
        e.preventDefault();
        emitTerminalEvent(TERMINAL_EVENTS.SELECT_ALL);
        return;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    tabs,
    activeTabId,
    addTab,
    closeTab,
    setActiveTab,
    settings,
    updateSettings,
    onOpenSettings,
  ]);
}
