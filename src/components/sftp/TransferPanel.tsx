import { Download, Upload, X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTransferStore } from '@/stores/use-transfer-store';
import type { FileTransfer } from '@/types/sftp';

/**
 * TransferPanel component
 * Displays file transfer queue with progress indicators
 */
export function TransferPanel() {
  const { transfers, removeTransfer, clearCompleted } = useTransferStore();

  if (transfers.length === 0) {
    return null; // Hide panel when no transfers
  }

  const activeCount = transfers.filter((t) => t.status === 'active' || t.status === 'pending').length;

  return (
    <div className="border-t bg-muted/20">
      {/* Header */}
      <div className="px-4 py-2 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">파일 전송</span>
          <span className="text-xs text-muted-foreground">
            ({activeCount}개 진행 중, {transfers.length}개 전체)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clearCompleted}>
            완료 항목 지우기
          </Button>
        </div>
      </div>

      {/* Transfer list */}
      <div className="max-h-[200px] overflow-auto">
        {transfers.map((transfer) => (
          <TransferItem
            key={transfer.id}
            transfer={transfer}
            onRemove={() => removeTransfer(transfer.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface TransferItemProps {
  transfer: FileTransfer;
  onRemove: () => void;
}

/**
 * TransferItem component
 * Displays individual file transfer with status and progress
 */
function TransferItem({ transfer, onRemove }: TransferItemProps) {
  const progress =
    transfer.size > 0 ? Math.round((transfer.transferred / transfer.size) * 100) : 0;

  const icon =
    transfer.type === 'upload' ? (
      <Upload className="h-4 w-4 text-blue-500" />
    ) : (
      <Download className="h-4 w-4 text-green-500" />
    );

  const statusIcon =
    transfer.status === 'completed' ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : transfer.status === 'failed' ? (
      <XCircle className="h-4 w-4 text-red-500" />
    ) : (
      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    );

  // Extract file names from paths
  const localFileName = transfer.localPath.split(/[/\\]/).pop() || transfer.localPath;
  const remoteFileName = transfer.remotePath.split('/').pop() || transfer.remotePath;

  return (
    <div className="px-4 py-3 border-b hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Transfer type icon */}
        <div className="mt-0.5">{icon}</div>

        {/* Transfer info */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* File names */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm truncate">
              {transfer.type === 'upload' ? (
                <>
                  <span className="font-medium">{localFileName}</span>
                  <span className="text-muted-foreground mx-1">→</span>
                  <span className="text-muted-foreground">{remoteFileName}</span>
                </>
              ) : (
                <>
                  <span className="font-medium">{remoteFileName}</span>
                  <span className="text-muted-foreground mx-1">→</span>
                  <span className="text-muted-foreground">{localFileName}</span>
                </>
              )}
            </div>

            {/* Status and remove button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {statusIcon}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onRemove}
                title="제거"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Progress bar (only for active transfers) */}
          {(transfer.status === 'active' || transfer.status === 'pending') && (
            <div className="space-y-1">
              <Progress value={progress} className="h-1" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {formatBytes(transfer.transferred)} / {formatBytes(transfer.size)}
                </span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          {/* Error message (for failed transfers) */}
          {transfer.status === 'failed' && transfer.error && (
            <p className="text-xs text-red-500">{transfer.error}</p>
          )}

          {/* Success message (for completed transfers) */}
          {transfer.status === 'completed' && (
            <p className="text-xs text-green-600">전송 완료</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
