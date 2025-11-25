import { Loader2 } from 'lucide-react';

/**
 * LoadingScreen Component
 *
 * Displays a loading indicator while SFTP connection is being established
 */
export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">SFTP 서버에 연결 중...</p>
      </div>
    </div>
  );
}
