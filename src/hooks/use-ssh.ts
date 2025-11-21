import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CreateSshResponse,
  SshConfig,
  SshConnectionState,
  SshExitEvent,
  SshOutputEvent,
} from '@/types/ssh';

interface UseSshOptions {
  onOutput?: (data: string) => void;
  onExit?: (reason: string) => void;
  onStateChange?: (state: SshConnectionState) => void;
}

interface UseSshReturn {
  sessionId: string | null;
  status: SshConnectionState;
  error: string | null;
  connect: (config: SshConfig, cols: number, rows: number) => Promise<void>;
  sendInput: (data: string) => Promise<void>;
  resize: (cols: number, rows: number) => Promise<void>;
  disconnect: () => Promise<void>;
}

/**
 * Custom hook for managing SSH sessions
 * Handles creation, communication, and cleanup of SSH connections
 */
export function useSsh(options: UseSshOptions = {}): UseSshReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SshConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Use refs to store state to avoid recreating functions
  const sessionIdRef = useRef<string | null>(null);
  const onOutputRef = useRef(options.onOutput);
  const onExitRef = useRef(options.onExit);
  const onStateChangeRef = useRef(options.onStateChange);

  // Update refs when callbacks change
  useEffect(() => {
    onOutputRef.current = options.onOutput;
    onExitRef.current = options.onExit;
    onStateChangeRef.current = options.onStateChange;
  }, [options.onOutput, options.onExit, options.onStateChange]);

  // Update sessionId ref when state changes
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Refs for cleanup functions
  const outputUnlistenRef = useRef<UnlistenFn | null>(null);
  const exitUnlistenRef = useRef<UnlistenFn | null>(null);

  /**
   * Create a new SSH session and connect
   */
  const connect = useCallback(async (config: SshConfig, cols: number, rows: number) => {
    try {
      setError(null);
      setStatus('connecting');
      onStateChangeRef.current?.('connecting');

      // Call Tauri command to create SSH session
      const response = await invoke<CreateSshResponse>('create_ssh_session', {
        config,
        cols,
        rows,
      });

      setSessionId(response.sessionId);
      sessionIdRef.current = response.sessionId;
      setStatus('connected');
      onStateChangeRef.current?.('connected');

      // Set up output event listener
      const outputUnlisten = await listen<SshOutputEvent>(
        `ssh://output/${response.sessionId}`,
        (event) => {
          if (onOutputRef.current) {
            onOutputRef.current(event.payload.data);
          }
        }
      );
      outputUnlistenRef.current = outputUnlisten;

      // Set up exit event listener
      const exitUnlisten = await listen<SshExitEvent>(
        `ssh://exit/${response.sessionId}`,
        (event) => {
          setStatus('disconnected');
          onStateChangeRef.current?.('disconnected');
          if (onExitRef.current) {
            onExitRef.current(event.payload.reason);
          }
        }
      );
      exitUnlistenRef.current = exitUnlisten;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setStatus('failed');
      onStateChangeRef.current?.('failed');
      console.error('Failed to create SSH session:', err);
    }
  }, []); // No dependencies - uses refs instead

  /**
   * Send user input to SSH session
   */
  const sendInput = useCallback(async (data: string) => {
    if (!sessionIdRef.current) {
      console.warn('Cannot send input: not connected');
      return;
    }

    try {
      await invoke('write_to_ssh', {
        sessionId: sessionIdRef.current,
        data,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setStatus('error');
      onStateChangeRef.current?.('error');
      console.error('Failed to write to SSH:', err);
    }
  }, []); // No dependencies - uses ref instead

  /**
   * Resize SSH session terminal
   */
  const resize = useCallback(async (cols: number, rows: number) => {
    if (!sessionIdRef.current) {
      return;
    }

    try {
      await invoke('resize_ssh_session', {
        sessionId: sessionIdRef.current,
        cols,
        rows,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Failed to resize SSH session:', err);
    }
  }, []); // No dependencies - uses ref instead

  /**
   * Disconnect SSH session
   */
  const disconnect = useCallback(async () => {
    if (!sessionIdRef.current) {
      return;
    }

    try {
      // Unlisten from events
      if (outputUnlistenRef.current) {
        outputUnlistenRef.current();
        outputUnlistenRef.current = null;
      }
      if (exitUnlistenRef.current) {
        exitUnlistenRef.current();
        exitUnlistenRef.current = null;
      }

      // Close SSH session
      await invoke('close_ssh_session', {
        sessionId: sessionIdRef.current,
      });

      setSessionId(null);
      sessionIdRef.current = null;
      setStatus('disconnected');
      onStateChangeRef.current?.('disconnected');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Failed to close SSH session:', err);
    }
  }, []); // No dependencies - uses ref instead

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (outputUnlistenRef.current) {
        outputUnlistenRef.current();
      }
      if (exitUnlistenRef.current) {
        exitUnlistenRef.current();
      }
    };
  }, []);

  return {
    sessionId,
    status,
    error,
    connect,
    sendInput,
    resize,
    disconnect,
  };
}
