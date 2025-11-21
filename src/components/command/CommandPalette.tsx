import { useCallback, useEffect, useState } from 'react';

import { Plus } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { CONNECTION_ICONS } from '@/constants/connection-icons';
import { useTabStore } from '@/stores';
import { useConnectionProfileStore } from '@/stores/use-connection-profile-store';

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpenNewSession?: () => void;
}

/**
 * Command Palette Component
 * Displays all saved connections and allows quick connection selection
 */
export function CommandPalette({
  open: controlledOpen,
  onOpenChange,
  onOpenNewSession,
}: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (value: boolean) => {
      if (onOpenChange) {
        onOpenChange(value);
      } else {
        setInternalOpen(value);
      }
    },
    [onOpenChange]
  );

  // Tab management store
  const addTab = useTabStore((state) => state.addTab);

  // Connection profile store
  const getAllProfiles = useConnectionProfileStore((state) => state.getAllProfiles);
  const addToRecent = useConnectionProfileStore((state) => state.addToRecent);
  const getProfileById = useConnectionProfileStore((state) => state.getProfileById);

  // Ctrl+K (Windows) or Cmd+K (Mac) to toggle
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isOpen, setOpen]);

  // Connection mode handlers
  const handleSelectProfile = async (profileId: string) => {
    const profile = getProfileById(profileId);
    if (!profile) {
      console.error('Profile not found:', profileId);
      return;
    }

    console.log('Connecting to profile:', profileId, profile.name);

    const newTabId = crypto.randomUUID();
    addTab({
      id: newTabId,
      title: profile.name,
      type: 'terminal',
      closable: true,
      connectionType: profile.type,
      connectionProfileId: profileId,
    });

    // Add to recent connections
    addToRecent(profileId);

    // Close dialog
    setOpen(false);
  };

  const handleNewConnection = () => {
    // Open new session dialog
    if (onOpenNewSession) {
      onOpenNewSession();
    }
    setOpen(false);
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <CommandInput placeholder="Search connections..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* All Connections (sorted alphabetically by name) */}
        {(() => {
          const allProfiles = getAllProfiles();

          if (allProfiles.length === 0) return null;

          return (
            <CommandGroup heading="All Connections">
              {allProfiles.map((profile) => {
                const Icon = CONNECTION_ICONS[profile.type];
                return (
                  <CommandItem
                    key={profile.id}
                    onSelect={() => handleSelectProfile(profile.id)}
                    keywords={[profile.name, profile.type]}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span className="flex-1">{profile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {profile.type.toUpperCase()}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })()}

        {/* New Connection */}
        <CommandSeparator />
        <CommandGroup heading="New Connection">
          <CommandItem onSelect={handleNewConnection}>
            <Plus className="mr-2 h-4 w-4" />
            <span>New Connection</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
