import { FolderOpen, Lock, Monitor, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ConnectionType } from '@/types/connection';
import { SFTPSessionForm } from './SFTPSessionForm';
import { SSHSessionForm } from './SSHSessionForm';

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateLocal?: () => void;
  onCreateSSH?: (profileId: string) => void;
  onCreateSFTP?: (profileId: string) => void;
}

/**
 * NewSessionDialog Component
 * MobaXterm-style session creation dialog with protocol tabs
 */
export function NewSessionDialog({
  open,
  onOpenChange,
  onCreateLocal,
  onCreateSSH,
  onCreateSFTP,
}: NewSessionDialogProps) {
  const [selectedProtocol, setSelectedProtocol] = useState<ConnectionType>('local');

  const handleCreateLocal = () => {
    onCreateLocal?.();
    onOpenChange(false);
  };

  const handleCreateSSH = (profileId: string) => {
    onCreateSSH?.(profileId);
    onOpenChange(false);
  };

  const handleCreateSFTP = (profileId: string) => {
    onCreateSFTP?.(profileId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Session
          </DialogTitle>
          <DialogDescription>Choose a protocol and configure your connection</DialogDescription>
        </DialogHeader>

        <Tabs value={selectedProtocol} onValueChange={(v) => setSelectedProtocol(v as ConnectionType)}>
          {/* Protocol Selector (Chip-style) */}
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="local" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Local Terminal
            </TabsTrigger>
            <TabsTrigger value="ssh" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              SSH
            </TabsTrigger>
            <TabsTrigger value="sftp" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              SFTP
            </TabsTrigger>
          </TabsList>

          {/* Local Terminal Tab */}
          <TabsContent value="local" className="space-y-4">
            <div className="py-8 text-center space-y-4">
              <Monitor className="h-16 w-16 mx-auto text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Local Terminal</h3>
                <p className="text-sm text-muted-foreground">
                  Open a new local terminal session on your machine
                </p>
              </div>
              <Button onClick={handleCreateLocal} className="mt-4">
                Create Local Terminal
              </Button>
            </div>
          </TabsContent>

          {/* SSH Tab */}
          <TabsContent value="ssh" className="space-y-4">
            <SSHSessionForm
              onConnect={handleCreateSSH}
              onCancel={() => onOpenChange(false)}
            />
          </TabsContent>

          {/* SFTP Tab */}
          <TabsContent value="sftp" className="space-y-4">
            <SFTPSessionForm
              onConnect={handleCreateSFTP}
              onCancel={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
