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
import { useLocalFs } from '@/hooks/use-local-fs';
import type { FileEntry } from '@/types/sftp';

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

interface LocalFilePanelProps {
  onDownload?: (remotePath: string, localPath: string) => Promise<void>;
}

/**
 * LocalFilePanel component
 * Displays local file system with navigation
 */
export function LocalFilePanel({
  onDownload,
}: LocalFilePanelProps = {}) {
  const {
    currentPath,
    files,
    isLoading,
    navigateToDirectory,
    navigateUp,
    selectedFiles,
    toggleSelection,
  } = useLocalFs();

  const hasParent = currentPath !== '/' && currentPath !== '';
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Single-click: Select file or folder (toggle)
  const handleFileClick = (file: FileEntry) => {
    if (isDragging) return; // Ignore click during drag
    toggleSelection(file.path);
  };

  // Double-click: Navigate to directory
  const handleFileDoubleClick = async (file: FileEntry) => {
    if (isDragging) return; // Ignore double-click during drag
    if (file.isDir) {
      await navigateToDirectory(file.path);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, file: FileEntry) => {
    console.log('[LocalFilePanel] DragStart:', file.name, file.isDir ? '(folder)' : '(file)');
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'copy';
    const dragData = {
      type: 'local',
      path: file.path,
      name: file.name,
      size: file.size,
      isDir: file.isDir,
    };
    console.log('[LocalFilePanel] DragData:', dragData);
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
    console.log('[LocalFilePanel] DragEnd');
    // Reset dragging state after a short delay to prevent click events
    setTimeout(() => setIsDragging(false), 50);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    console.log('[LocalFilePanel] DragOver (container level)');
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    console.log('[LocalFilePanel] DragLeave');
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    console.log('[LocalFilePanel] Drop event triggered (on empty area)');

    if (!onDownload) {
      console.warn('[LocalFilePanel] onDownload callback not provided');
      return;
    }

    try {
      const rawData = e.dataTransfer.getData('text/plain');
      console.log('[LocalFilePanel] Raw drop data:', rawData);
      const data = JSON.parse(rawData);
      console.log('[LocalFilePanel] Parsed drop data:', data);

      if (data.type === 'remote') {
        // Remote file dropped → Download to local
        const localPath = `${currentPath}/${data.name}`;
        console.log('[LocalFilePanel] Downloading:', data.path, '→', localPath);
        await onDownload(data.path, localPath);
        console.log('[LocalFilePanel] Download complete');
      } else {
        console.log('[LocalFilePanel] Not a remote file, ignoring');
      }
    } catch (err) {
      console.error('[LocalFilePanel] Drop failed:', err);
    }
  };

  // Drop on folder (download to that folder)
  const handleDropOnFolder = async (e: React.DragEvent, targetFolder: FileEntry) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[LocalFilePanel] Drop on folder:', targetFolder.name);

    if (!onDownload) {
      console.warn('[LocalFilePanel] onDownload callback not provided');
      return;
    }

    try {
      const rawData = e.dataTransfer.getData('text/plain');
      console.log('[LocalFilePanel] Raw drop data:', rawData);
      const data = JSON.parse(rawData);
      console.log('[LocalFilePanel] Parsed drop data:', data);

      if (data.type === 'remote') {
        // Download to target folder
        const localPath = `${targetFolder.path}/${data.name}`;
        console.log('[LocalFilePanel] Downloading to folder:', data.path, '→', localPath);
        await onDownload(data.path, localPath);
        console.log('[LocalFilePanel] Download complete');
      } else {
        console.log('[LocalFilePanel] Not a remote file, ignoring');
      }
    } catch (err) {
      console.error('[LocalFilePanel] Drop on folder failed:', err);
    }
  };

  // Handle drag over rows (prevent default to allow drop)
  const handleRowDragOver = (e: React.DragEvent, file: FileEntry) => {
    e.preventDefault(); // Always prevent default to allow drop
    e.dataTransfer.dropEffect = 'copy';
    console.log('[LocalFilePanel] DragOver row:', file.name, file.isDir ? '(folder)' : '(file)');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">로컬 파일</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1 font-mono">{currentPath}</div>
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
                    onDoubleClick={navigateUp}
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
                {files.length === 0 && !hasParent ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      디렉토리가 비어있습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  files.map((file) => {
                    const isSelected = selectedFiles.has(file.path);
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
              {files.length}개 항목 ({files.filter((f) => f.isDir).length}개 폴더,{' '}
              {files.filter((f) => !f.isDir).length}개 파일)
              {selectedFiles.size > 0 && (
                <span className="ml-2 text-primary font-medium">
                  • {selectedFiles.size}개 선택됨
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
