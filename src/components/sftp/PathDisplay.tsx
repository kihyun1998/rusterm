import { Home } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Props for PathDisplay component
 */
interface PathDisplayProps {
  /** 표시할 경로 (예: "/home/user/documents") */
  path: string;

  /** Home 버튼 클릭 시 실행될 콜백 */
  onHome: () => void;
}

/**
 * PathDisplay Component
 *
 * Displays the current directory path with a home button
 * - Shows full path in a read-only input field
 * - Home button to navigate to home directory
 * - Click on path to select all for easy copying
 */
export function PathDisplay({ path, onHome }: PathDisplayProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle input click - select all text for easy copying
   */
  const handleInputClick = () => {
    inputRef.current?.select();
  };

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Home button */}
      <Button
        variant="outline"
        size="icon-sm"
        onClick={onHome}
        title="홈 디렉토리로 이동"
        aria-label="홈 디렉토리로 이동"
      >
        <Home />
      </Button>

      {/* Path input (read-only) */}
      <Input
        ref={inputRef}
        value={path}
        readOnly
        onClick={handleInputClick}
        className="flex-1 min-w-0 font-mono text-sm cursor-pointer"
        title={path}
      />
    </div>
  );
}
