import { useCallback, type ReactNode, type RefObject } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Copy, ClipboardPaste, TextSelect, Eraser } from 'lucide-react';
import { useClipboard } from '@/hooks/use-clipboard';

interface TerminalContextMenuProps {
  terminalRef: RefObject<XTerm | null>;
  onPaste: (text: string) => void;
  children: ReactNode;
}

/**
 * Context menu for terminal operations
 * Provides copy, paste, select all, and clear functionality
 */
export function TerminalContextMenu({
  terminalRef,
  onPaste,
  children,
}: TerminalContextMenuProps) {
  const { copyToClipboard, pasteFromClipboard } = useClipboard();

  /**
   * Copy selected text to clipboard
   */
  const handleCopy = useCallback(async () => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    const selection = terminal.getSelection();
    if (selection) {
      await copyToClipboard(selection);
    }
  }, [terminalRef, copyToClipboard]);

  /**
   * Paste text from clipboard to terminal
   */
  const handlePaste = useCallback(async () => {
    const text = await pasteFromClipboard();
    if (text) {
      onPaste(text);
    }
  }, [pasteFromClipboard, onPaste]);

  /**
   * Select all text in terminal
   */
  const handleSelectAll = useCallback(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    terminal.selectAll();
  }, [terminalRef]);

  /**
   * Clear terminal screen
   */
  const handleClear = useCallback(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    terminal.clear();
  }, [terminalRef]);

  /**
   * Check if terminal has selected text
   */
  const hasSelection = useCallback(() => {
    const terminal = terminalRef.current;
    if (!terminal) return false;

    return terminal.hasSelection();
  }, [terminalRef]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem
          onClick={handleCopy}
          disabled={!hasSelection()}
        >
          <Copy className="mr-2 h-4 w-4" />
          <span>복사</span>
          <ContextMenuShortcut>Ctrl+Shift+C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handlePaste}>
          <ClipboardPaste className="mr-2 h-4 w-4" />
          <span>붙여넣기</span>
          <ContextMenuShortcut>Ctrl+Shift+V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleSelectAll}>
          <TextSelect className="mr-2 h-4 w-4" />
          <span>모두 선택</span>
          <ContextMenuShortcut>Ctrl+Shift+A</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleClear}>
          <Eraser className="mr-2 h-4 w-4" />
          <span>화면 지우기</span>
          <ContextMenuShortcut>Ctrl+L</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
