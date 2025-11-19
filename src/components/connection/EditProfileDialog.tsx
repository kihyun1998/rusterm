import { Edit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConnectionProfileStore } from '@/stores/use-connection-profile-store';
import type { ConnectionProfile, StoredConnectionProfile } from '@/types/connection';
import { isSSHConfig } from '@/types/connection';

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: StoredConnectionProfile | null;
}

/**
 * Edit Profile Dialog Component
 *
 * Allows users to edit connection profile details
 * - Name
 * - Host (for SSH)
 * - Port (for SSH)
 * - Username (for SSH)
 * Note: Passwords are not shown for security - user must reconnect to update
 */
export function EditProfileDialog({ open, onOpenChange, profile }: EditProfileDialogProps) {
  const updateProfile = useConnectionProfileStore((state) => state.updateProfile);

  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('');

  // Load profile data when dialog opens
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      if (profile.type === 'ssh' && isSSHConfig(profile.config)) {
        setHost(profile.config.host);
        setPort(profile.config.port);
        setUsername(profile.config.username);
      }
    }
  }, [profile]);

  const handleSave = () => {
    if (!profile) return;

    // Validation
    if (!name.trim()) {
      toast.error('Validation Error', {
        description: 'Profile name is required',
      });
      return;
    }

    if (profile.type === 'ssh') {
      if (!host.trim()) {
        toast.error('Validation Error', {
          description: 'Host is required',
        });
        return;
      }

      if (port < 1 || port > 65535) {
        toast.error('Validation Error', {
          description: 'Port must be between 1 and 65535',
        });
        return;
      }

      if (!username.trim()) {
        toast.error('Validation Error', {
          description: 'Username is required',
        });
        return;
      }
    }

    // Update profile
    const updates: Partial<ConnectionProfile> = {
      name: name.trim(),
    };

    // Update SSH-specific fields
    if (profile.type === 'ssh' && isSSHConfig(profile.config)) {
      updates.config = {
        ...profile.config,
        host: host.trim(),
        port,
        username: username.trim(),
      };
    }

    updateProfile(profile.id, updates);

    toast.success('Profile Updated', {
      description: `"${name}" has been updated successfully`,
    });

    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!profile) return null;

  const isSSH = profile.type === 'ssh' && isSSHConfig(profile.config);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Profile
          </DialogTitle>
          <DialogDescription>
            Update connection profile details. Passwords are not shown for security.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Profile Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">
              Profile Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production Server"
              autoComplete="off"
            />
          </div>

          {/* SSH-specific fields */}
          {isSSH && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-host">
                  Host <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="192.168.1.100 or example.com"
                  autoComplete="off"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-port">
                    Port <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-port"
                    type="number"
                    min="1"
                    max="65535"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value, 10) || 22)}
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-username">
                    Username <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="user"
                    autoComplete="off"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                To update credentials (password/key), reconnect using the SSH dialog.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
