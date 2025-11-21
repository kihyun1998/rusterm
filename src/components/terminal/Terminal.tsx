import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal as XTerm } from '@xterm/xterm';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TerminalContextMenu } from '@/components/menu/TerminalContextMenu';
import { getThemeById } from '@/constants/terminal-themes';
import { useClipboard } from '@/hooks/use-clipboard';
import { usePty } from '@/hooks/use-pty';
import { useSsh } from '@/hooks/use-ssh';
import { listenTerminalEvent, TERMINAL_EVENTS } from '@/lib/terminal-events';
import { getTerminalConfig } from '@/lib/xterm-config';
import { useSettingsStore, useTabStore } from '@/stores';
import type { ConnectionConfig, ConnectionType } from '@/types/connection';
import { isSSHConfig } from '@/types/connection';
import {
  type SshConnectionState,
  type SshExitEvent,
  type SshOutputEvent,
  toBackendSshConfig,
} from '@/types/ssh';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  id: string;
  className?: string;
  connectionType?: ConnectionType;
  connectionProfileId?: string;
}

/**
 * Terminal component
 * Renders an xterm.js terminal and connects to backend PTY or SSH
 */
export function Terminal({
  id,
  className = '',
  connectionType = 'local',
  connectionProfileId,
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

  // Refs for SSH error messages (to avoid recreating callback)
  const sshErrorRef = useRef<string | null>(null);

  // Credential resolution state
  const [resolvedConfig, setResolvedConfig] = useState<ConnectionConfig | null>(null);
  const [isResolvingCredentials, setIsResolvingCredentials] = useState(false);
  const resolvedConfigRef = useRef<ConnectionConfig | null>(null);

  // Track if SSH connection is using PTY (for interactive auth without credentials)
  const [useSshViaPty, setUseSshViaPty] = useState(false);

  // Track if this is an IPC-created SSH session (backend already created the session)
  const [isIpcCreatedSsh, setIsIpcCreatedSsh] = useState(false);
  const ipcSshSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    resolvedConfigRef.current = resolvedConfig;
  }, [resolvedConfig]);

  // Resolve credentials from keyring
  useEffect(() => {
    const resolveCredentials = async () => {
      // Restore credentials from keyring if connectionProfileId is provided
      if (connectionProfileId) {
        setIsResolvingCredentials(true);

        try {
          const { useConnectionProfileStore } = await import(
            '@/stores/use-connection-profile-store'
          );
          const profile = useConnectionProfileStore.getState().getProfileById(connectionProfileId);

          if (!profile) {
            // No profile found - this might be an IPC-created SSH session
            // IPC sessions pass session_id as connectionProfileId
            if (isSshConnection) {
              console.log(
                'No profile found - treating as IPC-created SSH session:',
                connectionProfileId
              );
              setIsIpcCreatedSsh(true);
              ipcSshSessionIdRef.current = connectionProfileId;
            } else {
              console.error('Profile not found:', connectionProfileId);
            }
            setResolvedConfig(null);
            setIsResolvingCredentials(false);
            return;
          }

          let config: ConnectionConfig = profile.config;

          // Restore credentials from keyring for SSH profiles
          if (profile.type === 'ssh' && isSSHConfig(profile.config)) {
            try {
              const { getCredential } = await import('@/lib/keyring');

              let password: string | null = null;
              let privateKey: string | null = null;
              let passphrase: string | null = null;

              // Restore only the credentials that were saved (based on savedAuthType)
              if (profile.savedAuthType === 'password') {
                password = await getCredential(connectionProfileId, 'ssh', 'password');
                console.log('Terminal: Restored password credential');
              } else if (profile.savedAuthType === 'privateKey') {
                privateKey = await getCredential(connectionProfileId, 'ssh', 'privatekey');
                console.log('Terminal: Restored privateKey credential');
              } else if (profile.savedAuthType === 'passphrase') {
                [privateKey, passphrase] = await Promise.all([
                  getCredential(connectionProfileId, 'ssh', 'privatekey'),
                  getCredential(connectionProfileId, 'ssh', 'passphrase'),
                ]);
                console.log('Terminal: Restored privateKey + passphrase credentials');
              } else {
                // interactive - no credentials to restore
                console.log('Terminal: Interactive auth - no credentials to restore');
              }

              config = {
                ...profile.config,
                password: password || undefined,
                privateKey: privateKey || undefined,
                passphrase: passphrase || undefined,
              };
            } catch (error) {
              console.error('Failed to retrieve credentials from keyring:', error);
              // Continue with config without credentials (may fall back to interactive auth)
            }
          }

          setResolvedConfig(config);
        } catch (error) {
          console.error('Failed to resolve credentials:', error);
          setResolvedConfig(null);
        } finally {
          setIsResolvingCredentials(false);
        }
        return;
      }

      // No connectionProfileId - set to null
      setResolvedConfig(null);
      setIsResolvingCredentials(false);
    };

    resolveCredentials();
  }, [connectionProfileId, isSshConnection]);

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

  // SSH state change handler (stable with useCallback)
  const handleSshStateChange = useCallback((state: SshConnectionState) => {
    if (!xtermRef.current) return;

    const terminal = xtermRef.current;

    if (state === 'connecting') {
      const config = resolvedConfigRef.current;
      if (config && isSSHConfig(config)) {
        terminal.write(
          `\x1b[1;36mConnecting to ${config.username}@${config.host}:${config.port}...\x1b[0m\r\n`
        );
      }
    } else if (state === 'connected') {
      terminal.write(`\x1b[1;32mConnected successfully!\x1b[0m\r\n`);
    } else if (state === 'failed') {
      const errorMsg = sshErrorRef.current || 'Authentication failed or connection refused';
      terminal.write(`\r\n\x1b[1;31m[Connection Failed: ${errorMsg}]\x1b[0m\r\n`);
    } else if (state === 'error') {
      const errorMsg = sshErrorRef.current || 'An error occurred during SSH session';
      terminal.write(`\r\n\x1b[1;31m[Error: ${errorMsg}]\x1b[0m\r\n`);
    }
  }, []);

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
    onStateChange: handleSshStateChange,
  });

  // Update SSH error ref when error changes
  useEffect(() => {
    sshErrorRef.current = sshHook.error;
  }, [sshHook.error]);

  // Listen for SSH events for IPC-created sessions
  useEffect(() => {
    if (!isIpcCreatedSsh || !ipcSshSessionIdRef.current || !xtermRef.current) {
      return;
    }

    const sessionId = ipcSshSessionIdRef.current;
    const terminal = xtermRef.current;

    console.log('[IPC SSH] Setting up event listeners for session:', sessionId);

    // Listen for SSH output events
    const setupListeners = async () => {
      const { listen } = await import('@tauri-apps/api/event');

      // Output event listener
      const unlistenOutput = await listen<SshOutputEvent>(`ssh://output/${sessionId}`, (event) => {
        const data = event.payload.data;
        if (terminal) {
          terminal.write(data);
        }
      });

      // Exit event listener
      const unlistenExit = await listen<SshExitEvent>(`ssh://exit/${sessionId}`, (event) => {
        const reason = event.payload.reason || 'Connection closed';
        if (terminal) {
          terminal.write(`\r\n\x1b[1;33m[SSH connection closed: ${reason}]\x1b[0m\r\n`);
        }
      });

      return { unlistenOutput, unlistenExit };
    };

    let cleanup: { unlistenOutput: () => void; unlistenExit: () => void } | null = null;

    setupListeners().then((result) => {
      cleanup = result;
    });

    return () => {
      if (cleanup) {
        cleanup.unlistenOutput();
        cleanup.unlistenExit();
      }
    };
  }, [isIpcCreatedSsh]);

  // Select active hook based on connection type
  const isConnected = isLocalConnection ? ptyHook.isConnected : sshHook.status === 'connected';
  const error = isLocalConnection ? ptyHook.error : sshHook.error;

  // Store resize/close functions in refs to avoid dependency issues
  const ptyResizeRef = useRef(ptyHook.resizePty);
  const sshResizeRef = useRef(sshHook.resize);

  useEffect(() => {
    ptyResizeRef.current = ptyHook.resizePty;
    sshResizeRef.current = sshHook.resize;
  }, [ptyHook.resizePty, sshHook.resize]);

  // Store write function in ref to avoid recreating xterm on every render
  const writeInputRef = useRef<(data: string) => Promise<void>>(
    isLocalConnection || useSshViaPty ? ptyHook.writeToPty : sshHook.sendInput
  );
  useEffect(() => {
    writeInputRef.current =
      isLocalConnection || useSshViaPty ? ptyHook.writeToPty : sshHook.sendInput;
  }, [isLocalConnection, useSshViaPty, ptyHook.writeToPty, sshHook.sendInput]);

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

    // Handle dynamic title changes from terminal (e.g., shell PS1 prompt)
    xterm.onTitleChange((title) => {
      useTabStore.getState().updateTab(id, { title });
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
  }, [settings, id]); // No dependencies - only run once

  // Create session when terminal is ready (PTY or SSH)
  useEffect(() => {
    // Wait for credentials to be resolved
    if (isResolvingCredentials) {
      return;
    }

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
      // Check if this is an IPC-created SSH session
      if (isIpcCreatedSsh) {
        // IPC-created session - backend already created it, just listen for events
        console.log('[IPC SSH] Session already created by backend, skipping frontend creation');
        // Event listeners are set up in separate useEffect
        return;
      }

      // UI-created SSH session - create it now
      if (!resolvedConfig || !isSSHConfig(resolvedConfig)) {
        console.error('SSH connection requires valid SSHConfig');
        if (terminal) {
          terminal.write('\x1b[1;31m[Error: Invalid SSH configuration]\x1b[0m\r\n');
        }
        return;
      }

      console.log('Terminal using resolved SSH config:', {
        host: resolvedConfig.host,
        username: resolvedConfig.username,
        hasPassword: !!resolvedConfig.password,
        hasPrivateKey: !!resolvedConfig.privateKey,
        hasPassphrase: !!resolvedConfig.passphrase,
      });

      // Check if password or privateKey is provided
      const hasAuth = resolvedConfig.password || resolvedConfig.privateKey;

      if (hasAuth) {
        // Use SSH library for direct connection with credentials
        setUseSshViaPty(false);
        const backendConfig = toBackendSshConfig(resolvedConfig);
        sshHook.connect(backendConfig, cols, rows);
      } else {
        // Use PTY with ssh command for interactive authentication
        setUseSshViaPty(true);
        const sshArgs = [
          `${resolvedConfig.username}@${resolvedConfig.host}`,
          '-p',
          resolvedConfig.port.toString(),
        ];
        ptyHook.createPty(cols, rows, { shell: 'ssh', args: sshArgs });
      }
    }

    ptyCreatedRef.current = true;

    // Cleanup on unmount
    return () => {
      // Cleanup based on connection type
      if (isLocalConnection) {
        ptyHook.closePty();
      } else if (isSshConnection) {
        // IPC-created sessions are cleaned up via close_tab IPC command
        // Don't try to close them from frontend
        if (!isIpcCreatedSsh) {
          // Check if we used PTY or SSH library
          if (resolvedConfig && isSSHConfig(resolvedConfig)) {
            const hasAuth = resolvedConfig.password || resolvedConfig.privateKey;
            if (hasAuth) {
              sshHook.disconnect();
            } else {
              ptyHook.closePty();
            }
          }
        }
      }
      ptyCreatedRef.current = false;
    };
    // Only run once when terminal is ready - hooks are stable via useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isReady,
    isResolvingCredentials,
    resolvedConfig,
    isLocalConnection,
    isSshConnection,
    isIpcCreatedSsh,
    ptyHook.closePty,
    ptyHook.createPty,
    sshHook.connect,
    sshHook.disconnect,
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
            if (isLocalConnection || useSshViaPty) {
              ptyResizeRef.current(cols, rows);
            } else if (isSshConnection) {
              sshResizeRef.current(cols, rows);
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
  }, [isReady, isConnected, isLocalConnection, isSshConnection, useSshViaPty]);

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
          if (isLocalConnection || useSshViaPty) {
            ptyResizeRef.current(terminal.cols, terminal.rows);
          } else if (isSshConnection) {
            sshResizeRef.current(terminal.cols, terminal.rows);
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
  }, [settings, isReady, isConnected, isLocalConnection, isSshConnection, useSshViaPty]);

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
            if (isLocalConnection || useSshViaPty) {
              ptyResizeRef.current(terminal.cols, terminal.rows);
            } else if (isSshConnection) {
              sshResizeRef.current(terminal.cols, terminal.rows);
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
  }, [isReady, isConnected, isLocalConnection, isSshConnection, useSshViaPty, copyToClipboard]);

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
      <TerminalContextMenu terminalRef={xtermRef} onPaste={(text) => writeInputRef.current(text)}>
        <div ref={terminalRef} className={`w-full h-full ${className}`} data-terminal-id={id} />
      </TerminalContextMenu>
    </div>
  );
}

export default Terminal;
