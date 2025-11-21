import { ArrowUp, File, Folder, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { FileEntry } from '@/types/sftp';

interface RemoteFilePanelProps {
  fileList: FileEntry[];
  currentPath: string;
  isLoading: boolean;
  onChangeDirectory: (path: string) => Promise<void>;
  onCreateDirectory?: (path: string) => Promise<void>;
  onDeleteFile?: (path: string, isDir: boolean) => Promise<void>;
  onRenameFile?: (oldPath: string, newPath: string) => Promise<void>;
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
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
}: RemoteFilePanelProps) {
  // Ensure currentPath is never undefined
  const safePath = currentPath || '/';
  const hasParent = safePath !== '/' && safePath !== '';

  const handleFileClick = async (file: FileEntry) => {
    if (file.isDir) {
      await onChangeDirectory(file.path);
    }
    // Single-click on files - no action yet (download/edit in future phases)
  };

  const handleParentClick = async () => {
    const parentPath = getParentPath(safePath);
    await onChangeDirectory(parentPath);
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
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>이름</TableHead>
                <TableHead className="w-[140px]">수정일</TableHead>
                <TableHead className="w-[100px]">크기</TableHead>
                <TableHead className="w-[80px]">권한</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Parent directory */}
              {hasParent && (
                <TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={handleParentClick}
                >
                  <TableCell>
                    <ArrowUp className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-medium">..</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}

              {/* Files and directories */}
              {fileList.length === 0 && !hasParent ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    디렉토리가 비어있습니다
                  </TableCell>
                </TableRow>
              ) : (
                fileList.map((file) => (
                  <TableRow
                    key={file.path}
                    className={file.isDir ? 'cursor-pointer hover:bg-muted/50' : ''}
                    onClick={() => handleFileClick(file)}
                  >
                    <TableCell>
                      {file.isDir ? (
                        <Folder className="h-4 w-4 text-blue-500" />
                      ) : (
                        <File className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className={file.isDir ? 'font-medium' : ''}>
                      {file.name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(file.modified)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {file.isDir ? '' : formatFileSize(file.size)}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {file.permissions}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Status bar */}
      {!isLoading && (
        <div className="border-t px-4 py-2 bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {fileList.length}개 항목 ({fileList.filter((f) => f.isDir).length}개 폴더,{' '}
              {fileList.filter((f) => !f.isDir).length}개 파일)
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
