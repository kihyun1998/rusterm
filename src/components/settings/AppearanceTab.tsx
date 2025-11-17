import { useSettingsStore } from '@/stores';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Appearance Tab Component
 * Font, Cursor, and Theme settings
 */
export function AppearanceTab() {
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const updateTheme = useSettingsStore((state) => state.updateTheme);

  const applyDarkTheme = () => {
    updateTheme({
      background: '#1e1e1e',
      foreground: '#cccccc',
      cursor: '#ffffff',
      cursorAccent: '#000000',
      selectionBackground: '#264f78',
    });
  };

  const applyLightTheme = () => {
    updateTheme({
      background: '#ffffff',
      foreground: '#000000',
      cursor: '#000000',
      cursorAccent: '#ffffff',
      selectionBackground: '#add6ff',
    });
  };

  const applySolarizedDark = () => {
    updateTheme({
      background: '#002b36',
      foreground: '#839496',
      cursor: '#93a1a1',
    });
  };

  const applyMonokai = () => {
    updateTheme({
      background: '#272822',
      foreground: '#f8f8f2',
      cursor: '#f8f8f0',
    });
  };

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-6">
        {/* Font Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Font</CardTitle>
            <CardDescription>Customize font family, size, and spacing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Font Family */}
            <div className="grid gap-2">
              <Label htmlFor="fontFamily">Font Family</Label>
              <Input
                id="fontFamily"
                value={settings.fontFamily}
                onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                placeholder="Consolas, Courier New, monospace"
              />
              <p className="text-sm text-muted-foreground">
                Use monospace fonts for best terminal experience
              </p>
            </div>

            {/* Font Size */}
            <div className="grid gap-2">
              <Label htmlFor="fontSize">Font Size</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="fontSize"
                  type="number"
                  value={settings.fontSize}
                  onChange={(e) =>
                    updateSettings({ fontSize: parseInt(e.target.value) || 14 })
                  }
                  min={8}
                  max={32}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">px</span>
              </div>
            </div>

            {/* Line Height */}
            <div className="grid gap-2">
              <Label htmlFor="lineHeight">Line Height</Label>
              <Input
                id="lineHeight"
                type="number"
                step="0.1"
                value={settings.lineHeight}
                onChange={(e) =>
                  updateSettings({ lineHeight: parseFloat(e.target.value) || 1.2 })
                }
                min={1.0}
                max={2.0}
                className="w-24"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cursor Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Cursor</CardTitle>
            <CardDescription>Configure cursor appearance and behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cursor Style */}
            <div className="grid gap-2">
              <Label htmlFor="cursorStyle">Cursor Style</Label>
              <Select
                value={settings.cursorStyle}
                onValueChange={(value: 'block' | 'underline' | 'bar') =>
                  updateSettings({ cursorStyle: value })
                }
              >
                <SelectTrigger id="cursorStyle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="underline">Underline</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cursor Blink */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="cursorBlink">Cursor Blink</Label>
                <p className="text-sm text-muted-foreground">
                  Make the cursor blink
                </p>
              </div>
              <Switch
                id="cursorBlink"
                checked={settings.cursorBlink}
                onCheckedChange={(checked) => updateSettings({ cursorBlink: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>Choose or customize your color theme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Theme Presets */}
            <div className="space-y-2">
              <Label>Theme Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={applyDarkTheme} variant="outline" size="sm">
                  Dark
                </Button>
                <Button onClick={applyLightTheme} variant="outline" size="sm">
                  Light
                </Button>
                <Button onClick={applySolarizedDark} variant="outline" size="sm">
                  Solarized Dark
                </Button>
                <Button onClick={applyMonokai} variant="outline" size="sm">
                  Monokai
                </Button>
              </div>
            </div>

            <Separator />

            {/* Custom Colors */}
            <div className="space-y-4">
              <Label>Custom Colors</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="bgColor" className="text-sm">
                    Background
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="bgColor"
                      type="color"
                      value={settings.theme.background}
                      onChange={(e) => updateTheme({ background: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={settings.theme.background}
                      onChange={(e) => updateTheme({ background: e.target.value })}
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="fgColor" className="text-sm">
                    Foreground
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="fgColor"
                      type="color"
                      value={settings.theme.foreground}
                      onChange={(e) => updateTheme({ foreground: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={settings.theme.foreground}
                      onChange={(e) => updateTheme({ foreground: e.target.value })}
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cursorColor" className="text-sm">
                    Cursor
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="cursorColor"
                      type="color"
                      value={settings.theme.cursor}
                      onChange={(e) => updateTheme({ cursor: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={settings.theme.cursor}
                      onChange={(e) => updateTheme({ cursor: e.target.value })}
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="selectionColor" className="text-sm">
                    Selection
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="selectionColor"
                      type="color"
                      value={settings.theme.selectionBackground || '#264f78'}
                      onChange={(e) =>
                        updateTheme({ selectionBackground: e.target.value })
                      }
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={settings.theme.selectionBackground || '#264f78'}
                      onChange={(e) =>
                        updateTheme({ selectionBackground: e.target.value })
                      }
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Terminal Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div
                className="p-4 rounded-md font-mono"
                style={{
                  backgroundColor: settings.theme.background,
                  color: settings.theme.foreground,
                  fontSize: settings.fontSize,
                  fontFamily: settings.fontFamily,
                  lineHeight: settings.lineHeight,
                }}
              >
                <div className="flex items-center">
                  <span>$ </span>
                  <span className="ml-1">echo &quot;Hello, Rusterm!&quot;</span>
                </div>
                <div>Hello, Rusterm!</div>
                <div className="flex items-center mt-2">
                  <span>$ </span>
                  <div
                    className="ml-1"
                    style={{
                      width: settings.cursorStyle === 'bar' ? '2px' : '8px',
                      height: settings.cursorStyle === 'underline' ? '2px' : '1em',
                      backgroundColor: settings.theme.cursor,
                      display: 'inline-block',
                      verticalAlign: settings.cursorStyle === 'underline' ? 'bottom' : 'baseline',
                      animation: settings.cursorBlink ? 'blink 1s infinite' : 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <style>{`
          @keyframes blink {
            0%, 49% { opacity: 1; }
            50%, 100% { opacity: 0; }
          }
        `}</style>
      </div>
    </ScrollArea>
  );
}
