import { ArrowUp, File, Folder, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { FileEntry } from '@/types/sftp';

interface RemoteFilePanelProps {
  fileList: FileEntry[];
  currentPath: string;
  isLoading: boolean;
  onChangeDirectory: (path: string) => Promise<void>;
  onCreateDirectory?: (path: string) => Promise<void>;
  onDeleteFile?: (path: string, isDir: boolean) => Promise<void>;
  onRenameFile?: (oldPath: string, newPath: string) => Promise<void>;
  selectedFiles?: string[];
  onSelectFiles?: (paths: string[]) => void;
  onUpload?: (localPath: string, remotePath: string) => Promise<void>;
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0KB';
  const k = 1024;
  if (bytes < k) return '0KB';
  const sizes = ['KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k)) - 1;
  return `${(bytes / Math.pow(k, i + 1)).toFixed(1)}${sizes[i]}`;
}

/**
 * Format Unix timestamp to readable date
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get parent directory path
 */
function getParentPath(path: string | undefined): string {
  if (!path || path === '/' || path === '') return '/';
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return '/' + parts.join('/');
}

/**
 * RemoteFilePanel component
 * Displays remote SFTP file list with navigation
 */
export function RemoteFilePanel({
  fileList,
  currentPath,
  isLoading,
  onChangeDirectory,
  selectedFiles = [],
  onSelectFiles,
  onUpload,
}: RemoteFilePanelProps) {
  // Ensure currentPath is never undefined
  const safePath = currentPath || '/';
  const hasParent = safePath !== '/' && safePath !== '';
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Single-click: Select file or folder (toggle)
  const handleFileClick = (file: FileEntry) => {
    if (isDragging) return; // Ignore click during drag
    if (!onSelectFiles) return;

    // Toggle selection
    if (selectedFiles.includes(file.path)) {
      onSelectFiles(selectedFiles.filter(p => p !== file.path));
    } else {
      onSelectFiles([...selectedFiles, file.path]);
    }
  };

  // Double-click: Navigate to directory
  const handleFileDoubleClick = async (file: FileEntry) => {
    if (isDragging) return; // Ignore double-click during drag
    if (file.isDir) {
      await onChangeDirectory(file.path);
    }
  };

  const handleParentDoubleClick = async () => {
    const parentPath = getParentPath(safePath);
    await onChangeDirectory(parentPath);
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, file: FileEntry) => {
    console.log('[RemoteFilePanel] DragStart:', file.name, file.isDir ? '(folder)' : '(file)');
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'copy';
    const dragData = {
      type: 'remote',
      path: file.path,
      name: file.name,
      size: file.size,
      isDir: file.isDir,
    };
    console.log('[RemoteFilePanel] DragData:', dragData);
    e.dataTransfer.setData('text/plain', JSON.stringify(dragData));

    // Create custom drag image
    const dragImage = document.createElement('div');
    dragImage.className = 'px-3 py-2 bg-background border rounded-md shadow-lg text-sm font-medium';
    dragImage.textContent = file.name;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-9999px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragEnd = () => {
    console.log('[RemoteFilePanel] DragEnd');
    // Reset dragging state after a short delay to prevent click events
    setTimeout(() => setIsDragging(false), 50);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    console.log('[RemoteFilePanel] DragOver (container level)');
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    console.log('[RemoteFilePanel] DragLeave');
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    console.log('[RemoteFilePanel] Drop event triggered (on empty area)');

    if (!onUpload) {
      console.warn('[RemoteFilePanel] onUpload callback not provided');
      return;
    }

    try {
      const rawData = e.dataTransfer.getData('text/plain');
      console.log('[RemoteFilePanel] Raw drop data:', rawData);
      const data = JSON.parse(rawData);
      console.log('[RemoteFilePanel] Parsed drop data:', data);

      if (data.type === 'local') {
        // Local file dropped → Upload to remote
        const remotePath = `${safePath}/${data.name}`;
        console.log('[RemoteFilePanel] Uploading:', data.path, '→', remotePath);
        await onUpload(data.path, remotePath);
        console.log('[RemoteFilePanel] Upload complete');
      } else {
        console.log('[RemoteFilePanel] Not a local file, ignoring');
      }
    } catch (err) {
      console.error('[RemoteFilePanel] Drop failed:', err);
    }
  };

  // Drop on folder (upload to that folder)
  const handleDropOnFolder = async (e: React.DragEvent, targetFolder: FileEntry) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[RemoteFilePanel] Drop on folder:', targetFolder.name);

    if (!onUpload) {
      console.warn('[RemoteFilePanel] onUpload callback not provided');
      return;
    }

    try {
      const rawData = e.dataTransfer.getData('text/plain');
      console.log('[RemoteFilePanel] Raw drop data:', rawData);
      const data = JSON.parse(rawData);
      console.log('[RemoteFilePanel] Parsed drop data:', data);

      if (data.type === 'local') {
        // Upload to target folder
        const remotePath = `${targetFolder.path}/${data.name}`;
        console.log('[RemoteFilePanel] Uploading to folder:', data.path, '→', remotePath);
        await onUpload(data.path, remotePath);
        console.log('[RemoteFilePanel] Upload complete');
      } else {
        console.log('[RemoteFilePanel] Not a local file, ignoring');
      }
    } catch (err) {
      console.error('[RemoteFilePanel] Drop on folder failed:', err);
    }
  };

  // Handle drag over rows (prevent default to allow drop)
  const handleRowDragOver = (e: React.DragEvent, file: FileEntry) => {
    e.preventDefault(); // Always prevent default to allow drop
    e.dataTransfer.dropEffect = 'copy';
    console.log('[RemoteFilePanel] DragOver row:', file.name, file.isDir ? '(folder)' : '(file)');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">원격 파일</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1 font-mono">{safePath}</div>
      </div>

      {/* File list */}
      <div
        className={`flex-1 overflow-auto sftp-file-list transition-all ${isDragOver ? 'ring-2 ring-primary ring-inset' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead className="w-[100px]">크기</TableHead>
                  <TableHead className="w-[150px]">수정일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Parent directory */}
                {hasParent && (
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onDoubleClick={handleParentDoubleClick}
                  >
                    <TableCell>
                      <ArrowUp className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">..</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}

                {/* Files and directories */}
                {fileList.length === 0 && !hasParent ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      디렉토리가 비어있습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  fileList.map((file) => {
                    const isSelected = selectedFiles.includes(file.path);
                    return (
                      <TableRow
                        key={file.path}
                        className={`
                          cursor-grab active:cursor-grabbing
                          ${isSelected ? 'bg-accent/50' : ''}
                          hover:bg-muted/50
                        `}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, file)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleRowDragOver(e, file)}
                        onDrop={file.isDir ? (e) => handleDropOnFolder(e, file) : undefined}
                        onClick={() => handleFileClick(file)}
                        onDoubleClick={() => handleFileDoubleClick(file)}
                      >
                        <TableCell>
                          {file.isDir ? (
                            <Folder className="h-4 w-4 text-blue-500" />
                          ) : (
                            <File className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className={file.isDir ? 'font-medium' : ''}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="truncate max-w-[300px]">
                              {file.name}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{file.name}</p>
                          </TooltipContent>
                        </Tooltip>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="truncate">
                                {file.isDir ? '' : formatFileSize(file.size)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{file.isDir ? '' : formatFileSize(file.size)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="truncate">
                                {formatDate(file.modified)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{formatDate(file.modified)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        )}
      </div>

      {/* Status bar */}
      {!isLoading && (
        <div className="border-t px-4 py-2 bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {fileList.length}개 항목 ({fileList.filter((f) => f.isDir).length}개 폴더,{' '}
              {fileList.filter((f) => !f.isDir).length}개 파일)
              {selectedFiles.length > 0 && (
                <span className="ml-2 text-primary font-medium">
                  • {selectedFiles.length}개 선택됨
                </span>
              )}
            </span>
            {isLoading && (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                로딩 중...
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
