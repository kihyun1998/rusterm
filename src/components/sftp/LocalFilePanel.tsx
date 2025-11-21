import { ArrowUp, File, Folder, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
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
  selectedFiles?: string[];
  onSelectFiles?: (paths: string[]) => void;
  onDownload?: (remotePath: string, localPath: string) => Promise<void>;
}

/**
 * LocalFilePanel component
 * Displays local file system with navigation
 */
export function LocalFilePanel({
  selectedFiles = [],
  onSelectFiles,
  onDownload,
}: LocalFilePanelProps = {}) {
  const {
    currentPath,
    files,
    isLoading,
    navigateToDirectory,
    navigateUp,
  } = useLocalFs();

  const hasParent = currentPath !== '/' && currentPath !== '';

  const handleFileClick = async (file: FileEntry) => {
    if (file.isDir) {
      await navigateToDirectory(file.path);
    }
    // Single-click on files - no action yet (upload in future phases)
  };

  const handleSelectFile = (filePath: string, checked: boolean) => {
    if (!onSelectFiles) return;

    if (checked) {
      onSelectFiles([...selectedFiles, filePath]);
    } else {
      onSelectFiles(selectedFiles.filter(p => p !== filePath));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectFiles) return;

    if (checked) {
      const allFilePaths = files.filter(f => !f.isDir).map(f => f.path);
      onSelectFiles(allFilePaths);
    } else {
      onSelectFiles([]);
    }
  };

  const allFilesSelected = files.filter(f => !f.isDir).length > 0 &&
    files.filter(f => !f.isDir).every(f => selectedFiles.includes(f.path));

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, file: FileEntry) => {
    if (file.isDir) {
      e.preventDefault(); // Folders cannot be dragged (not supported yet)
      return;
    }

    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({
        type: 'local',
        path: file.path,
        name: file.name,
        size: file.size,
      })
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();

    if (!onDownload) {
      console.warn('onDownload callback not provided');
      return;
    }

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));

      if (data.type === 'remote') {
        // Remote file dropped → Download to local
        const localPath = `${currentPath}/${data.name}`;
        await onDownload(data.path, localPath);
      }
    } catch (err) {
      console.error('Drop failed:', err);
    }
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
        className="flex-1 overflow-auto sftp-file-list"
        onDragOver={handleDragOver}
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
                  {onSelectFiles && (
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={allFilesSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
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
                    onClick={navigateUp}
                  >
                    {onSelectFiles && <TableCell></TableCell>}
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
                    <TableCell colSpan={onSelectFiles ? 5 : 4} className="text-center text-muted-foreground py-8">
                      디렉토리가 비어있습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  files.map((file) => (
                    <TableRow
                      key={file.path}
                      className={file.isDir ? 'cursor-pointer hover:bg-muted/50' : 'cursor-grab active:cursor-grabbing'}
                      draggable={!file.isDir}
                      onDragStart={(e) => handleDragStart(e, file)}
                    >
                      {onSelectFiles && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {!file.isDir && (
                            <Checkbox
                              checked={selectedFiles.includes(file.path)}
                              onCheckedChange={(checked) =>
                                handleSelectFile(file.path, checked as boolean)
                              }
                            />
                          )}
                        </TableCell>
                      )}
                      <TableCell onClick={() => handleFileClick(file)}>
                        {file.isDir ? (
                          <Folder className="h-4 w-4 text-blue-500" />
                        ) : (
                          <File className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell
                        className={file.isDir ? 'font-medium' : ''}
                        onClick={() => handleFileClick(file)}
                      >
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
                      <TableCell
                        className="text-xs text-muted-foreground"
                        onClick={() => handleFileClick(file)}
                      >
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
                      <TableCell
                        className="text-xs text-muted-foreground"
                        onClick={() => handleFileClick(file)}
                      >
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
                  ))
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
              {selectedFiles.length > 0 && (
                <span className="ml-2 text-blue-600 font-medium">
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
