import { useEffect, useState } from 'react';
import {
  PlusIcon,
  Cross2Icon,
  ReloadIcon,
  GearIcon,
  MoonIcon,
  SunIcon,
  FontSizeIcon,
  CodeIcon,
  CopyIcon,
  ClipboardIcon,
  TextAlignJustifyIcon,
  EraserIcon,
} from '@radix-ui/react-icons';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useTabStore } from '@/stores';
import { useSettingsStore } from '@/stores/use-settings-store';
import { useTheme } from '@/hooks/use-theme';
import { useClipboard } from '@/hooks/use-clipboard';
import { emitTerminalEvent, TERMINAL_EVENTS } from '@/lib/terminal-events';
import { isDevelopment } from '@/config';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

interface CommandPaletteProps {
  onShowDemo?: () => void;
  onShowSettings?: () => void;
}

export function CommandPalette({ onShowDemo, onShowSettings }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  // Tab management store
  const addTab = useTabStore((state) => state.addTab);
  const closeTab = useTabStore((state) => state.closeTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);

  // Settings store
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  // Theme management
  const { toggleTheme } = useTheme();

  // Clipboard management
  const { copyToClipboard, pasteFromClipboard } = useClipboard();

  // Ctrl+K (Windows) or Cmd+K (Mac) to toggle
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Execute command and close dialog
  const runCommand = (callback: () => void) => {
    callback();
    setOpen(false);
  };

  // Tab management handlers
  const handleNewTab = () => {
    addTab({
      id: crypto.randomUUID(),
      title: `Terminal ${tabs.length + 1}`,
    });
  };

  const handleCloseTab = () => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  };

  const handleNextTab = () => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    const nextIndex = (currentIndex + 1) % tabs.length;
    if (tabs[nextIndex]) {
      setActiveTab(tabs[nextIndex].id);
    }
  };

  const handlePreviousTab = () => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    const previousIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (tabs[previousIndex]) {
      setActiveTab(tabs[previousIndex].id);
    }
  };

  // Terminal action handlers
  const handleClearTerminal = () => {
    emitTerminalEvent(TERMINAL_EVENTS.CLEAR);
  };

  const handleCopy = () => {
    // Copy is handled by the terminal's selection
    // Users can use Ctrl+Shift+C or context menu
    document.execCommand('copy');
  };

  const handlePaste = async () => {
    const text = await pasteFromClipboard();
    if (text) {
      emitTerminalEvent(TERMINAL_EVENTS.PASTE, { text });
    }
  };

  const handleSelectAll = () => {
    emitTerminalEvent(TERMINAL_EVENTS.SELECT_ALL);
  };

  // Settings handlers
  const handleOpenSettings = () => {
    if (onShowSettings) {
      onShowSettings();
    }
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const handleIncreaseFontSize = () => {
    const newSize = Math.min(settings.fontSize + 2, 30); // Max 30
    updateSettings({ fontSize: newSize });
    emitTerminalEvent(TERMINAL_EVENTS.UPDATE_FONT_SIZE, { fontSize: newSize });
  };

  const handleDecreaseFontSize = () => {
    const newSize = Math.max(settings.fontSize - 2, 8); // Min 8
    updateSettings({ fontSize: newSize });
    emitTerminalEvent(TERMINAL_EVENTS.UPDATE_FONT_SIZE, { fontSize: newSize });
  };

  const handleResetFontSize = () => {
    const defaultSize = 14;
    updateSettings({ fontSize: defaultSize });
    emitTerminalEvent(TERMINAL_EVENTS.UPDATE_FONT_SIZE, { fontSize: defaultSize });
  };

  // Developer tools handlers
  const handleToggleDevTools = async () => {
    try {
      const webview = getCurrentWebviewWindow();
      // Note: Tauri 2 doesn't have a direct toggleDevtools method
      // DevTools can be opened through the system menu or F12
      console.log('DevTools toggle - use F12 or system menu');
    } catch (err) {
      console.error('Failed to toggle DevTools:', err);
    }
  };

  const handleViewDemo = () => {
    if (onShowDemo) {
      onShowDemo();
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Tab Management */}
        <CommandGroup heading="Tab Management">
          <CommandItem onSelect={() => runCommand(handleNewTab)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            <span>New Tab</span>
            <CommandShortcut>Ctrl+Shift+T</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(handleCloseTab)}
            disabled={tabs.length === 0}
          >
            <Cross2Icon className="mr-2 h-4 w-4" />
            <span>Close Tab</span>
            <CommandShortcut>Ctrl+Shift+W</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(handleNextTab)}
            disabled={tabs.length <= 1}
          >
            <span className="mr-2">→</span>
            <span>Next Tab</span>
            <CommandShortcut>Ctrl+Tab</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(handlePreviousTab)}
            disabled={tabs.length <= 1}
          >
            <span className="mr-2">←</span>
            <span>Previous Tab</span>
            <CommandShortcut>Ctrl+Shift+Tab</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Terminal Actions */}
        <CommandGroup heading="Terminal Actions">
          <CommandItem onSelect={() => runCommand(handleClearTerminal)}>
            <EraserIcon className="mr-2 h-4 w-4" />
            <span>Clear Terminal</span>
            <CommandShortcut>Ctrl+L</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(handleCopy)}>
            <CopyIcon className="mr-2 h-4 w-4" />
            <span>Copy</span>
            <CommandShortcut>Ctrl+Shift+C</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(handlePaste)}>
            <ClipboardIcon className="mr-2 h-4 w-4" />
            <span>Paste</span>
            <CommandShortcut>Ctrl+Shift+V</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(handleSelectAll)}>
            <TextAlignJustifyIcon className="mr-2 h-4 w-4" />
            <span>Select All</span>
            <CommandShortcut>Ctrl+Shift+A</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Settings */}
        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(handleOpenSettings)}>
            <GearIcon className="mr-2 h-4 w-4" />
            <span>Open Settings</span>
            <CommandShortcut>Ctrl+,</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(handleToggleTheme)}>
            <div className="mr-2 flex h-4 w-4">
              <SunIcon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <MoonIcon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </div>
            <span>Toggle Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(handleIncreaseFontSize)}>
            <FontSizeIcon className="mr-2 h-4 w-4" />
            <span>Increase Font Size</span>
            <CommandShortcut>Ctrl++</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(handleDecreaseFontSize)}>
            <FontSizeIcon className="mr-2 h-4 w-4" />
            <span>Decrease Font Size</span>
            <CommandShortcut>Ctrl+-</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(handleResetFontSize)}>
            <FontSizeIcon className="mr-2 h-4 w-4" />
            <span>Reset Font Size</span>
            <CommandShortcut>Ctrl+0</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {/* Developer Tools (Development mode only) */}
        {isDevelopment && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Developer Tools">
              <CommandItem onSelect={() => runCommand(handleToggleDevTools)}>
                <CodeIcon className="mr-2 h-4 w-4" />
                <span>Toggle DevTools</span>
                <CommandShortcut>F12</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(handleViewDemo)}>
                <CodeIcon className="mr-2 h-4 w-4" />
                <span>View Component Demo</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(handleReload)}>
                <ReloadIcon className="mr-2 h-4 w-4" />
                <span>Reload Window</span>
                <CommandShortcut>Ctrl+R</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
