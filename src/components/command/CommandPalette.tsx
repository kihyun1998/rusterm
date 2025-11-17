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
import { isDevelopment } from '@/config';

interface CommandPaletteProps {
  onShowDemo?: () => void;
}

export function CommandPalette({ onShowDemo }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  // Tab management store
  const addTab = useTabStore((state) => state.addTab);
  const closeTab = useTabStore((state) => state.closeTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);

  // Ctrl+Shift+P (Windows) or Cmd+Shift+P (Mac) to toggle
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'p' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
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
    // TODO: Implement clear terminal via Tauri IPC
    console.log('Clear terminal');
  };

  const handleCopy = () => {
    document.execCommand('copy');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // TODO: Paste to active terminal
      console.log('Paste:', text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  const handleSelectAll = () => {
    // TODO: Implement select all in terminal
    console.log('Select all');
  };

  // Settings handlers
  const handleOpenSettings = () => {
    // TODO: Implement settings dialog
    console.log('Open settings');
  };

  const handleToggleTheme = () => {
    // TODO: Implement theme toggle
    console.log('Toggle theme');
  };

  const handleIncreaseFontSize = () => {
    // TODO: Implement font size increase
    console.log('Increase font size');
  };

  const handleDecreaseFontSize = () => {
    // TODO: Implement font size decrease
    console.log('Decrease font size');
  };

  const handleResetFontSize = () => {
    // TODO: Implement font size reset
    console.log('Reset font size');
  };

  // Developer tools handlers
  const handleToggleDevTools = () => {
    // TODO: Implement DevTools toggle via Tauri
    console.log('Toggle DevTools');
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
