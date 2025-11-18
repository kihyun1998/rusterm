import {
  ClipboardIcon,
  CodeIcon,
  CopyIcon,
  Cross2Icon,
  EraserIcon,
  FontSizeIcon,
  GearIcon,
  MoonIcon,
  PlusIcon,
  ReloadIcon,
  SunIcon,
  TextAlignJustifyIcon,
} from '@radix-ui/react-icons';
import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';

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
import { isDevelopment } from '@/config';
import { CONNECTION_ICONS, CONNECTION_LABELS } from '@/constants/connection-icons';
import { useClipboard } from '@/hooks/use-clipboard';
import { useTheme } from '@/hooks/use-theme';
import { emitTerminalEvent, TERMINAL_EVENTS } from '@/lib/terminal-events';
import { useTabStore } from '@/stores';
import { useConnectionProfileStore } from '@/stores/use-connection-profile-store';
import { useSettingsStore } from '@/stores/use-settings-store';
import type { ConnectionType } from '@/types/connection';

interface CommandPaletteProps {
  mode?: 'command' | 'connection';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onShowDemo?: () => void;
  onShowSettings?: () => void;
  onOpenSshDialog?: () => void;
}

export function CommandPalette({
  mode = 'command',
  open: controlledOpen,
  onOpenChange,
  onShowDemo,
  onShowSettings,
  onOpenSshDialog,
}: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };

  // Tab management store
  const addTab = useTabStore((state) => state.addTab);
  const closeTab = useTabStore((state) => state.closeTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);

  // Connection profile store
  const getRecentProfiles = useConnectionProfileStore((state) => state.getRecentProfiles);
  const getFavoriteProfiles = useConnectionProfileStore((state) => state.getFavoriteProfiles);
  const toggleFavorite = useConnectionProfileStore((state) => state.toggleFavorite);
  const addToRecent = useConnectionProfileStore((state) => state.addToRecent);
  const getProfileById = useConnectionProfileStore((state) => state.getProfileById);

  // Settings store
  const settings = useSettingsStore((state) => state.settings);
  const updateFontSize = useSettingsStore((state) => state.updateFontSize);

  // Theme management
  const { toggleTheme } = useTheme();

  // Clipboard management
  const { pasteFromClipboard } = useClipboard();

  // Ctrl+K (Windows) or Cmd+K (Mac) to toggle (only for command mode)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        // Only toggle if we're in command mode or closed
        if (mode === 'command' || !isOpen) {
          setOpen(!isOpen);
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [mode, isOpen]);

  // Execute command and close dialog
  const runCommand = (callback: () => void) => {
    callback();
    setOpen(false);
  };

  // Tab management handlers
  const handleNewTab = () => {
    const terminalCount = tabs.filter((t) => t.type === 'terminal').length;
    addTab({
      id: crypto.randomUUID(),
      title: `Terminal ${terminalCount + 1}`,
      type: 'terminal',
      closable: true,
    });
  };

  const handleCloseTab = () => {
    if (activeTabId) {
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (activeTab?.closable) {
        closeTab(activeTabId);
      }
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
    if (!settings) return;
    const newSize = Math.min(settings.fontSize + 2, 30); // Max 30
    updateFontSize(newSize);
    emitTerminalEvent(TERMINAL_EVENTS.UPDATE_FONT_SIZE, { fontSize: newSize });
  };

  const handleDecreaseFontSize = () => {
    if (!settings) return;
    const newSize = Math.max(settings.fontSize - 2, 8); // Min 8
    updateFontSize(newSize);
    emitTerminalEvent(TERMINAL_EVENTS.UPDATE_FONT_SIZE, { fontSize: newSize });
  };

  const handleResetFontSize = () => {
    const defaultSize = 14;
    updateFontSize(defaultSize);
    emitTerminalEvent(TERMINAL_EVENTS.UPDATE_FONT_SIZE, { fontSize: defaultSize });
  };

  // Developer tools handlers
  const handleToggleDevTools = () => {
    // Note: Tauri 2 doesn't have a direct toggleDevtools method
    // DevTools can be opened through the system menu or F12
    console.log('DevTools toggle - use F12 or system menu');
  };

  const handleViewDemo = () => {
    if (onShowDemo) {
      onShowDemo();
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  // Connection mode handlers
  const handleSelectProfile = (profileId: string) => {
    const profile = getProfileById(profileId);
    if (!profile) return;

    const newTabId = crypto.randomUUID();
    addTab({
      id: newTabId,
      title: profile.name,
      type: 'terminal',
      closable: true,
      connectionType: profile.type,
      connectionConfig: profile.config,
      connectionProfileId: profileId,
    });

    // Add to recent connections
    addToRecent(profileId);

    // Close dialog
    setOpen(false);
  };

  const handleToggleFavorite = (profileId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent CommandItem selection
    toggleFavorite(profileId);
    // Dialog stays open
  };

  const handleCreateConnection = (type: ConnectionType) => {
    if (type === 'local') {
      // Create local terminal immediately
      const newTabId = crypto.randomUUID();
      const terminalCount = tabs.filter((t) => t.type === 'terminal').length;
      addTab({
        id: newTabId,
        title: `Terminal ${terminalCount + 1}`,
        type: 'terminal',
        closable: true,
        connectionType: 'local',
      });
      setOpen(false);
    } else if (type === 'ssh') {
      // Open SSH connection dialog
      if (onOpenSshDialog) {
        onOpenSshDialog();
      }
      setOpen(false);
    } else {
      // TODO: Open connection dialog for other types (telnet, rdp, sftp)
      console.log(`TODO: Open ${type} connection dialog`);
      setOpen(false);
    }
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <CommandInput
        placeholder={mode === 'connection' ? 'Search connections...' : 'Type a command or search...'}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Render based on mode */}
        {mode === 'connection' ? (
          <>
            {/* Recent Connections */}
            {(() => {
              const recentProfiles = getRecentProfiles(10);
              if (recentProfiles.length === 0) return null;

              return (
                <CommandGroup heading="Recent Connections">
                  {recentProfiles.map((profile) => {
                    const Icon = CONNECTION_ICONS[profile.type];
                    return (
                      <CommandItem
                        key={profile.id}
                        onSelect={() => handleSelectProfile(profile.id)}
                        keywords={[profile.name, profile.type]}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <span className="flex-1">{profile.name}</span>
                        <span className="text-xs text-muted-foreground mr-2">
                          {profile.type.toUpperCase()}
                        </span>
                        <button
                          onClick={(e) => handleToggleFavorite(profile.id, e)}
                          className="p-1 hover:bg-accent rounded-sm transition-colors"
                          aria-label={profile.favorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star
                            className={`h-3 w-3 ${profile.favorite ? 'fill-current text-yellow-500' : 'text-muted-foreground'}`}
                          />
                        </button>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })()}

            {/* Favorites */}
            {(() => {
              const favoriteProfiles = getFavoriteProfiles();
              if (favoriteProfiles.length === 0) return null;

              return (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Favorites">
                    {favoriteProfiles.map((profile) => {
                      const Icon = CONNECTION_ICONS[profile.type];
                      return (
                        <CommandItem
                          key={profile.id}
                          onSelect={() => handleSelectProfile(profile.id)}
                          keywords={[profile.name, profile.type]}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          <span className="flex-1">{profile.name}</span>
                          <span className="text-xs text-muted-foreground mr-2">
                            {profile.type.toUpperCase()}
                          </span>
                          <button
                            onClick={(e) => handleToggleFavorite(profile.id, e)}
                            className="p-1 hover:bg-accent rounded-sm transition-colors"
                            aria-label="Remove from favorites"
                          >
                            <Star className="h-3 w-3 fill-current text-yellow-500" />
                          </button>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              );
            })()}

            {/* New Connection */}
            <CommandSeparator />
            <CommandGroup heading="New Connection">
              {(Object.keys(CONNECTION_ICONS) as ConnectionType[]).map((type) => {
                const Icon = CONNECTION_ICONS[type];
                const label = CONNECTION_LABELS[type];
                return (
                  <CommandItem key={type} onSelect={() => handleCreateConnection(type)}>
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        ) : (
          <>
            {/* Tab Management */}
            <CommandGroup heading="Tab Management">
              <CommandItem onSelect={() => runCommand(handleNewTab)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                <span>New Tab</span>
                <CommandShortcut>Ctrl+Shift+T</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(handleCloseTab)} disabled={tabs.length === 0}>
                <Cross2Icon className="mr-2 h-4 w-4" />
                <span>Close Tab</span>
                <CommandShortcut>Ctrl+Shift+W</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(handleNextTab)} disabled={tabs.length <= 1}>
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
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
