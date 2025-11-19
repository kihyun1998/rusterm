import { useState } from 'react';
import { AlertTriangleIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { StoredConnectionProfile } from '@/types/connection';
import { useConnectionProfileStore } from '@/stores/use-connection-profile-store';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: StoredConnectionProfile | null;
}

/**
 * Delete Confirmation Dialog Component
 *
 * Shows a confirmation dialog before deleting a connection profile
 * Warns user that saved credentials will also be removed
 */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  profile,
}: DeleteConfirmDialogProps) {
  const deleteProfile = useConnectionProfileStore((state) => state.deleteProfile);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!profile) return;

    setIsDeleting(true);

    try {
      await deleteProfile(profile.id);

      toast.success('Profile Deleted', {
        description: `"${profile.name}" has been deleted successfully`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete profile:', error);
      toast.error('Delete Failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!profile) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            Delete Connection Profile
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>"{profile.name}"</strong>?
            </p>
            <p className="text-sm">
              This will also remove all saved credentials from your system keychain. This action
              cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
