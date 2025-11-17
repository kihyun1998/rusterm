import { useState } from 'react';
import { useSettingsStore } from '@/stores';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

/**
 * About Tab Component
 * Version information and reset settings
 */
export function AboutTab() {
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleReset = () => {
    resetSettings();
    setShowResetDialog(false);
  };

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-6">
        {/* About Rusterm */}
        <Card>
          <CardHeader>
            <CardTitle>About Rusterm</CardTitle>
            <CardDescription>Terminal emulator built with modern web technologies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Version</span>
                <span className="text-sm text-muted-foreground">0.1.0</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm font-medium">Built with</span>
                <span className="text-sm text-muted-foreground">Tauri + React</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm font-medium">Language</span>
                <span className="text-sm text-muted-foreground">TypeScript + Rust</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm font-medium">UI Framework</span>
                <span className="text-sm text-muted-foreground">shadcn/ui</span>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                A modern, fast, and customizable terminal emulator for Windows.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Technologies */}
        <Card>
          <CardHeader>
            <CardTitle>Technologies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">Tauri</div>
                <div className="text-xs text-muted-foreground">Desktop Framework</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">React</div>
                <div className="text-xs text-muted-foreground">UI Library</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">TypeScript</div>
                <div className="text-xs text-muted-foreground">Frontend Language</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">Rust</div>
                <div className="text-xs text-muted-foreground">Backend Language</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">xterm.js</div>
                <div className="text-xs text-muted-foreground">Terminal Emulator</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">Zustand</div>
                <div className="text-xs text-muted-foreground">State Management</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reset Settings */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Reset Settings</CardTitle>
            <CardDescription>
              Reset all settings to their default values
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will reset all customizations including font settings, cursor preferences,
              theme colors, and advanced options. This action cannot be undone.
            </p>

            {/* AlertDialog for Reset Confirmation */}
            <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  Reset All Settings to Defaults
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset all settings to their default values, including:
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-4">
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Font family, size, and line height</li>
                    <li>Cursor style and blink settings</li>
                    <li>Color theme and custom colors</li>
                    <li>Shell and startup directory</li>
                    <li>Scrollback buffer size</li>
                  </ul>
                </div>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReset}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Reset Settings
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Links */}
        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                GitHub Repository
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="https://tauri.app" target="_blank" rel="noopener noreferrer">
                Tauri Documentation
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="https://ui.shadcn.com" target="_blank" rel="noopener noreferrer">
                shadcn/ui Components
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
