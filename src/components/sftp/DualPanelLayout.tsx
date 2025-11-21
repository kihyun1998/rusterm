import { LocalFilePanel } from './LocalFilePanel';
import { RemoteFilePanel } from './RemoteFilePanel';
import type { FileEntry } from '@/types/sftp';

interface DualPanelLayoutProps {
  // Remote panel props (from SFTP)
  fileList: FileEntry[];
  currentPath: string;
  isLoading: boolean;
  onChangeDirectory: (path: string) => Promise<void>;
  onCreateDirectory?: (path: string) => Promise<void>;
  onDeleteFile?: (path: string, isDir: boolean) => Promise<void>;
  onRenameFile?: (oldPath: string, newPath: string) => Promise<void>;
}

/**
 * DualPanelLayout component
 * Displays local files (left) and remote files (right) side-by-side
 */
export function DualPanelLayout({
  fileList,
  currentPath,
  isLoading,
  onChangeDirectory,
  onCreateDirectory,
  onDeleteFile,
  onRenameFile,
}: DualPanelLayoutProps) {
  return (
    <div className="flex h-full">
      {/* Left panel - Local files */}
      <div className="w-1/2 border-r">
        <LocalFilePanel />
      </div>

      {/* Right panel - Remote files */}
      <div className="w-1/2">
        <RemoteFilePanel
          fileList={fileList}
          currentPath={currentPath}
          isLoading={isLoading}
          onChangeDirectory={onChangeDirectory}
          onCreateDirectory={onCreateDirectory}
          onDeleteFile={onDeleteFile}
          onRenameFile={onRenameFile}
        />
      </div>
    </div>
  );
}
