import { useState } from 'react';
import { toast } from 'sonner';
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
 * Props for NewFolderDialog component
 */
interface NewFolderDialogProps {
  /** 다이얼로그 열림/닫힘 상태 */
  open: boolean;

  /** 다이얼로그 상태 변경 콜백 */
  onOpenChange: (open: boolean) => void;

  /** 폴더 생성 확인 콜백 */
  onConfirm: (folderName: string) => Promise<void>;

  /** 패널 타입 (로컬/원격) */
  panelType: FileSystemType;
}

/**
 * 폴더 이름에 사용할 수 없는 문자 (Windows + Unix)
 * / \ : * ? " < > |
 */
const INVALID_CHARS = /[/\\:*?"<>|]/;

/**
 * 폴더 이름 최대 길이
 */
const MAX_LENGTH = 255;

/**
 * 폴더 이름 유효성 검사
 * @returns 에러 메시지 (유효하면 null)
 */
function validateFolderName(name: string): string | null {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return '폴더 이름을 입력하세요';
  }

  if (trimmedName.length > MAX_LENGTH) {
    return `폴더 이름은 ${MAX_LENGTH}자를 초과할 수 없습니다`;
  }

  if (INVALID_CHARS.test(trimmedName)) {
    return '폴더 이름에 사용할 수 없는 문자가 포함되어 있습니다 (/ \\ : * ? " < > |)';
  }

  if (trimmedName === '.' || trimmedName === '..') {
    return '유효하지 않은 폴더 이름입니다';
  }

  return null;
}

/**
 * NewFolderDialog Component
 *
 * Dialog for creating a new folder in the current directory
 * Features:
 * - Folder name input with validation
 * - Error message display
 * - Enter key support
 * - Create/Cancel buttons
 *
 * Validation rules:
 * - Non-empty name
 * - Max length: 255 characters
 * - No special characters: / \ : * ? " < > |
 * - Not "." or ".."
 */
export function NewFolderDialog({ open, onOpenChange, onConfirm, panelType }: NewFolderDialogProps) {
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  /**
   * 입력값 변경 처리
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFolderName(value);

    // 입력 중 유효성 검사
    const validationError = validateFolderName(value);
    setError(validationError);
  };

  /**
   * 폴더 생성 처리
   */
  const handleConfirm = async () => {
    const trimmedName = folderName.trim();

    // 최종 유효성 검사
    const validationError = validateFolderName(trimmedName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);

    try {
      await onConfirm(trimmedName);
      // 성공 시 상태 초기화
      handleClose();
    } catch (err) {
      // 에러는 부모 컴포넌트에서 처리 (Toast)
      console.error('Failed to create folder:', err);
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * 다이얼로그 닫기 및 상태 초기화
   */
  const handleClose = () => {
    setFolderName('');
    setError(null);
    setIsCreating(false);
    onOpenChange(false);
  };

  /**
   * Enter 키 입력 처리
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !error && folderName.trim()) {
      e.preventDefault();
      handleConfirm();
    }
  };

  const panelLabel = panelType === 'local' ? '로컬' : '원격';
  const isValid = !error && folderName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 폴더 만들기</DialogTitle>
          <DialogDescription>
            {panelLabel} 파일 시스템에 새 폴더를 만듭니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Input
            placeholder="폴더 이름"
            value={folderName}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isCreating}
            autoFocus
            aria-invalid={!!error}
            aria-describedby={error ? 'folder-name-error' : undefined}
          />

          {error && (
            <p id="folder-name-error" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
          >
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isCreating}
          >
            {isCreating ? '생성 중...' : '생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
