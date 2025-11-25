import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronUp, ChevronDown, X, Pause, Trash2 } from 'lucide-react';
import { TransferItem as TransferItemComponent } from './TransferItem';
import type { TransferItem } from '@/types/sftp';

/**
 * Props for TransferPanel component
 */
interface TransferPanelProps {
  /** 전송 큐 (스토어에서 가져온 transferQueue) */
  transfers: TransferItem[];

  /** 일시정지 핸들러 */
  onPause?: (transferId: string) => void;

  /** 재개 핸들러 */
  onResume?: (transferId: string) => void;

  /** 취소 핸들러 */
  onCancel?: (transferId: string) => void;

  /** 완료된 항목 삭제 핸들러 */
  onClearCompleted?: () => void;

  /** 전체 일시정지 핸들러 */
  onPauseAll?: () => void;

  /** 전체 재개 핸들러 */
  onResumeAll?: () => void;

  /** 전체 취소 핸들러 */
  onCancelAll?: () => void;
}

/**
 * TransferPanel Component
 *
 * 접이식 파일 전송 패널 컴포넌트
 * Features:
 * - Collapsible panel (하단 고정)
 * - 전송 큐 목록 표시 (TransferItem 사용)
 * - 전송 통계 표시 (active, completed, failed)
 * - 전체 일시정지/재개/취소 버튼
 * - 완료된 항목 삭제 버튼
 * - 최대 높이 300px, 스크롤 가능
 */
export function TransferPanel({
  transfers,
  onPause,
  onResume,
  onCancel,
  onClearCompleted,
  onPauseAll,
  onCancelAll,
}: TransferPanelProps) {
  // 접이식 상태 관리 (전송 항목이 있으면 열림, 없으면 접힘)
  const [isOpen, setIsOpen] = useState(transfers.length > 0);

  // 전송 통계 계산
  const stats = {
    active: transfers.filter((t) => t.status === 'transferring').length,
    completed: transfers.filter((t) => t.status === 'completed').length,
    failed: transfers.filter((t) => t.status === 'failed').length,
    pending: transfers.filter((t) => t.status === 'pending').length,
    total: transfers.length,
  };

  // 전송 항목이 추가되면 자동으로 패널 열기
  useEffect(() => {
    if (transfers.length > 0) {
      setIsOpen(true);
    }
  }, [transfers.length]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border-t">
      {/* Header */}
      <div
        className={`flex items-center justify-between px-3 bg-muted/30 transition-all ${
          isOpen ? 'py-1.5' : 'py-1'
        }`}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 hover:bg-muted h-7"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
            <span className="font-semibold">
              Transfers
              {stats.total === 0 ? (
                <span className="text-muted-foreground ml-1 font-normal">
                  (No transfers)
                </span>
              ) : (
                <>
                  {stats.active > 0 && (
                    <span className="text-blue-500 ml-1">({stats.active} active)</span>
                  )}
                  {stats.completed > 0 && (
                    <span className="text-muted-foreground ml-1">
                      {stats.completed} completed
                    </span>
                  )}
                  {stats.failed > 0 && (
                    <span className="text-destructive ml-1">{stats.failed} failed</span>
                  )}
                </>
              )}
            </span>
          </Button>
        </CollapsibleTrigger>

        {/* Action Buttons - 펼쳐져 있을 때만 표시 */}
        {isOpen && <div className="flex gap-1">
          {/* Clear Completed Button */}
          {(stats.completed > 0 || stats.failed > 0) && onClearCompleted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearCompleted}
              className="gap-1 h-7 px-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Clear</span>
            </Button>
          )}

          {/* Pause All Button */}
          {stats.active > 0 && onPauseAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPauseAll}
              className="gap-1 h-7 px-2"
            >
              <Pause className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Pause All</span>
            </Button>
          )}

          {/* Cancel All Button */}
          {(stats.active > 0 || stats.pending > 0) && onCancelAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelAll}
              className="gap-1 h-7 px-2"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Cancel All</span>
            </Button>
          )}
        </div>}
      </div>

      {/* Content */}
      <CollapsibleContent>
        <div className="border-t">
          {transfers.length === 0 ? (
            /* 빈 상태 메시지 */
            <div className="flex items-center justify-center h-[120px] text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">전송 항목이 없습니다</p>
                <p className="text-xs mt-1">
                  파일을 드래그 앤 드롭하여 전송을 시작하세요
                </p>
              </div>
            </div>
          ) : (
            /* 전송 항목 목록 */
            <ScrollArea className="h-[300px]">
              <div className="flex flex-col gap-1.5 p-2">
                {transfers.map((transfer) => (
                  <TransferItemComponent
                    key={transfer.id}
                    item={transfer}
                    onPause={onPause}
                    onResume={onResume}
                    onCancel={onCancel}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
