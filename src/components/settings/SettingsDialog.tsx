import { Moon, Palette, Sun } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { getThemeById, TERMINAL_THEMES } from '@/constants/terminal-themes';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/stores';
import { TerminalPreview } from './TerminalPreview';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FONT_FAMILIES = [
  { value: 'Cascadia Code, Consolas, Monaco, monospace', label: 'Cascadia Code' },
  { value: 'Consolas, "Courier New", monospace', label: 'Consolas' },
  { value: 'Monaco, "Courier New", monospace', label: 'Monaco' },
  { value: '"Courier New", monospace', label: 'Courier New' },
  { value: 'Menlo, Monaco, monospace', label: 'Menlo' },
  { value: '"Fira Code", monospace', label: 'Fira Code' },
  { value: '"JetBrains Mono", monospace', label: 'JetBrains Mono' },
];

/**
 * Settings Dialog Component
 * Manages application settings with persistent storage via Rust backend
 */
export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, toggleTheme } = useTheme();
  const settings = useSettingsStore((state) => state.settings);
  const updateAppTheme = useSettingsStore((state) => state.updateAppTheme);
  const updateTerminalThemeId = useSettingsStore((state) => state.updateTerminalThemeId);
  const updateFontSize = useSettingsStore((state) => state.updateFontSize);
  const updateFontFamily = useSettingsStore((state) => state.updateFontFamily);
  const isDark = theme === 'dark';

  // Find current theme ID from stored terminalThemeId
  const currentThemeId = settings?.terminalThemeId || TERMINAL_THEMES[0].id;
  const currentTheme = getThemeById(currentThemeId)?.theme;

  const handleThemeToggle = async () => {
    toggleTheme();

    // Sync terminal theme with UI theme and save to backend
    try {
      if (isDark) {
        // Switching to Light
        await updateAppTheme('light');
        await updateTheme({
          background: '#ffffff',
          foreground: '#000000',
          cursor: '#000000',
          cursorAccent: '#ffffff',
          selectionBackground: '#add6ff',
        });
      } else {
        // Switching to Dark
        await updateAppTheme('dark');
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

  const handleFontSizeChange = async (value: number[]) => {
    try {
      await updateFontSize(value[0]);
    } catch (error) {
      console.error('Failed to save font size:', error);
    }
  };

  const handleFontFamilyChange = async (value: string) => {
    try {
      await updateFontFamily(value);
    } catch (error) {
      console.error('Failed to save font family:', error);
    }
  };

  const handleTerminalThemeChange = async (themeId: string) => {
    try {
      await updateTerminalThemeId(themeId);
    } catch (error) {
      console.error('Failed to save terminal theme:', error);
    }
  };

  if (!settings) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Customize your terminal appearance and behavior</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6 pr-1 max-h-[60vh] overflow-y-auto settings-scrollbar">
          {/* Theme Toggle */}
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

          {/* Font Size Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="font-size">Font Size</Label>
              <span className="text-sm text-muted-foreground">{settings.fontSize}px</span>
            </div>
            <Slider
              id="font-size"
              min={8}
              max={30}
              step={1}
              value={[settings.fontSize]}
              onValueChange={handleFontSizeChange}
              className="w-full"
            />
          </div>

          {/* Font Family Select */}
          <div className="space-y-3">
            <Label htmlFor="font-family">Font Family</Label>
            <Select value={settings.fontFamily} onValueChange={handleFontFamilyChange}>
              <SelectTrigger id="font-family">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Separator */}
          <div className="border-t border-border" />

          {/* Terminal Theme Select */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="terminal-theme">Terminal Color Theme</Label>
                <p className="text-sm text-muted-foreground">Choose from preset color schemes</p>
              </div>
            </div>
            <Select value={currentThemeId} onValueChange={handleTerminalThemeChange}>
              <SelectTrigger id="terminal-theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                {TERMINAL_THEMES.map((theme) => (
                  <SelectItem key={theme.id} value={theme.id}>
                    <div>
                      <div className="font-medium">{theme.name}</div>
                      <div className="text-xs text-muted-foreground">{theme.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Terminal Preview */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              {currentTheme && (
                <TerminalPreview
                  theme={currentTheme}
                  fontSize={settings.fontSize}
                  fontFamily={settings.fontFamily}
                />
              )}
            </div>
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
