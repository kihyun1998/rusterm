import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/stores';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Settings Dialog Component
 * Manages application settings with persistent storage via Rust backend
 */
export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, toggleTheme } = useTheme();
  const updateTheme = useSettingsStore((state) => state.updateTheme);
  const isDark = theme === 'dark';

  const handleThemeToggle = async () => {
    toggleTheme();

    // Sync terminal theme with UI theme and save to backend
    try {
      if (isDark) {
        // Switching to Light
        await updateTheme({
          background: '#ffffff',
          foreground: '#000000',
          cursor: '#000000',
          cursorAccent: '#ffffff',
          selectionBackground: '#add6ff',
        });
      } else {
        // Switching to Dark
        await updateTheme({
          background: '#1e1e1e',
          foreground: '#cccccc',
          cursor: '#ffffff',
          cursorAccent: '#000000',
          selectionBackground: '#264f78',
        });
      }
    } catch (error) {
      console.error('Failed to save theme settings:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Customize your terminal appearance and behavior</DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDark ? (
                <Moon className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Sun className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="space-y-0.5">
                <Label htmlFor="theme-toggle">Theme</Label>
                <p className="text-sm text-muted-foreground">{isDark ? 'Dark' : 'Light'}</p>
              </div>
            </div>
            <Switch id="theme-toggle" checked={isDark} onCheckedChange={handleThemeToggle} />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
