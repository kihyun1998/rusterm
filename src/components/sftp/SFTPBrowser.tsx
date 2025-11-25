import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  useSftpConnection,
  useSftpFileList,
  useSftpFileOperations,
  useSftpTransfer,
} from '@/hooks/use-sftp';
import { useSftpStore } from '@/stores/use-sftp-store';
import type { SFTPConfig } from '@/types/connection';
import type { FileInfo, FileSystemType } from '@/types/sftp';
import { ErrorScreen } from './ErrorScreen';
import { FilePanel } from './FilePanel';
import { LoadingScreen } from './LoadingScreen';
import { NewFolderDialog } from './NewFolderDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { RenameDialog } from './RenameDialog';

/**
 * Props for SFTPBrowser component
 */
interface SFTPBrowserProps {
  /** 탭 ID (스토어 세션 구분용) */
  tabId: string;
  /** SFTP 연결 프로필 ID (키링에서 인증 정보 복원) */
  connectionProfileId: string;
}

/**
 * SFTPBrowser Component
 *
 * Main component for SFTP file browser with dual panels (Local | Remote)
 * Features:
 * - SFTP connection management
 * - Dual panel layout with drag-drop support
 * - File operations (create, delete, rename, transfer)
 * - Loading and error states
 */
export function SFTPBrowser({ tabId, connectionProfileId }: SFTPBrowserProps) {
  const [resolvedConfig, setResolvedConfig] = useState<SFTPConfig | null>(null);
  const [isResolvingCredentials, setIsResolvingCredentials] = useState(true);

  // 1. 연결 관리
  const { sessionId, status, error, connect, disconnect } = useSftpConnection({
    tabId,
  });

  // 2. 키링에서 인증 정보 복원
  useEffect(() => {
    const resolveCredentials = async () => {
      try {
        const { useConnectionProfileStore } = await import('@/stores/use-connection-profile-store');
        const { isSFTPConfig } = await import('@/types/connection');
        const { getCredential } = await import('@/lib/keyring');

        const profile = useConnectionProfileStore.getState().getProfileById(connectionProfileId);

        if (!profile) {
          console.error('SFTP Profile not found:', connectionProfileId);
          setIsResolvingCredentials(false);
          return;
        }

        if (profile.type !== 'sftp' || !isSFTPConfig(profile.config)) {
          console.error('Invalid SFTP profile:', connectionProfileId);
          setIsResolvingCredentials(false);
          return;
        }

        // 키링에서 인증 정보 복원
        let password: string | undefined;
        let privateKey: string | undefined;
        let passphrase: string | undefined;

        try {
          if (profile.savedAuthType === 'password') {
            password = await getCredential(connectionProfileId, 'sftp', 'password');
          } else if (
            profile.savedAuthType === 'privateKey' ||
            profile.savedAuthType === 'passphrase'
          ) {
            privateKey = await getCredential(connectionProfileId, 'sftp', 'privatekey');
            if (profile.savedAuthType === 'passphrase') {
              passphrase = await getCredential(connectionProfileId, 'sftp', 'passphrase');
            }
          }
        } catch (error) {
          console.error('Failed to restore credentials from keyring:', error);
        }

        // SFTP 설정 구성
        const config: SFTPConfig = {
          host: profile.config.host,
          port: profile.config.port,
          username: profile.config.username,
          password,
          privateKey,
          passphrase,
        };

        setResolvedConfig(config);
        setIsResolvingCredentials(false);
      } catch (error) {
        console.error('Failed to resolve SFTP credentials:', error);
        setIsResolvingCredentials(false);
      }
    };

    resolveCredentials();
  }, [connectionProfileId]);

  // 3. 인증 정보 복원 후 연결
  useEffect(() => {
    if (!isResolvingCredentials && resolvedConfig) {
      connect(resolvedConfig);

      return () => {
        disconnect(); // 컴포넌트 언마운트 시 연결 종료
      };
    }
  }, [isResolvingCredentials, resolvedConfig]);

  // 4. 연결 상태에 따른 렌더링
  if (isResolvingCredentials || status === 'connecting') {
    return <LoadingScreen />;
  }

  if (status === 'failed' || status === 'error') {
    return <ErrorScreen tabId={tabId} error={error} />;
  }

  if (status !== 'connected' || !sessionId) {
    return <LoadingScreen />;
  }

  // 연결 성공 시 메인 브라우저 렌더링
  return <ConnectedSFTPBrowser tabId={tabId} sessionId={sessionId} />;
}

