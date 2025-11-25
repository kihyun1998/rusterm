import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTabStore } from '@/stores';

/**
 * Props for ErrorScreen component
 */
interface ErrorScreenProps {
  /** 탭 ID (탭 닫기 시 필요) */
  tabId: string;
  /** 에러 메시지 */
  error: string | null;
}

/**
 * ErrorScreen Component
 *
 * Displays error message when SFTP connection fails
 * Provides close tab option
 */
export function ErrorScreen({ tabId, error }: ErrorScreenProps) {
  const closeTab = useTabStore((state) => state.closeTab);

  const handleCloseTab = () => {
    closeTab(tabId);
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div>
          <h3 className="text-lg font-semibold mb-2">연결 실패</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error || 'SFTP 서버에 연결할 수 없습니다.'}
          </p>
        </div>
        <Button onClick={handleCloseTab} variant="outline">
          탭 닫기
        </Button>
      </div>
    </div>
  );
}
