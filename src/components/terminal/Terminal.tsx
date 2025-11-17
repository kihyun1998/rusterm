import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { usePty } from '@/hooks/use-pty';
import { getTerminalConfig } from '@/lib/xterm-config';
import { TerminalContextMenu } from '@/components/menu/TerminalContextMenu';
import { TERMINAL_EVENTS, listenTerminalEvent } from '@/lib/terminal-events';
import { useSettingsStore } from '@/stores/use-settings-store';
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
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isInitializedRef = useRef(false);
  const ptyCreatedRef = useRef(false);

  const [isReady, setIsReady] = useState(false);

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

    // Resize handler
    const handleResize = () => {
      if (!terminalRef.current || !terminal || !fitAddon) {
        return;
      }

      try {
        // Fit terminal to container
        fitAddon.fit();

        // Get new dimensions
        const cols = terminal.cols;
        const rows = terminal.rows;

        // Notify PTY of size change
        if (isConnected) {
          resizePty(cols, rows);
        }
      } catch (err) {
        console.warn('Resize failed:', err);
      }
    };

    // Listen for window resize
    window.addEventListener('resize', handleResize);

    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
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

    // Select all text
    const unsubscribeSelectAll = listenTerminalEvent(TERMINAL_EVENTS.SELECT_ALL, () => {
      terminal.selectAll();
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
      unsubscribePaste();
      unsubscribeFontSize();
    };
  }, [isReady, writeToPty, isConnected, resizePty]);

  return (
    <TerminalContextMenu
      terminalRef={xtermRef}
      onPaste={(text) => writeToPty(text)}
    >
      <div
        ref={terminalRef}
        className={`w-full h-full p-2 ${className}`}
        data-terminal-id={id}
      />
    </TerminalContextMenu>
  );
}

export default Terminal;
