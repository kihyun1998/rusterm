import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal as XTerm } from '@xterm/xterm';
import { useEffect, useRef, useState } from 'react';
import { TerminalContextMenu } from '@/components/menu/TerminalContextMenu';
import { getThemeById } from '@/constants/terminal-themes';
import { useClipboard } from '@/hooks/use-clipboard';
import { usePty } from '@/hooks/use-pty';
import { useSsh } from '@/hooks/use-ssh';
import { listenTerminalEvent, TERMINAL_EVENTS } from '@/lib/terminal-events';
import { getTerminalConfig } from '@/lib/xterm-config';
import { useSettingsStore } from '@/stores';
import type { ConnectionConfig, ConnectionType } from '@/types/connection';
import { isSSHConfig } from '@/types/connection';
import { toBackendSshConfig } from '@/types/ssh';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  id: string;
  className?: string;
  connectionType?: ConnectionType;
  connectionConfig?: ConnectionConfig;
}

/**
 * Terminal component
 * Renders an xterm.js terminal and connects to backend PTY or SSH
 */
export function Terminal({
  id,
  className = '',
  connectionType = 'local',
  connectionConfig,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isInitializedRef = useRef(false);
  const ptyCreatedRef = useRef(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isReady, setIsReady] = useState(false);

  // Determine connection type
  const isLocalConnection = connectionType === 'local' || !connectionType;
  const isSshConnection = connectionType === 'ssh';

  // Settings store
  const settings = useSettingsStore((state) => state.settings);

  // Clipboard management
  const { copyToClipboard } = useClipboard();

  // PTY connection management (for local terminals)
  const ptyHook = usePty({
    onOutput: (data) => {
      // Write PTY output to terminal
      if (xtermRef.current) {
        xtermRef.current.write(data);
      }
    },
    onExit: (exitCode) => {
      // Display exit message
      if (xtermRef.current) {
        const message =
          exitCode !== null
            ? `\r\n\x1b[1;33m[Process exited with code ${exitCode}]\x1b[0m\r\n`
            : `\r\n\x1b[1;33m[Process terminated]\x1b[0m\r\n`;
        xtermRef.current.write(message);
      }
    },
  });

  // SSH connection management (for SSH terminals)
  const sshHook = useSsh({
    onOutput: (data) => {
      // Write SSH output to terminal
      if (xtermRef.current) {
        xtermRef.current.write(data);
      }
    },
    onExit: (reason) => {
      // Display exit message
      if (xtermRef.current) {
        const message = `\r\n\x1b[1;33m[SSH connection closed: ${reason}]\x1b[0m\r\n`;
        xtermRef.current.write(message);
      }
    },
    onStateChange: (state) => {
      if (!xtermRef.current) return;

      const terminal = xtermRef.current;

      if (state === 'connecting') {
        if (connectionConfig && isSSHConfig(connectionConfig)) {
          terminal.write(`\x1b[1;36mConnecting to ${connectionConfig.username}@${connectionConfig.host}:${connectionConfig.port}...\x1b[0m\r\n`);
        }
      } else if (state === 'connected') {
        terminal.write(`\x1b[1;32mConnected successfully!\x1b[0m\r\n`);
      } else if (state === 'failed') {
        const errorMsg = sshHook.error || 'Authentication failed or connection refused';
        terminal.write(`\r\n\x1b[1;31m[Connection Failed: ${errorMsg}]\x1b[0m\r\n`);
      } else if (state === 'error') {
        const errorMsg = sshHook.error || 'An error occurred during SSH session';
        terminal.write(`\r\n\x1b[1;31m[Error: ${errorMsg}]\x1b[0m\r\n`);
      }
    },
  });

  // Select active hook based on connection type
  const isConnected = isLocalConnection
    ? ptyHook.isConnected
    : sshHook.status === 'connected';
  const error = isLocalConnection ? ptyHook.error : sshHook.error;

  // Store write function in ref to avoid recreating xterm on every render
  const writeInputRef = useRef<(data: string) => Promise<void>>(
    isLocalConnection ? ptyHook.writeToPty : sshHook.sendInput
  );
  useEffect(() => {
    writeInputRef.current = isLocalConnection ? ptyHook.writeToPty : sshHook.sendInput;
  }, [isLocalConnection, ptyHook.writeToPty, sshHook.sendInput]);

  // Initialize xterm.js
  useEffect(() => {
    if (!terminalRef.current || isInitializedRef.current) {
      return;
    }

    // Create terminal instance with settings if available
    const theme = settings?.terminalThemeId
      ? getThemeById(settings.terminalThemeId)?.theme
      : undefined;
    const config =
      settings && theme
        ? getTerminalConfig({
            fontSize: settings.fontSize,
            fontFamily: settings.fontFamily,
            theme,
          })
        : getTerminalConfig();

    const xterm = new XTerm(config);
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
      writeInputRef.current(data);
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

  // Create session when terminal is ready (PTY or SSH)
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

    // Create session based on connection type
    if (isLocalConnection) {
      // Create PTY session
      ptyHook.createPty(cols, rows);
    } else if (isSshConnection) {
      // Create SSH session
      if (!connectionConfig || !isSSHConfig(connectionConfig)) {
        console.error('SSH connection requires valid SSHConfig');
        return;
      }

      // Convert UI config to backend config
      const backendConfig = toBackendSshConfig(connectionConfig);
      sshHook.connect(backendConfig, cols, rows);
    }

    ptyCreatedRef.current = true;

    // Cleanup on unmount
    return () => {
      // Cleanup based on connection type
      if (isLocalConnection) {
        ptyHook.closePty();
      } else if (isSshConnection) {
        sshHook.disconnect();
      }
      ptyCreatedRef.current = false;
    };
  }, [
    isReady,
    connectionType,
    connectionConfig,
    isLocalConnection,
    isSshConnection,
    ptyHook,
    sshHook,
  ]);

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

          // Only notify backend if size is reasonable
          // This prevents content loss when window becomes very small
          if (isConnected && cols >= MIN_COLS && rows >= MIN_ROWS) {
            if (isLocalConnection) {
              ptyHook.resizePty(cols, rows);
            } else if (isSshConnection) {
              sshHook.resize(cols, rows);
            }
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
  }, [isReady, isConnected, isLocalConnection, isSshConnection, ptyHook, sshHook]);

  // Display error for local PTY connections (SSH errors handled in onStateChange)
  useEffect(() => {
    if (isLocalConnection && error && xtermRef.current) {
      xtermRef.current.write(`\r\n\x1b[1;31m[Error: ${error}]\x1b[0m\r\n`);
    }
  }, [error, isLocalConnection]);

  // Apply settings changes to terminal
  useEffect(() => {
    if (!isReady || !xtermRef.current || !fitAddonRef.current || !settings) {
      return;
    }

    const terminal = xtermRef.current;
    const fitAddon = fitAddonRef.current;

    // Update fontSize
    if (settings.fontSize && terminal.options.fontSize !== settings.fontSize) {
      terminal.options.fontSize = settings.fontSize;
      try {
        fitAddon.fit();
        if (isConnected) {
          if (isLocalConnection) {
            ptyHook.resizePty(terminal.cols, terminal.rows);
          } else if (isSshConnection) {
            sshHook.resize(terminal.cols, terminal.rows);
          }
        }
      } catch (err) {
        console.warn('Failed to apply fontSize change:', err);
      }
    }

    // Update theme
    const theme = settings.terminalThemeId
      ? getThemeById(settings.terminalThemeId)?.theme
      : undefined;
    if (theme && terminal.options.theme) {
      terminal.options.theme = {
        ...terminal.options.theme,
        ...theme,
      };
    }
  }, [settings, isReady, isConnected, isLocalConnection, isSshConnection, ptyHook, sshHook]);

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
        writeInputRef.current(detail.text);
      }
    });

    // Update font size
    const unsubscribeFontSize = listenTerminalEvent(TERMINAL_EVENTS.UPDATE_FONT_SIZE, (detail) => {
      if (detail?.fontSize && terminal.options) {
        terminal.options.fontSize = detail.fontSize;
        // Refit terminal after font size change
        try {
          fitAddon.fit();
          // Notify backend of potential size change
          if (isConnected) {
            if (isLocalConnection) {
              ptyHook.resizePty(terminal.cols, terminal.rows);
            } else if (isSshConnection) {
              sshHook.resize(terminal.cols, terminal.rows);
            }
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
  }, [
    isReady,
    isConnected,
    isLocalConnection,
    isSshConnection,
    ptyHook,
    sshHook,
    copyToClipboard,
  ]);

  const currentTheme = settings?.terminalThemeId
    ? getThemeById(settings.terminalThemeId)?.theme
    : undefined;

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full p-2 relative"
      style={{
        backgroundColor: currentTheme?.background || '#1e1e1e',
      }}
    >
      {/* Terminal */}
      <TerminalContextMenu
        terminalRef={xtermRef}
        onPaste={(text) => writeInputRef.current(text)}
      >
        <div ref={terminalRef} className={`w-full h-full ${className}`} data-terminal-id={id} />
      </TerminalContextMenu>
    </div>
  );
}

export default Terminal;
