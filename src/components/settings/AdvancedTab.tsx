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
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Advanced Tab Component
 * Shell and performance settings
 */
export function AdvancedTab() {
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-6">
        {/* Shell Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Shell</CardTitle>
            <CardDescription>
              Configure the default shell and startup directory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Default Shell */}
            <div className="grid gap-2">
              <Label htmlFor="shell">Default Shell</Label>
              <Input
                id="shell"
                value={settings.shell}
                onChange={(e) => updateSettings({ shell: e.target.value })}
                placeholder="Leave empty for system default"
              />
              <p className="text-sm text-muted-foreground">
                Specify a custom shell executable (e.g., powershell.exe, cmd.exe, bash.exe)
              </p>
              <p className="text-sm text-muted-foreground">
                Leave empty to use the system default shell
              </p>
            </div>

            {/* Startup Directory */}
            <div className="grid gap-2">
              <Label htmlFor="startupDir">Startup Directory</Label>
              <Input
                id="startupDir"
                value={settings.startupDirectory || ''}
                onChange={(e) => updateSettings({ startupDirectory: e.target.value })}
                placeholder="Leave empty for home directory"
              />
              <p className="text-sm text-muted-foreground">
                Directory to start in when opening a new terminal
              </p>
              <p className="text-sm text-muted-foreground">
                Leave empty to use the user&apos;s home directory
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Performance Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>
              Configure terminal performance and buffer settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scrollback Lines */}
            <div className="grid gap-2">
              <Label htmlFor="scrollback">Scrollback Lines</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="scrollback"
                  type="number"
                  value={settings.scrollback}
                  onChange={(e) =>
                    updateSettings({ scrollback: parseInt(e.target.value) || 1000 })
                  }
                  min={100}
                  max={100000}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">lines</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Number of lines to keep in terminal history
              </p>
              <p className="text-sm text-muted-foreground">
                Higher values use more memory but allow scrolling back further
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Some settings may require restarting the terminal or creating a new tab to take effect.
            </p>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
