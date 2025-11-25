import { ScrollArea } from '@/components/ui/scroll-area';
import type { FileInfo, FileSystemType } from '@/types/sftp';
import { FileListItem } from './FileListItem';

/**
 * Props for FileList component
 */
interface FileListProps {
  /** 현재 디렉토리 경로 */
  currentPath: string;

  /** 표시할 파일/폴더 목록 */
  files: FileInfo[];

  /** 선택된 파일들의 경로 Set */
  selectedFiles: Set<string>;

  /** 파일 시스템 타입 ('local' | 'remote') */
  fsType: FileSystemType;

  /** 파일 선택 시 콜백 */
  onSelectFile: (file: FileInfo, multiSelect: boolean) => void;

  /** 파일 범위 선택 시 콜백 (Shift+Click) */
  onSelectFileRange: (fileIndex: number) => void;

  /** 파일/폴더 열기 시 콜백 */
  onOpenFile: (file: FileInfo) => void;

  /** 상위 디렉토리로 이동 콜백 */
  onNavigateUp: () => void;

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
 * Check if the path is a root directory
 * - Unix/Linux/macOS: "/"
 * - Windows: "C:\", "D:\" etc (length <= 3)
 */
function isRootPath(path: string): boolean {
  // Unix root
  if (path === '/') return true;

  // Windows root: C:\, D:\, etc
  if (path.length <= 3 && path.includes(':')) return true;

  return false;
}

/**
 * FileList Component
 *
 * Displays a list of files and folders with:
 * - Header with column names (Name, Size, Modified)
 * - ".." parent directory item (when not at root)
 * - Scrollable file list
 * - Grid layout matching FileListItem
 */
export function FileList({
  currentPath,
  files,
  selectedFiles,
  fsType,
  onSelectFile,
  onSelectFileRange,
  onOpenFile,
  onNavigateUp,
  onRename,
  onDelete,
  onTransfer,
  onNewFolder,
}: FileListProps) {
  // Check if current path is root
  const isRoot = isRootPath(currentPath);

  // Special ".." parent directory item

  // Special ".." parent directory item
  const parentDirItem: FileInfo = {
    name: '..',
    path: '..',
    isDirectory: true,
    size: 0,
    modified: 0, // Will be displayed as "-"
  };

  return (
    <div className="flex flex-col h-full min-w-[450px]">
      {/* Header - fixed at top */}
      <div className="grid grid-cols-[1fr_auto_150px] gap-4 px-2 py-2 border-b bg-muted/50 font-medium text-sm">
        <div>Name</div>
        <div className="text-right">Size</div>
        <div className="text-right">Modified</div>
      </div>

      {/* Scrollable file list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-1">
          {/* ".." parent directory item (if not at root) */}
          {!isRoot && (
            <FileListItem
              file={parentDirItem}
              fsType={fsType}
              selected={false}
              selectedCount={selectedFiles.size}
              onSelect={() => {}} // Ignore selection for ".."
              onOpen={onNavigateUp} // Double-click to go up
              onRename={onRename}
              onDelete={onDelete}
              onTransfer={onTransfer}
              onNewFolder={onNewFolder}
            />
          )}

          {/* File list */}
          {files.map((file, index) => (
            <FileListItem
              key={file.path}
              file={file}
              fileIndex={index}
              fsType={fsType}
              selected={selectedFiles.has(file.path)}
              selectedCount={selectedFiles.size}
              onSelect={(file, multiSelect) => onSelectFile(file, multiSelect)}
              onSelectRange={(index) => onSelectFileRange(index)}
              onOpen={onOpenFile}
              onRename={onRename}
              onDelete={onDelete}
              onTransfer={onTransfer}
              onNewFolder={onNewFolder}
            />
          ))}

          {/* Empty directory message */}
          {files.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              빈 디렉토리입니다
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
