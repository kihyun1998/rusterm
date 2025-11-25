import { Download, Edit, FolderOpen, FolderPlus, Trash2, Upload } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { FileInfo, FileSystemType } from '@/types/sftp';

/**
 * Props for FileContextMenu component
 */
interface FileContextMenuProps {
  /** File information */
  file: FileInfo;

  /** File system type ('local' | 'remote') */
  fsType: FileSystemType;

  /** Whether the file is currently selected */
  isSelected: boolean;

  /** Total number of selected files in the panel */
  selectedCount: number;

  /** Children to wrap (FileListItem) */
  children: ReactNode;

  /** Callback when file is opened (folder navigation) */
  onOpen: (file: FileInfo) => void;

  /** Callback when rename is requested */
  onRename: () => void;

  /** Callback when delete is requested */
  onDelete: () => void;

  /** Callback when transfer is requested */
  onTransfer: () => void;

  /** Callback when new folder creation is requested */
  onNewFolder: () => void;

  /** Callback when file selection is needed (for auto-select on right-click) */
  onSelectFile: (file: FileInfo) => void;
}

/**
 * FileContextMenu Component
 *
 * Provides context menu for file/folder operations:
 * - Open (folders only)
 * - New Folder (folders only)
 * - Transfer (Upload/Download based on fsType)
 * - Rename (single selection only)
 * - Delete (destructive action)
 *
 * Features:
 * - Auto-select file on right-click if not selected
 * - Conditional menu items based on file type and selection
 * - Keyboard shortcuts display
 * - Multi-selection support
 */
export function FileContextMenu({
  file,
  fsType,
  isSelected,
  selectedCount,
  children,
  onOpen,
  onRename,
  onDelete,
  onTransfer,
  onNewFolder,
  onSelectFile,
}: FileContextMenuProps) {
  // Conditional menu item visibility
  const showOpen = file.isDirectory;
  const showNewFolder = file.isDirectory;
  const showRename = selectedCount === 1;

  // Transfer icon and label based on file system type
  const TransferIcon = fsType === 'local' ? Upload : Download;
  const transferLabel = fsType === 'local' ? 'Upload' : 'Download';

  /**
   * Auto-select file on context menu open if not already selected
   */
  const handleOpenChange = (open: boolean) => {
    if (open && !isSelected) {
      onSelectFile(file);
    }
  };

  return (
    <ContextMenu onOpenChange={handleOpenChange}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* Open (folders only) */}
        {showOpen && (
          <>
            <ContextMenuItem onClick={() => onOpen(file)}>
              <FolderOpen />
              <span>Open</span>
              <ContextMenuShortcut>Enter</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        {/* New Folder (folders only) */}
        {showNewFolder && (
          <ContextMenuItem onClick={onNewFolder}>
            <FolderPlus />
            <span>New Folder</span>
          </ContextMenuItem>
        )}

        {/* Transfer (Upload/Download) */}
        <ContextMenuItem onClick={onTransfer}>
          <TransferIcon />
          <span>
            {transferLabel}
            {selectedCount > 1 && ` ${selectedCount} items`}
          </span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Rename (single selection only) */}
        <ContextMenuItem onClick={onRename} disabled={!showRename}>
          <Edit />
          <span>Rename</span>
          <ContextMenuShortcut>F2</ContextMenuShortcut>
        </ContextMenuItem>

        {/* Delete (destructive) */}
        <ContextMenuItem onClick={onDelete} variant="destructive">
          <Trash2 />
          <span>
            Delete
            {selectedCount > 1 && ` ${selectedCount} items`}
          </span>
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
