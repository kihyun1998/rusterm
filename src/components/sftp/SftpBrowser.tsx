import { AlertCircle, Loader2, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DualPanelLayout } from './DualPanelLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSftp } from '@/hooks/use-sftp';
import type { SFTPConfig } from '@/types/connection';
import { isSFTPConfig } from '@/types/connection';
import { toBackendSftpConfig } from '@/types/sftp';

interface SftpBrowserProps {
  id: string; // Tab ID
  connectionProfileId: string; // Profile ID for credential restoration
}

/**
 * SftpBrowser component
 * Main SFTP tab component that handles credential restoration and file browsing
 */
export function SftpBrowser({ id, connectionProfileId }: SftpBrowserProps) {
  // Credential resolution state
  const [resolvedConfig, setResolvedConfig] = useState<SFTPConfig | null>(null);
  const [isResolvingCredentials, setIsResolvingCredentials] = useState(false);
  const [credentialError, setCredentialError] = useState<string | null>(null);

  // SFTP hook
  const sftp = useSftp({
    onConnectionChange: (status) => {
      console.log('[SftpBrowser] Connection status changed:', status);
    },
    onError: (error) => {
      console.error('[SftpBrowser] SFTP error:', error);
    },
  });

  // Resolve credentials from keyring
  useEffect(() => {
    const resolveCredentials = async () => {
      if (!connectionProfileId) {
        setCredentialError('No connection profile ID provided');
        setIsResolvingCredentials(false);
        return;
      }

      setIsResolvingCredentials(true);
      setCredentialError(null);

      try {
        const { useConnectionProfileStore } = await import('@/stores/use-connection-profile-store');
        const profile = useConnectionProfileStore.getState().getProfileById(connectionProfileId);

        if (!profile) {
          setCredentialError(`Profile not found: ${connectionProfileId}`);
          setResolvedConfig(null);
          setIsResolvingCredentials(false);
          return;
        }

        if (profile.type !== 'sftp') {
          setCredentialError(`Invalid profile type: ${profile.type} (expected sftp)`);
          setResolvedConfig(null);
          setIsResolvingCredentials(false);
          return;
        }

        if (!isSFTPConfig(profile.config)) {
          setCredentialError('Invalid SFTP configuration');
          setResolvedConfig(null);
          setIsResolvingCredentials(false);
          return;
        }

        let config: SFTPConfig = profile.config;

        // Restore credentials from keyring
        try {
          const { getCredential } = await import('@/lib/keyring');

          let password: string | null = null;
          let privateKey: string | null = null;
          let passphrase: string | null = null;

          // Restore only the credentials that were saved (based on savedAuthType)
          if (profile.savedAuthType === 'password') {
            password = await getCredential(connectionProfileId, 'sftp', 'password');
            console.log('[SftpBrowser] Restored password credential');
          } else if (profile.savedAuthType === 'privateKey') {
            privateKey = await getCredential(connectionProfileId, 'sftp', 'privatekey');
            console.log('[SftpBrowser] Restored privateKey credential');
          } else if (profile.savedAuthType === 'passphrase') {
            [privateKey, passphrase] = await Promise.all([
              getCredential(connectionProfileId, 'sftp', 'privatekey'),
              getCredential(connectionProfileId, 'sftp', 'passphrase'),
            ]);
            console.log('[SftpBrowser] Restored privateKey + passphrase credentials');
          } else {
            // interactive - no credentials to restore
            console.log('[SftpBrowser] Interactive auth - no credentials to restore');
          }

          config = {
            ...profile.config,
            password: password || undefined,
            privateKey: privateKey || undefined,
            passphrase: passphrase || undefined,
          };
        } catch (error) {
          console.error('[SftpBrowser] Failed to retrieve credentials from keyring:', error);
          setCredentialError('Failed to retrieve credentials from keyring');
          setResolvedConfig(null);
          setIsResolvingCredentials(false);
          return;
        }

        setResolvedConfig(config);
        console.log('[SftpBrowser] Credentials resolved successfully:', {
          host: config.host,
          username: config.username,
          hasPassword: !!config.password,
          hasPrivateKey: !!config.privateKey,
          hasPassphrase: !!config.passphrase,
        });
      } catch (error) {
        console.error('[SftpBrowser] Failed to resolve credentials:', error);
        setCredentialError(
          error instanceof Error ? error.message : 'Failed to resolve credentials'
        );
        setResolvedConfig(null);
      } finally {
        setIsResolvingCredentials(false);
      }
    };

    resolveCredentials();
  }, [connectionProfileId]);

  // Auto-connect when credentials are resolved
  useEffect(() => {
    if (isResolvingCredentials || !resolvedConfig || sftp.status !== 'disconnected') {
      return;
    }

    const connectToSftp = async () => {
      try {
        const backendConfig = toBackendSftpConfig(resolvedConfig);
        const sessionId = crypto.randomUUID();
        await sftp.connect(backendConfig, sessionId);
      } catch (error) {
        console.error('[SftpBrowser] Failed to connect:', error);
      }
    };

    connectToSftp();
  }, [isResolvingCredentials, resolvedConfig]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sftp.status === 'connected') {
        sftp.disconnect();
      }
    };
  }, []);

  // Render different states
  if (isResolvingCredentials) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Credential 복원 중...</p>
        </div>
      </div>
    );
  }

  if (credentialError) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Credential 오류</AlertTitle>
          <AlertDescription>{credentialError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (sftp.status === 'connecting') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {resolvedConfig?.host}에 연결 중...
          </p>
        </div>
      </div>
    );
  }

  if (sftp.status === 'failed') {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Alert variant="destructive" className="max-w-md">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>연결 실패</AlertTitle>
          <AlertDescription>
            {sftp.error || 'SFTP 서버에 연결할 수 없습니다.'}
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (resolvedConfig) {
                    const backendConfig = toBackendSftpConfig(resolvedConfig);
                    const sessionId = crypto.randomUUID();
                    sftp.connect(backendConfig, sessionId);
                  }
                }}
              >
                다시 시도
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (sftp.status === 'connected') {
    return (
      <div className="h-full flex flex-col">
        {/* Connection info header */}
        <div className="border-b px-4 py-2 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">
                {resolvedConfig?.username}@{resolvedConfig?.host}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={sftp.disconnect}>
              연결 해제
            </Button>
          </div>
        </div>

        {/* Dual panel layout (local + remote) */}
        <DualPanelLayout
          fileList={sftp.fileList}
          currentPath={sftp.currentPath}
          isLoading={sftp.isLoading}
          onChangeDirectory={sftp.changeDirectory}
          onCreateDirectory={sftp.createDirectory}
          onDeleteFile={sftp.deleteFile}
          onRenameFile={sftp.renameFile}
        />
      </div>
    );
  }

  // Default state (should not reach here)
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-muted-foreground">대기 중...</p>
    </div>
  );
}
