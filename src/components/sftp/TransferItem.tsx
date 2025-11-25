import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  ArrowUp,
  ArrowDown,
  Pause,
  Play,
  X,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { formatFileSize, formatTransferSpeed } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { TransferItem as TransferItemType } from '@/types/sftp';

/**
 * Props for TransferItem component
 */
interface TransferItemProps {
  /** Transfer item data */
  item: TransferItemType;

  /** Callback when pause button is clicked */
  onPause?: (transferId: string) => void;

  /** Callback when resume button is clicked */
  onResume?: (transferId: string) => void;

  /** Callback when cancel button is clicked */
  onCancel?: (transferId: string) => void;
}

/**
 * TransferItem Component
 *
 * Displays a single file transfer item with:
 * - Direction icon (upload/download)
 * - File name and size
 * - Progress bar with percentage
 * - Transfer speed
 * - Control buttons (pause/resume/cancel)
 * - Status-based visual feedback
 */
export function TransferItem({
  item,
  onPause,
  onResume,
  onCancel,
}: TransferItemProps) {
  /**
   * Get direction icon based on transfer direction
   */
  const DirectionIcon = item.direction === 'upload' ? ArrowUp : ArrowDown;

  /**
   * Get status icon based on transfer status
   */
  const StatusIcon = {
    pending: Clock,
    transferring: DirectionIcon,
    completed: CheckCircle,
    failed: XCircle,
    cancelled: XCircle,
  }[item.status];

  /**
   * Get icon color based on transfer status
   */
  const iconColorClass = {
    pending: 'text-muted-foreground',
    transferring: 'text-blue-500',
    completed: 'text-green-500',
    failed: 'text-red-500',
    cancelled: 'text-muted-foreground',
  }[item.status];

  /**
   * Get progress bar color based on transfer status
   */
  const progressColorClass = {
    pending: 'bg-muted-foreground',
    transferring: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    cancelled: 'bg-muted-foreground',
  }[item.status];

  /**
   * Check if buttons should be disabled
   */
  const isDisabled = item.status === 'pending' || item.status === 'completed';

  /**
   * Check if transfer is active (can be paused)
   */
  const isTransferring = item.status === 'transferring';

  /**
   * Check if transfer is paused (can be resumed)
   * Note: 'paused' status is not in the current type definition,
   * but we'll handle it for future extensibility
   */
  const isPaused = false; // TODO: Add 'paused' status to TransferStatus type

  /**
   * Check if transfer is finished (completed, failed, or cancelled)
   */
  const isFinished =
    item.status === 'completed' ||
    item.status === 'failed' ||
    item.status === 'cancelled';

  return (
    <div className="flex flex-col gap-1.5 p-2 border rounded bg-card">
      {/* Header Row: Icon + Filename + Buttons */}
      <div className="flex justify-between items-center">
        {/* Left Section: Direction Badge + Icon + Filename + Size */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Direction Badge */}
          <div
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 leading-none',
              item.direction === 'upload'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'bg-green-500/10 text-green-600 dark:text-green-400'
            )}
          >
            {item.direction === 'upload' ? '↑' : '↓'}
          </div>

          <StatusIcon className={cn('h-3.5 w-3.5 flex-shrink-0', iconColorClass)} />
          <span className="text-xs font-medium truncate">
            {item.fileName}
            <span className="text-[10px] text-muted-foreground ml-1">
              ({formatFileSize(item.fileSize)})
            </span>
          </span>
        </div>

        {/* Right Section: Control Buttons */}
        {!isFinished && (
          <div className="flex gap-0.5 flex-shrink-0">
            {/* Pause Button (only when transferring) */}
            {isTransferring && onPause && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onPause(item.id)}
                disabled={isDisabled}
                aria-label="Pause transfer"
                className="h-6 w-6"
              >
                <Pause className="h-3 w-3" />
              </Button>
            )}

            {/* Resume Button (only when paused) */}
            {isPaused && onResume && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onResume(item.id)}
                aria-label="Resume transfer"
                className="h-6 w-6"
              >
                <Play className="h-3 w-3" />
              </Button>
            )}

            {/* Cancel Button */}
            {onCancel && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onCancel(item.id)}
                disabled={isDisabled}
                aria-label="Cancel transfer"
                className="h-6 w-6"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Progress Row: Progress Bar + Percentage + Speed */}
      <div className="flex items-center gap-2">
        {/* Progress Bar */}
        <div className="flex-1">
          <Progress
            value={item.progress.percentage}
            className="h-1.5"
            indicatorClassName={progressColorClass}
            aria-label={`Transfer progress: ${item.progress.percentage}%`}
          />
        </div>

        {/* Percentage */}
        <div className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
          {item.progress.percentage}%
        </div>

        {/* Speed (only when transferring and speed is available) */}
        {item.status === 'transferring' && item.progress.speed !== undefined && (
          <div className="text-[10px] text-muted-foreground w-16 text-right tabular-nums">
            {formatTransferSpeed(item.progress.speed)}
          </div>
        )}
      </div>

      {/* Error Message (only when failed) */}
      {item.status === 'failed' && item.error && (
        <div className="text-[10px] text-destructive flex items-center gap-1">
          <XCircle className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{item.error}</span>
        </div>
      )}

      {/* Status Text (for completed, cancelled) */}
      {item.status === 'completed' && (
        <div className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
          <CheckCircle className="h-3 w-3 flex-shrink-0" />
          <span>Completed</span>
        </div>
      )}

      {item.status === 'cancelled' && (
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <XCircle className="h-3 w-3 flex-shrink-0" />
          <span>Cancelled</span>
        </div>
      )}

      {item.status === 'pending' && (
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span>Waiting...</span>
        </div>
      )}
    </div>
  );
}