/**
 * ConnectedSFTPBrowser Component
 *
 * Renders the main SFTP browser UI after successful connection
 */
interface ConnectedSFTPBrowserProps {
  tabId: string;
  sessionId: string;
}

function ConnectedSFTPBrowser({ tabId, sessionId }: ConnectedSFTPBrowserProps) {
  // 다이얼로그 상태
  const [localNewFolderDialogOpen, setLocalNewFolderDialogOpen] = useState(false);
  const [remoteNewFolderDialogOpen, setRemoteNewFolderDialogOpen] = useState(false);
  const [localDeleteDialogOpen, setLocalDeleteDialogOpen] = useState(false);
  const [remoteDeleteDialogOpen, setRemoteDeleteDialogOpen] = useState(false);
  const [localRenameDialogOpen, setLocalRenameDialogOpen] = useState(false);
  const [remoteRenameDialogOpen, setRemoteRenameDialogOpen] = useState(false);
  const [selectedFileForRename, setSelectedFileForRename] = useState<FileInfo | null>(null);

  // 스토어에서 세션 및 패널 상태 가져오기
  const session = useSftpStore((state) => state.getSession(tabId));

  // 파일 목록 훅
  const localFileList = useSftpFileList({
    tabId,
    sessionId,
    panelType: 'local',
  });

  const remoteFileList = useSftpFileList({
    tabId,
    sessionId,
    panelType: 'remote',
  });

  // 파일 작업 훅
  const localOps = useSftpFileOperations({
    tabId,
    sessionId,
    panelType: 'local',
    onSuccess: () => localFileList.refresh(),
  });

  const remoteOps = useSftpFileOperations({
    tabId,
    sessionId,
    panelType: 'remote',
    onSuccess: () => remoteFileList.refresh(),
  });

  // 전송 훅
  const transfer = useSftpTransfer({ tabId, sessionId });

  // 파일 선택 관리
  const toggleLocalFileSelection = useSftpStore((state) => state.toggleLocalFileSelection);
  const toggleRemoteFileSelection = useSftpStore((state) => state.toggleRemoteFileSelection);

  // 초기 디렉토리 로드
  useEffect(() => {
    if (session?.localPanel.currentPath) {
      localFileList.loadDirectory(session.localPanel.currentPath);
    }
  }, [session?.localPanel.currentPath]);

  useEffect(() => {
    if (session?.remotePanel.currentPath) {
      remoteFileList.loadDirectory(session.remotePanel.currentPath);
    }
  }, [session?.remotePanel.currentPath]);

  // 드래그 앤 드롭 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작
      },
    })
  );

  // 드래그 앤 드롭 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dragData = active.data.current as {
      file: FileInfo;
      fsType: FileSystemType;
    };
    const dropData = over.data.current as {
      type: FileSystemType;
    };

    // 반대편 패널으로 드래그 시에만 전송
    if (dragData.fsType !== dropData.type) {
      if (dragData.fsType === 'local') {
        // 업로드: Local → Remote
        const remotePath = session?.remotePanel.currentPath || '/';
        const destinationPath = `${remotePath}${remotePath.endsWith('/') ? '' : '/'}${dragData.file.name}`;

        await transfer.upload(
          dragData.file.path,
          destinationPath,
          dragData.file.name,
          dragData.file.size
        );

        // 전송 완료 후 원격 패널 새로고침
        await remoteFileList.refresh();
      } else {
        // 다운로드: Remote → Local
        const localPath = session?.localPanel.currentPath || '/';
        const localSeparator = localPath.includes('\\') ? '\\' : '/';
        const destinationPath = `${localPath}${localPath.endsWith(localSeparator) ? '' : localSeparator}${dragData.file.name}`;

        await transfer.download(
          dragData.file.path,
          destinationPath,
          dragData.file.name,
          dragData.file.size
        );

        // 전송 완료 후 로컬 패널 새로고침
        await localFileList.refresh();
      }
    }
  };

  // 파일 선택 핸들러
  const handleLocalFileSelect = (file: FileInfo, multiSelect: boolean) => {
    toggleLocalFileSelection(tabId, file.path, multiSelect);
  };

  const handleRemoteFileSelect = (file: FileInfo, multiSelect: boolean) => {
    toggleRemoteFileSelection(tabId, file.path, multiSelect);
  };

  // 파일 열기 핸들러 (폴더 더블 클릭)
  const handleLocalFileOpen = (file: FileInfo) => {
    if (file.isDirectory) {
      localFileList.loadDirectory(file.path);
    }
  };

  const handleRemoteFileOpen = (file: FileInfo) => {
    if (file.isDirectory) {
      remoteFileList.loadDirectory(file.path);
    }
  };

  // 파일 작업 핸들러
  /**
   * 로컬 패널에서 새 폴더 생성
   */
  const handleLocalNewFolder = () => {
    setLocalNewFolderDialogOpen(true);
  };

  /**
   * 로컬 패널에서 새 폴더 생성 확인
   */
  const handleLocalNewFolderConfirm = async (folderName: string) => {
    try {
      const currentPath = session?.localPanel.currentPath || '';
      await localOps.createDirectory(currentPath, folderName);
      toast.success('폴더가 생성되었습니다', {
        description: folderName,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error('폴더 생성 실패', {
        description: errorMessage,
      });
      throw error;
    }
  };

  /**
   * 원격 패널에서 새 폴더 생성
   */
  const handleRemoteNewFolder = () => {
    setRemoteNewFolderDialogOpen(true);
  };

  /**
   * 원격 패널에서 새 폴더 생성 확인
   */
  const handleRemoteNewFolderConfirm = async (folderName: string) => {
    try {
      const currentPath = session?.remotePanel.currentPath || '';
      await remoteOps.createDirectory(currentPath, folderName);
      toast.success('폴더가 생성되었습니다', {
        description: folderName,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error('폴더 생성 실패', {
        description: errorMessage,
      });
      throw error;
    }
  };

  /**
   * 선택된 파일 목록을 FileInfo 배열로 반환
   */
  const getSelectedFiles = (panelType: 'local' | 'remote'): FileInfo[] => {
    const selectedPaths =
      panelType === 'local'
        ? useSftpStore.getState().getLocalSelectedFiles(tabId)
        : useSftpStore.getState().getRemoteSelectedFiles(tabId);

    const files =
      panelType === 'local'
        ? session?.localPanel.files || []
        : session?.remotePanel.files || [];

    return files.filter((file) => selectedPaths.includes(file.path));
  };

  /**
   * 로컬 패널에서 파일/폴더 삭제
   */
  const handleLocalDelete = () => {
    const selectedPaths = useSftpStore.getState().getLocalSelectedFiles(tabId);
    if (selectedPaths.length === 0) return;

    setLocalDeleteDialogOpen(true);
  };

  /**
   * 로컬 패널에서 삭제 확인
   */
  const handleLocalDeleteConfirm = async () => {
    try {
      const selectedFiles = getSelectedFiles('local');

      let successCount = 0;
      const failedItems: string[] = [];

      // 각 파일/폴더 삭제
      for (const file of selectedFiles) {
        try {
          if (file.isDirectory) {
            await localOps.deleteDirectory(file.path);
          } else {
            await localOps.deleteFile(file.path);
          }
          successCount++;
        } catch (error) {
          failedItems.push(file.name);
          console.error(`Failed to delete ${file.name}:`, error);
        }
      }

      // 선택 해제
      useSftpStore.getState().clearLocalSelection(tabId);
      setLocalDeleteDialogOpen(false);

      // 결과 Toast
      if (successCount > 0) {
        toast.success(`${successCount}개 항목이 삭제되었습니다`);
      }

      if (failedItems.length > 0) {
        toast.error(`${failedItems.length}개 항목 삭제 실패`, {
          description:
            failedItems.slice(0, 3).join(', ') +
            (failedItems.length > 3 ? ` 외 ${failedItems.length - 3}개` : ''),
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error('삭제 실패', {
        description: errorMessage,
      });
      throw error;
    }
  };

  /**
   * 원격 패널에서 파일/폴더 삭제
   */
  const handleRemoteDelete = () => {
    const selectedPaths = useSftpStore.getState().getRemoteSelectedFiles(tabId);
    if (selectedPaths.length === 0) return;

    setRemoteDeleteDialogOpen(true);
  };

  /**
   * 원격 패널에서 삭제 확인
   */
  const handleRemoteDeleteConfirm = async () => {
    try {
      const selectedFiles = getSelectedFiles('remote');

      let successCount = 0;
      const failedItems: string[] = [];

      for (const file of selectedFiles) {
        try {
          if (file.isDirectory) {
            await remoteOps.deleteDirectory(file.path);
          } else {
            await remoteOps.deleteFile(file.path);
          }
          successCount++;
        } catch (error) {
          failedItems.push(file.name);
          console.error(`Failed to delete ${file.name}:`, error);
        }
      }

      useSftpStore.getState().clearRemoteSelection(tabId);
      setRemoteDeleteDialogOpen(false);

      if (successCount > 0) {
        toast.success(`${successCount}개 항목이 삭제되었습니다`);
      }

      if (failedItems.length > 0) {
        toast.error(`${failedItems.length}개 항목 삭제 실패`, {
          description:
            failedItems.slice(0, 3).join(', ') +
            (failedItems.length > 3 ? ` 외 ${failedItems.length - 3}개` : ''),
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error('삭제 실패', {
        description: errorMessage,
      });
      throw error;
    }
  };

  /**
   * 로컬 패널에서 파일/폴더 이름 변경
   */
  const handleLocalRename = () => {
    const selectedPaths = useSftpStore.getState().getLocalSelectedFiles(tabId);

    // 정확히 1개 선택되어 있어야 함 (PanelToolbar에서 이미 검증)
    if (selectedPaths.length !== 1) return;

    const selectedFiles = getSelectedFiles('local');
    const fileToRename = selectedFiles[0];

    setSelectedFileForRename(fileToRename);
    setLocalRenameDialogOpen(true);
  };

  /**
   * 로컬 패널에서 이름 변경 확인
   */
  const handleLocalRenameConfirm = async (newName: string) => {
    if (!selectedFileForRename || !session) return;

    try {
      const currentPath = session.localPanel.currentPath;
      const separator = currentPath.includes('\\') ? '\\' : '/';

      // 기존 경로
      const oldPath = selectedFileForRename.path;

      // 새 경로 계산 (같은 디렉토리 내에서 이름만 변경)
      const parentPath = oldPath.substring(0, oldPath.lastIndexOf(separator));
      const newPath = `${parentPath}${separator}${newName}`;

      await localOps.renameItem(oldPath, newPath);

      // 성공 Toast
      toast.success('이름이 변경되었습니다', {
        description: `${selectedFileForRename.name} → ${newName}`,
      });

      // 선택 해제 및 상태 초기화
      useSftpStore.getState().clearLocalSelection(tabId);
      setSelectedFileForRename(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error('이름 변경 실패', {
        description: errorMessage,
      });
      throw error;
    }
  };

  /**
   * 원격 패널에서 파일/폴더 이름 변경
   */
  const handleRemoteRename = () => {
    const selectedPaths = useSftpStore.getState().getRemoteSelectedFiles(tabId);

    if (selectedPaths.length !== 1) return;

    const selectedFiles = getSelectedFiles('remote');
    const fileToRename = selectedFiles[0];

    setSelectedFileForRename(fileToRename);
    setRemoteRenameDialogOpen(true);
  };

  /**
   * 원격 패널에서 이름 변경 확인
   */
  const handleRemoteRenameConfirm = async (newName: string) => {
    if (!selectedFileForRename || !session) return;

    try {
      const currentPath = session.remotePanel.currentPath;
      const separator = '/'; // Remote는 항상 Unix 스타일

      const oldPath = selectedFileForRename.path;
      const parentPath = oldPath.substring(0, oldPath.lastIndexOf(separator));
      const newPath = `${parentPath}${separator}${newName}`;

      await remoteOps.renameItem(oldPath, newPath);

      toast.success('이름이 변경되었습니다', {
        description: `${selectedFileForRename.name} → ${newName}`,
      });

      useSftpStore.getState().clearRemoteSelection(tabId);
      setSelectedFileForRename(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error('이름 변경 실패', {
        description: errorMessage,
      });
      throw error;
    }
  };

  const handleLocalTransfer = () => {
    // TODO: 선택된 파일 업로드
    console.log('Local: Transfer (Upload)');
  };

  const handleRemoteTransfer = () => {
    // TODO: 선택된 파일 다운로드
    console.log('Remote: Transfer (Download)');
  };

  if (!session) {
    return <LoadingScreen />;
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 grid-rows-[1fr] gap-2 h-full p-4 min-h-0">
          {/* Local Panel */}
          <FilePanel
            sessionId={sessionId}
            type="local"
            title="Local"
            currentPath={session.localPanel.currentPath}
            files={session.localPanel.files}
            selectedFiles={session.localPanel.selectedFiles}
            loading={session.localPanel.loading}
            onNavigate={localFileList.loadDirectory}
            onNavigateUp={localFileList.navigateUp}
            onNavigateHome={localFileList.navigateToHome}
            onNavigateWithDialog={localFileList.navigateWithDialog}
            onSelectFile={handleLocalFileSelect}
            onOpenFile={handleLocalFileOpen}
            onRefresh={localFileList.refresh}
            onNewFolder={handleLocalNewFolder}
            onDelete={handleLocalDelete}
            onRename={handleLocalRename}
            onTransfer={handleLocalTransfer}
          />

          {/* Remote Panel */}
          <FilePanel
            sessionId={sessionId}
            type="remote"
            title="Remote"
            currentPath={session.remotePanel.currentPath}
            files={session.remotePanel.files}
            selectedFiles={session.remotePanel.selectedFiles}
            loading={session.remotePanel.loading}
            onNavigate={remoteFileList.loadDirectory}
            onNavigateUp={remoteFileList.navigateUp}
            onNavigateHome={remoteFileList.navigateToHome}
            onNavigateWithDialog={remoteFileList.navigateWithDialog}
            onSelectFile={handleRemoteFileSelect}
            onOpenFile={handleRemoteFileOpen}
            onRefresh={remoteFileList.refresh}
            onNewFolder={handleRemoteNewFolder}
            onDelete={handleRemoteDelete}
            onRename={handleRemoteRename}
            onTransfer={handleRemoteTransfer}
          />
        </div>
      </DndContext>

      {/* New Folder Dialogs */}
      <NewFolderDialog
        open={localNewFolderDialogOpen}
        onOpenChange={setLocalNewFolderDialogOpen}
        onConfirm={handleLocalNewFolderConfirm}
        panelType="local"
      />

      <NewFolderDialog
        open={remoteNewFolderDialogOpen}
        onOpenChange={setRemoteNewFolderDialogOpen}
        onConfirm={handleRemoteNewFolderConfirm}
        panelType="remote"
      />

      {/* Delete Confirm Dialogs */}
      <DeleteConfirmDialog
        open={localDeleteDialogOpen}
        onOpenChange={setLocalDeleteDialogOpen}
        onConfirm={handleLocalDeleteConfirm}
        items={getSelectedFiles('local')}
        panelType="local"
      />

      <DeleteConfirmDialog
        open={remoteDeleteDialogOpen}
        onOpenChange={setRemoteDeleteDialogOpen}
        onConfirm={handleRemoteDeleteConfirm}
        items={getSelectedFiles('remote')}
        panelType="remote"
      />

      {/* Rename Dialogs */}
      <RenameDialog
        open={localRenameDialogOpen}
        onOpenChange={setLocalRenameDialogOpen}
        onConfirm={handleLocalRenameConfirm}
        currentName={selectedFileForRename?.name || ''}
        isDirectory={selectedFileForRename?.isDirectory || false}
        panelType="local"
      />

      <RenameDialog
        open={remoteRenameDialogOpen}
        onOpenChange={setRemoteRenameDialogOpen}
        onConfirm={handleRemoteRenameConfirm}
        currentName={selectedFileForRename?.name || ''}
        isDirectory={selectedFileForRename?.isDirectory || false}
        panelType="remote"
      />
    </>
  );
}
