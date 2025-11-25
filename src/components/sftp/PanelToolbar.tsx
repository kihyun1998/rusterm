import {
  ArrowRightLeft,
  Edit,
  FolderPlus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Props for PanelToolbar component
 */
interface PanelToolbarProps {
  /** 선택된 파일/폴더 개수 */
  selectedCount: number;

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
}

/**
 * PanelToolbar Component
 *
 * Displays action buttons and selection status for file operations:
 * - Refresh: Reload file list
 * - New Folder: Create new directory
 * - Delete: Delete selected files (requires selection)
 * - Rename: Rename file (requires exactly 1 selection)
 * - Transfer: Transfer selected files (requires selection)
 * - Selection counter: Shows number of selected items
 */
export function PanelToolbar({
  selectedCount,
  onRefresh,
  onNewFolder,
  onDelete,
  onRename,
  onTransfer,
}: PanelToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-2 border-b bg-muted/30">
      {/* 좌측: 작업 버튼들 */}
      <div className="flex items-center gap-1">
        {/* Refresh - 항상 활성화 */}
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onRefresh}
          title="새로고침"
          aria-label="파일 목록 새로고침"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        {/* New Folder - 항상 활성화 */}
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onNewFolder}
          title="새 폴더"
          aria-label="새 폴더 만들기"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>

        {/* Delete - 선택 항목 있을 때만 */}
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onDelete}
          disabled={selectedCount === 0}
          title={selectedCount === 0 ? '삭제할 항목을 선택하세요' : '선택 항목 삭제'}
          aria-label="선택한 파일 삭제"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        {/* Rename - 1개 선택 시만 */}
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onRename}
          disabled={selectedCount !== 1}
          title={
            selectedCount === 0
              ? '이름을 변경할 항목을 선택하세요'
              : selectedCount > 1
                ? '한 번에 하나의 항목만 이름을 변경할 수 있습니다'
                : '이름 변경'
          }
          aria-label="파일 이름 변경"
        >
          <Edit className="h-4 w-4" />
        </Button>

        {/* Transfer - 선택 항목 있을 때만 */}
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onTransfer}
          disabled={selectedCount === 0}
          title={selectedCount === 0 ? '전송할 항목을 선택하세요' : '선택 항목 전송'}
          aria-label="선택한 파일 전송"
        >
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* 우측: 선택 항목 수 */}
      <div className="flex-1 text-right text-sm text-muted-foreground">
        {selectedCount > 0 && `${selectedCount}개 항목 선택됨`}
      </div>
    </div>
  );
}
