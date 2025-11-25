import { useDraggable } from '@dnd-kit/core';
import { useState } from 'react';
import { getFileIcon } from '@/constants/file-icons';
import { formatDate, formatFileSize } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { FileInfo, FileSystemType } from '@/types/sftp';

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

  /** File system type ('local' | 'remote') */
  fsType: FileSystemType;

  /** Whether the file is currently selected */
  selected: boolean;

  /** Callback when file is clicked (single click) */
  onSelect: (file: FileInfo) => void;

  /** Callback when file is double-clicked (open file/folder) */
  onOpen: (file: FileInfo) => void;
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
  fsType,
  selected,
  onSelect,
  onOpen,
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
   */
  const handleClick = () => {
    const now = Date.now();

    // Double-click: open file/folder
    if (now - lastClickTime < DOUBLE_CLICK_DELAY) {
      onOpen(file);
    } else {
      // Single click: select file
      onSelect(file);
    }

    setLastClickTime(now);
  };

  // Get appropriate icon for file/folder
  const Icon = getFileIcon(file);

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={cn(
        'grid grid-cols-[1fr_120px_150px] gap-4 p-2 rounded cursor-pointer',
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
}
