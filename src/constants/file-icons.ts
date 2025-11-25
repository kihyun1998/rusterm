import {
  File,
  FileCode,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  type LucideIcon,
} from 'lucide-react';
import type { FileInfo } from '@/types/sftp';

/**
 * Get appropriate icon for a file or directory
 *
 * Maps file types to their corresponding Lucide icons based on:
 * - Directory status (open/closed)
 * - File extension for code, text, and image files
 * - Default file icon for unknown types
 *
 * @param file - File information object
 * @param isOpen - Whether the folder is open (only affects directories)
 * @returns Lucide icon component
 *
 * @example
 * ```tsx
 * const Icon = getFileIcon({ name: 'test.ts', isDirectory: false, ... });
 * <Icon className="h-4 w-4" />
 * ```
 */
export function getFileIcon(file: FileInfo, isOpen = false): LucideIcon {
  // Directory icons
  if (file.isDirectory) {
    return isOpen ? FolderOpen : Folder;
  }

  // Extract file extension
  const ext = file.name.split('.').pop()?.toLowerCase();

  // Code files
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'rs', 'go'].includes(ext ?? '')) {
    return FileCode;
  }

  // Text files
  if (['txt', 'md', 'json', 'xml', 'yaml', 'yml'].includes(ext ?? '')) {
    return FileText;
  }

  // Image files
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext ?? '')) {
    return FileImage;
  }

  // Default file icon
  return File;
}
