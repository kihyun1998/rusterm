import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AppearanceTab } from './AppearanceTab';
import { AdvancedTab } from './AdvancedTab';
import { AboutTab } from './AboutTab';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Settings Dialog Component
 * Main settings dialog with tabs for different setting categories
 */
export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your terminal settings
          </DialogDescription>
        </DialogHeader>

        {/* Tabs for different sections */}
        <Tabs defaultValue="appearance" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="appearance" className="h-full mt-4">
              <AppearanceTab />
            </TabsContent>

            <TabsContent value="advanced" className="h-full mt-4">
              <AdvancedTab />
            </TabsContent>

            <TabsContent value="about" className="h-full mt-4">
              <AboutTab />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
