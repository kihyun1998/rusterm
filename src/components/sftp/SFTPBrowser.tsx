import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { useSftpConnection, useSftpFileList, useSftpFileOperations, useSftpTransfer } from '@/hooks/use-sftp';
import { useSftpStore } from '@/stores/use-sftp-store';
import type { SFTPConfig } from '@/types/connection';
import type { FileInfo, FileSystemType } from '@/types/sftp';
import { ErrorScreen } from './ErrorScreen';
import { FilePanel } from './FilePanel';
import { LoadingScreen } from './LoadingScreen';

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
  const handleLocalFileSelect = (file: FileInfo) => {
    toggleLocalFileSelection(tabId, file.path, false);
  };

  const handleRemoteFileSelect = (file: FileInfo) => {
    toggleRemoteFileSelection(tabId, file.path, false);
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

  // TODO: 파일 작업 핸들러 (새 폴더, 삭제, 이름 변경 등)
  const handleLocalNewFolder = () => {
    // TODO: 다이얼로그로 폴더 이름 입력 받기
    console.log('Local: New Folder');
  };

  const handleRemoteNewFolder = () => {
    // TODO: 다이얼로그로 폴더 이름 입력 받기
    console.log('Remote: New Folder');
  };

  const handleLocalDelete = () => {
    // TODO: 선택된 파일 삭제
    console.log('Local: Delete');
  };

  const handleRemoteDelete = () => {
    // TODO: 선택된 파일 삭제
    console.log('Remote: Delete');
  };

  const handleLocalRename = () => {
    // TODO: 파일 이름 변경
    console.log('Local: Rename');
  };

  const handleRemoteRename = () => {
    // TODO: 파일 이름 변경
    console.log('Remote: Rename');
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
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 gap-2 h-full p-4">
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
  );
}
