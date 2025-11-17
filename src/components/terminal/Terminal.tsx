import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { usePty } from '@/hooks/use-pty';
import { getTerminalConfig } from '@/lib/xterm-config';
import { TerminalContextMenu } from '@/components/menu/TerminalContextMenu';
import { TERMINAL_EVENTS, listenTerminalEvent } from '@/lib/terminal-events';
import { useClipboard } from '@/hooks/use-clipboard';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  id: string;
  className?: string;
}

/**
 * Terminal component
 * Renders an xterm.js terminal and connects to backend PTY
 */
export function Terminal({ id, className = '' }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isInitializedRef = useRef(false);
  const ptyCreatedRef = useRef(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isReady, setIsReady] = useState(false);

  // Clipboard management
  const { copyToClipboard } = useClipboard();

  // PTY connection management
  const { createPty, writeToPty, resizePty, closePty, isConnected, error } = usePty({
    onOutput: (data) => {
      // Write PTY output to terminal
      if (xtermRef.current) {
        xtermRef.current.write(data);
      }
    },
    onExit: (exitCode) => {
      // Display exit message
      if (xtermRef.current) {
        const message = exitCode !== null
          ? `\r\n\x1b[1;33m[Process exited with code ${exitCode}]\x1b[0m\r\n`
          : `\r\n\x1b[1;33m[Process terminated]\x1b[0m\r\n`;
        xtermRef.current.write(message);
      }
    },
  });

  // Store writeToPty in ref to avoid recreating xterm on every render
  const writeToPtyRef = useRef(writeToPty);
  useEffect(() => {
    writeToPtyRef.current = writeToPty;
  }, [writeToPty]);

  // Initialize xterm.js
  useEffect(() => {
    if (!terminalRef.current || isInitializedRef.current) {
      return;
    }

    // Create terminal instance
    const xterm = new XTerm(getTerminalConfig());
    xtermRef.current = xterm;

    // Add fit addon for responsive resizing
    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    xterm.loadAddon(fitAddon);

    // Add web links addon for clickable URLs
    const webLinksAddon = new WebLinksAddon();
    xterm.loadAddon(webLinksAddon);

    // Mount terminal to DOM
    xterm.open(terminalRef.current);

    // Initial fit - delay to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch (err) {
        console.warn('Initial fit failed, retrying...', err);
        setTimeout(() => {
          try {
            fitAddon.fit();
          } catch (retryErr) {
            console.error('Fit retry failed:', retryErr);
          }
        }, 100);
      }
    });

    // Handle user input
    xterm.onData((data) => {
      writeToPtyRef.current(data);
    });

    isInitializedRef.current = true;
    setIsReady(true);

    // Cleanup on unmount
    return () => {
      xterm.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      isInitializedRef.current = false;
    };
  }, []); // No dependencies - only run once

  // Create PTY session when terminal is ready
  useEffect(() => {
    if (!isReady || !fitAddonRef.current || ptyCreatedRef.current) {
      return;
    }

    const terminal = xtermRef.current;
    if (!terminal) {
      return;
    }

    // Get terminal dimensions
    const cols = terminal.cols;
    const rows = terminal.rows;

    // Create PTY session
    createPty(cols, rows);
    ptyCreatedRef.current = true;

    // Cleanup on unmount
    return () => {
      closePty();
      ptyCreatedRef.current = false;
    };
  }, [isReady, createPty, closePty]);

  // Handle terminal resize
  useEffect(() => {
    if (!isReady || !fitAddonRef.current || !xtermRef.current) {
      return;
    }

    const fitAddon = fitAddonRef.current;
    const terminal = xtermRef.current;

    // Resize handler with debouncing
    const handleResize = () => {
      if (!terminalRef.current || !terminal || !fitAddon) {
        return;
      }

      // Clear previous timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      // Debounce resize to prevent multiple rapid calls
      resizeTimeoutRef.current = setTimeout(() => {
        try {
          // Fit terminal to container
          fitAddon.fit();

          // Get new dimensions
          const cols = terminal.cols;
          const rows = terminal.rows;

          // Minimum size to prevent PTY corruption
          const MIN_COLS = 20;
          const MIN_ROWS = 5;

          // Only notify PTY if size is reasonable
          // This prevents content loss when window becomes very small
          if (isConnected && cols >= MIN_COLS && rows >= MIN_ROWS) {
            resizePty(cols, rows);
          }
        } catch (err) {
          console.warn('Resize failed:', err);
        }
      }, 50); // 50ms debounce
    };

    // Use ResizeObserver for wrapper size changes
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current);
    }

    // Cleanup
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [isReady, isConnected, resizePty]);

  // Display error if any
  useEffect(() => {
    if (error && xtermRef.current) {
      xtermRef.current.write(`\r\n\x1b[1;31m[Error: ${error}]\x1b[0m\r\n`);
    }
  }, [error]);

  // Listen to terminal events from CommandPalette and other components
  useEffect(() => {
    if (!isReady || !xtermRef.current || !fitAddonRef.current) {
      return;
    }

    const terminal = xtermRef.current;
    const fitAddon = fitAddonRef.current;

    // Clear terminal
    const unsubscribeClear = listenTerminalEvent(TERMINAL_EVENTS.CLEAR, () => {
      terminal.clear();
    });

    // Select all text (excluding trailing empty lines)
    const unsubscribeSelectAll = listenTerminalEvent(TERMINAL_EVENTS.SELECT_ALL, () => {
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
    });

    // Copy selected text to clipboard
    const unsubscribeCopy = listenTerminalEvent(TERMINAL_EVENTS.COPY, async () => {
      const selection = terminal.getSelection();
      if (selection) {
        await copyToClipboard(selection);
      }
    });

    // Paste text
    const unsubscribePaste = listenTerminalEvent(TERMINAL_EVENTS.PASTE, (detail) => {
      if (detail?.text) {
        writeToPty(detail.text);
      }
    });

    // Update font size
    const unsubscribeFontSize = listenTerminalEvent(TERMINAL_EVENTS.UPDATE_FONT_SIZE, (detail) => {
      if (detail?.fontSize && terminal.options) {
        terminal.options.fontSize = detail.fontSize;
        // Refit terminal after font size change
        try {
          fitAddon.fit();
          // Notify PTY of potential size change
          if (isConnected) {
            resizePty(terminal.cols, terminal.rows);
          }
        } catch (err) {
          console.warn('Failed to refit after font size change:', err);
        }
      }
    });

    // Cleanup all listeners
    return () => {
      unsubscribeClear();
      unsubscribeSelectAll();
      unsubscribeCopy();
      unsubscribePaste();
      unsubscribeFontSize();
    };
  }, [isReady, writeToPty, isConnected, resizePty, copyToClipboard]);

  return (
    <div ref={wrapperRef} className="w-full h-full bg-[#1e1e1e] p-2">
      <TerminalContextMenu
        terminalRef={xtermRef}
        onPaste={(text) => writeToPty(text)}
      >
        <div
          ref={terminalRef}
          className={`w-full h-full ${className}`}
          data-terminal-id={id}
        />
      </TerminalContextMenu>
    </div>
  );
}

export default Terminal;
