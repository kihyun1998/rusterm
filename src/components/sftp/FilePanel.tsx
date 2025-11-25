import { useDroppable } from '@dnd-kit/core';
import { Loader2 } from 'lucide-react';
import { FileList } from './FileList';
import { PanelToolbar } from './PanelToolbar';
import { PathDisplay } from './PathDisplay';
import { cn } from '@/lib/utils';
import type { FileInfo, FileSystemType } from '@/types/sftp';

/**
 * Props for FilePanel component
 */
interface FilePanelProps {
  /** 세션 ID (로컬/원격 세션 구분) */
  sessionId: string;

  /** 패널 타입 ('local' | 'remote') */
  type: FileSystemType;

  /** 패널 제목 (선택 사항, 예: "Local", "Remote") */
  title?: string;

  /** 현재 디렉토리 경로 */
  currentPath: string;

  /** 표시할 파일/폴더 목록 */
  files: FileInfo[];

  /** 선택된 파일들의 경로 Set */
  selectedFiles: Set<string>;

  /** 로딩 상태 */
  loading: boolean;

  /** 경로 변경 시 콜백 (폴더 더블 클릭) */
  onNavigate: (path: string) => void;

  /** 상위 디렉토리로 이동 콜백 */
  onNavigateUp: () => void;

  /** 파일 선택 시 콜백 */
  onSelectFile: (file: FileInfo) => void;

  /** 파일/폴더 열기 시 콜백 */
  onOpenFile: (file: FileInfo) => void;

  /** Refresh 버튼 클릭 시 콜백 */
  onRefresh: () => void;

  /** New Folder 버튼 클릭 시 콜백 */
  onNewFolder: () => void;

  /** Delete 버튼 클릭 시 콜백 */
  onDelete: () => void;

  /** Rename 버튼 클릭 시 콜백 */
  onRename: () => void;

  /** Transfer 버튼 클릭 시 콜백 */
  onTransfer: () => void;

  /** OS 파일 드롭 시 콜백 (선택 사항, Remote 패널만) */
  onFileDrop?: (files: File[]) => void;
}

/**
 * FilePanel Component
 *
 * Complete file browser panel with:
 * - PathDisplay: Shows current directory path with home button
 * - PanelToolbar: Action buttons (refresh, new folder, delete, rename, transfer)
 * - FileList: File/folder list with selection and drag-drop
 * - Drop zone: Accepts files from other panel (@dnd-kit) or OS file explorer (native)
 * - Loading state: Shows loading overlay when fetching files
 *
 * Usage:
 * - Wrap with DndContext for drag-drop between panels
 * - Local panel: Displays local file system
 * - Remote panel: Displays remote file system via SFTP
 */
export function FilePanel({
  sessionId,
  type,
  title,
  currentPath,
  files,
  selectedFiles,
  loading,
  onNavigate,
  onNavigateUp,
  onSelectFile,
  onOpenFile,
  onRefresh,
  onNewFolder,
  onDelete,
  onRename,
  onTransfer,
  onFileDrop,
}: FilePanelProps) {
  // Setup drop zone for @dnd-kit drag-drop
  const { setNodeRef, isOver } = useDroppable({
    id: `${type}-panel`,
    data: { type },
  });

  /**
   * Handle native file drop from OS file explorer
   * Only accepts drops on remote panel for upload
   */
  const handleNativeDrop = (e: React.DragEvent) => {
    e.preventDefault();

    // Only handle OS file drops on remote panel
    if (type === 'remote' && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);

      if (onFileDrop) {
        onFileDrop(droppedFiles);
      }
    }
  };

  /**
   * Prevent default drag over behavior to enable drop
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      ref={setNodeRef}
      onDrop={handleNativeDrop}
      onDragOver={handleDragOver}
      className={cn(
        'flex flex-col h-full relative border rounded transition-colors',
        isOver && 'border-2 border-primary bg-accent/50'
      )}
    >
      {/* 제목 (선택 사항) */}
      {title && (
        <div className="px-2 py-1 font-medium text-sm border-b bg-muted/50">
          {title}
        </div>
      )}

      {/* PathDisplay */}
      <div className="px-2 py-2 border-b">
        <PathDisplay path={currentPath} onHome={onNavigateUp} />
      </div>

      {/* PanelToolbar */}
      <PanelToolbar
        selectedCount={selectedFiles.size}
        onRefresh={onRefresh}
        onNewFolder={onNewFolder}
        onDelete={onDelete}
        onRename={onRename}
        onTransfer={onTransfer}
      />

      {/* FileList */}
      <div className="flex-1 overflow-hidden">
        <FileList
          currentPath={currentPath}
          files={files}
          selectedFiles={selectedFiles}
          fsType={type}
          onSelectFile={onSelectFile}
          onOpenFile={onOpenFile}
          onNavigateUp={onNavigateUp}
        />
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm text-muted-foreground">로딩 중...</span>
          </div>
        </div>
      )}
    </div>
  );
}
