import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Props for NavigateDialog component
 */
interface NavigateDialogProps {
  /** 현재 경로 */
  currentPath: string;

  /** 경로 입력 후 이동 콜백 */
  onNavigate: (path: string) => void;

  /** 트리거 버튼의 크기 (선택 사항) */
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm';

  /** 트리거 버튼의 변형 (선택 사항) */
  buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

/**
 * NavigateDialog Component
 *
 * Dialog for navigating to a specific path by typing
 * - Shows current path as placeholder
 * - Allows user to type new path
 * - Navigates on submit
 */
export function NavigateDialog({
  currentPath,
  onNavigate,
  buttonSize = 'icon-sm',
  buttonVariant = 'outline',
}: NavigateDialogProps) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (path.trim()) {
      onNavigate(path.trim());
      setOpen(false);
      setPath('');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setPath('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          title="경로 이동"
          aria-label="경로 이동"
        >
          <FolderOpen />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>경로 이동</DialogTitle>
          <DialogDescription>이동할 경로를 입력하세요</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="path">경로</Label>
              <Input
                id="path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder={currentPath}
                className="font-mono"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit">이동</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
