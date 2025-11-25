import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { FileSystemType } from '@/types/sftp';

/**
 * Props for RenameDialog component
 */
interface RenameDialogProps {
  /** 다이얼로그 열림/닫힘 상태 */
  open: boolean;

  /** 다이얼로그 상태 변경 콜백 */
  onOpenChange: (open: boolean) => void;

  /** 이름 변경 확인 콜백 */
  onConfirm: (newName: string) => Promise<void>;

  /** 현재 파일/폴더 이름 */
  currentName: string;

  /** 폴더 여부 */
  isDirectory: boolean;

  /** 패널 타입 (로컬/원격) */
  panelType: FileSystemType;
}

/**
 * 파일/폴더 이름에 사용할 수 없는 문자 (Windows + Unix)
 * / \ : * ? " < > |
 */
const INVALID_CHARS = /[/\\:*?"<>|]/;

/**
 * 파일/폴더 이름 최대 길이
 */
const MAX_LENGTH = 255;

/**
 * 파일/폴더 이름 유효성 검사
 * @param name 새 이름
 * @param currentName 현재 이름
 * @returns 에러 메시지 (유효하면 null)
 */
function validateFileName(name: string, currentName: string): string | null {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return '이름을 입력하세요';
  }

  if (trimmedName === currentName) {
    return '기존 이름과 동일합니다';
  }

  if (trimmedName.length > MAX_LENGTH) {
    return `이름은 ${MAX_LENGTH}자를 초과할 수 없습니다`;
  }

  if (INVALID_CHARS.test(trimmedName)) {
    return '이름에 사용할 수 없는 문자가 포함되어 있습니다 (/ \\ : * ? " < > |)';
  }

  if (trimmedName === '.' || trimmedName === '..') {
    return '유효하지 않은 이름입니다';
  }

  return null;
}

/**
 * RenameDialog Component
 *
 * Dialog for renaming a file or folder
 * Features:
 * - Pre-filled with current name
 * - Name validation
 * - Error message display
 * - Enter key support
 * - Rename/Cancel buttons
 *
 * Validation rules:
 * - Non-empty name
 * - Different from current name
 * - Max length: 255 characters
 * - No special characters: / \ : * ? " < > |
 * - Not "." or ".."
 */
export function RenameDialog({
  open,
  onOpenChange,
  onConfirm,
  currentName,
  isDirectory,
  panelType,
}: RenameDialogProps) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  /**
   * Dialog 열릴 때 기존 이름으로 초기화
   */
  useEffect(() => {
    if (open) {
      setNewName(currentName);
      setError(null);
      setIsRenaming(false);
    }
  }, [open, currentName]);

  /**
   * 입력값 변경 처리
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewName(value);

    // 입력 중 유효성 검사
    const validationError = validateFileName(value, currentName);
    setError(validationError);
  };

  /**
   * 이름 변경 처리
   */
  const handleConfirm = async () => {
    const trimmedName = newName.trim();

    // 최종 유효성 검사
    const validationError = validateFileName(trimmedName, currentName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsRenaming(true);

    try {
      await onConfirm(trimmedName);
      // 성공 시 상태 초기화
      handleClose();
    } catch (err) {
      // 에러는 부모 컴포넌트에서 처리 (Toast)
      console.error('Failed to rename:', err);
    } finally {
      setIsRenaming(false);
    }
  };

  /**
   * 다이얼로그 닫기 및 상태 초기화
   */
  const handleClose = () => {
    setNewName('');
    setError(null);
    setIsRenaming(false);
    onOpenChange(false);
  };

  /**
   * Enter 키 입력 처리
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !error && newName.trim() && newName.trim() !== currentName) {
      e.preventDefault();
      handleConfirm();
    }
  };

  const panelLabel = panelType === 'local' ? '로컬' : '원격';
  const itemType = isDirectory ? '폴더' : '파일';
  const isValid = !error && newName.trim().length > 0 && newName.trim() !== currentName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{itemType} 이름 변경</DialogTitle>
          <DialogDescription>
            {panelLabel}의 {itemType} 이름을 변경합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Input
            placeholder="새 이름"
            value={newName}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isRenaming}
            autoFocus
            aria-invalid={!!error}
            aria-describedby={error ? 'rename-error' : undefined}
          />

          {error && (
            <p id="rename-error" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isRenaming}>
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || isRenaming}>
            {isRenaming ? '변경 중...' : '변경'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
