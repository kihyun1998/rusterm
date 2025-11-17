import type { Terminal as XTerm } from '@xterm/xterm';
import { ClipboardPaste, Copy, Eraser, TextSelect } from 'lucide-react';
import { type ReactNode, type RefObject, useCallback, useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
export function TerminalContextMenu({ terminalRef, onPaste, children }: TerminalContextMenuProps) {
  const { copyToClipboard, pasteFromClipboard } = useClipboard();
  const [hasSelection, setHasSelection] = useState(false);

  /**
   * Update selection state when context menu opens
   */
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && terminalRef.current) {
        setHasSelection(terminalRef.current.hasSelection());
      }
    },
    [terminalRef]
  );

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
   * Select all text in terminal (excluding trailing empty lines)
   */
  const handleSelectAll = useCallback(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    // Find the last non-empty line
    const buffer = terminal.buffer.active;
    let lastNonEmptyLine = buffer.length - 1;

    // Search backwards from the end to find the last line with content
    for (let i = buffer.length - 1; i >= 0; i--) {
      const line = buffer.getLine(i);
      if (line) {
        // Check if line has any non-whitespace content
        const lineText = line.translateToString(true).trim();
        if (lineText.length > 0) {
          lastNonEmptyLine = i;
          break;
        }
      }
    }

    // Select from start (0,0) to the end of the last non-empty line
    if (lastNonEmptyLine >= 0) {
      terminal.selectLines(0, lastNonEmptyLine + 1);
    } else {
      // If no content found, select all anyway
      terminal.selectAll();
    }
  }, [terminalRef]);

  /**
   * Clear terminal screen
   */
  const handleClear = useCallback(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    terminal.clear();
  }, [terminalRef]);

  return (
    <ContextMenu onOpenChange={handleOpenChange}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handleCopy} disabled={!hasSelection}>
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
