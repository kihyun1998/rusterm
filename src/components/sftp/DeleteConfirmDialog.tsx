import { useState } from 'react';
import { File, Folder, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { FileInfo, FileSystemType } from '@/types/sftp';

/**
 * Props for DeleteConfirmDialog component
 */
interface DeleteConfirmDialogProps {
  /** 다이얼로그 열림/닫힘 상태 */
  open: boolean;

  /** 다이얼로그 상태 변경 콜백 */
  onOpenChange: (open: boolean) => void;

  /** 삭제 확인 콜백 */
  onConfirm: () => Promise<void>;

  /** 삭제할 파일/폴더 목록 */
  items: FileInfo[];

  /** 패널 타입 (로컬/원격) */
  panelType: FileSystemType;
}

/**
 * DeleteConfirmDialog Component
 *
 * AlertDialog for confirming file/folder deletion
 * Features:
 * - Shows list of items to delete (max 5, then "and N more")
 * - Warning message for folder deletion (recursive)
 * - Confirm/Cancel buttons
 * - Loading state during deletion
 *
 * Usage:
 * - Local panel: Deletes files/folders from local file system
 * - Remote panel: Deletes files/folders from remote SFTP server
 */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  items,
  panelType,
}: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  // 폴더가 포함되어 있는지 확인
  const hasDirectory = items.some((item) => item.isDirectory);

  // 파일과 폴더 개수
  const fileCount = items.filter((item) => !item.isDirectory).length;
  const folderCount = items.filter((item) => item.isDirectory).length;

  /**
   * 삭제 확인 처리
   */
  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } catch (error) {
      // 에러는 부모 컴포넌트에서 처리 (Toast)
      console.error('Failed to delete items:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const panelLabel = panelType === 'local' ? '로컬' : '원격';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {items.length}개 항목 삭제
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              {panelLabel} 파일 시스템에서 다음 항목을 삭제합니다.
            </p>
            {hasDirectory && (
              <p className="text-destructive font-medium">
                폴더와 하위 항목이 모두 삭제됩니다.
              </p>
            )}
            <p className="font-medium">
              이 작업은 되돌릴 수 없습니다.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* 삭제할 항목 목록 */}
        <div className="max-h-40 overflow-y-auto border rounded p-3 bg-muted/30">
          <ul className="space-y-2">
            {items.slice(0, 5).map((item) => (
              <li key={item.path} className="flex items-center gap-2 text-sm">
                {item.isDirectory ? (
                  <Folder className="h-4 w-4 flex-shrink-0 text-blue-500" />
                ) : (
                  <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                )}
                <span className="truncate" title={item.name}>
                  {item.name}
                </span>
                {item.isDirectory && (
                  <span className="text-xs text-muted-foreground">(폴더)</span>
                )}
              </li>
            ))}
            {items.length > 5 && (
              <li className="text-sm text-muted-foreground">
                외 {items.length - 5}개 항목
              </li>
            )}
          </ul>
        </div>

        {/* 삭제 요약 */}
        <div className="text-sm text-muted-foreground">
          {fileCount > 0 && folderCount > 0 ? (
            <span>파일 {fileCount}개, 폴더 {folderCount}개</span>
          ) : fileCount > 0 ? (
            <span>파일 {fileCount}개</span>
          ) : (
            <span>폴더 {folderCount}개</span>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
