import { useDraggable } from '@dnd-kit/core';
import { useState } from 'react';
import { getFileIcon } from '@/constants/file-icons';
import { formatDate, formatFileSize } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { FileInfo, FileSystemType } from '@/types/sftp';
import { FileContextMenu } from './FileContextMenu';

/**
 * Double-click detection delay in milliseconds
 */
const DOUBLE_CLICK_DELAY = 300;

/**
 * Props for FileListItem component
 */
interface FileListItemProps {
  /** File information */
  file: FileInfo;

  /** Index of the file in the file list (for range selection) */
  fileIndex: number;

  /** File system type ('local' | 'remote') */
  fsType: FileSystemType;

  /** Whether the file is currently selected */
  selected: boolean;

  /** Total number of selected files in the panel */
  selectedCount: number;

  /** Callback when file is clicked (single click) */
  onSelect: (file: FileInfo, multiSelect: boolean) => void;

  /** Callback when file range is selected (Shift+Click) */
  onSelectRange: (fileIndex: number) => void;

  /** Callback when file is double-clicked (open file/folder) */
  onOpen: (file: FileInfo) => void;

  /** Callback when rename is requested from context menu */
  onRename: () => void;

  /** Callback when delete is requested from context menu */
  onDelete: () => void;

  /** Callback when transfer is requested from context menu */
  onTransfer: () => void;

  /** Callback when new folder is requested from context menu */
  onNewFolder: () => void;
}

/**
 * FileListItem Component
 *
 * Displays a single file or folder in the file list with:
 * - Drag and drop support (@dnd-kit/core)
 * - Single click to select
 * - Double click to open
 * - Grid layout: Name (dynamic) | Size (120px) | Modified (150px)
 * - Visual feedback for selection and dragging states
 */
export function FileListItem({
  file,
  fileIndex,
  fsType,
  selected,
  selectedCount,
  onSelect,
  onSelectRange,
  onOpen,
  onRename,
  onDelete,
  onTransfer,
  onNewFolder,
}: FileListItemProps) {
  // Double-click detection state
  const [lastClickTime, setLastClickTime] = useState(0);

  // Drag and drop setup
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: file.path,
    data: { file, fsType },
  });

  /**
   * Handle click event - detect single vs double click
   * Supports Ctrl+Click (Windows/Linux) and Cmd+Click (Mac) for multi-select
   * Supports Shift+Click for range selection
   */
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent text selection when using Shift+Click for range selection
    if (e.shiftKey) {
      e.preventDefault();
    }

    const now = Date.now();
    const isDoubleClick = now - lastClickTime < DOUBLE_CLICK_DELAY;

    if (isDoubleClick) {
      // Double-click: open file/folder
      onOpen(file);
    } else {
      // Single click: select file
      if (e.shiftKey) {
        // Shift+Click: range selection
        onSelectRange(fileIndex);
      } else {
        // Check for Ctrl (Windows/Linux) or Cmd (Mac) key for multi-select
        const multiSelect = e.ctrlKey || e.metaKey;
        onSelect(file, multiSelect);
      }
    }

    setLastClickTime(now);
  };

  /**
   * Handle file selection for context menu auto-select
   */
  const handleSelectFile = (fileToSelect: FileInfo) => {
    onSelect(fileToSelect, false); // Single select (no multi-select)
  };

  // Get appropriate icon for file/folder
  const Icon = getFileIcon(file);

  // Disable context menu for ".." parent directory item
  const isParentDirItem = file.name === '..';

  // File item content
  const fileItemContent = (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={cn(
        'grid grid-cols-[1fr_auto_150px] gap-4 p-2 rounded cursor-pointer select-none',
        'hover:bg-accent transition-colors',
        selected && 'bg-accent',
        isDragging && 'opacity-50'
      )}
      {...attributes}
      {...listeners}
    >
      {/* Column 1: Name with icon (dynamic width) */}
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{file.name}</span>
      </div>

      {/* Column 2: Size (120px fixed) */}
      <div className="text-sm text-muted-foreground text-right">
        {file.isDirectory ? '-' : formatFileSize(file.size)}
      </div>

      {/* Column 3: Modified date (150px fixed) */}
      <div className="text-sm text-muted-foreground text-right">
        {formatDate(file.modified)}
      </div>
    </div>
  );

  // Wrap with context menu only for regular files/folders (not "..")
  if (isParentDirItem) {
    return fileItemContent;
  }

  return (
    <FileContextMenu
      file={file}
      fsType={fsType}
      isSelected={selected}
      selectedCount={selectedCount}
      onOpen={onOpen}
      onRename={onRename}
      onDelete={onDelete}
      onTransfer={onTransfer}
      onNewFolder={onNewFolder}
      onSelectFile={handleSelectFile}
    >
      {fileItemContent}
    </FileContextMenu>
  );
}
