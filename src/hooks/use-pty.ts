import { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {
  CreatePtyResponse,
  PtyOutputEvent,
  PtyExitEvent,
} from '@/types/pty';

interface UsePtyOptions {
  onOutput?: (data: string) => void;
  onExit?: (exitCode: number | null) => void;
}

interface UsePtyReturn {
  ptyId: string | null;
  isConnected: boolean;
  error: string | null;
  createPty: (cols: number, rows: number) => Promise<void>;
  writeToPty: (data: string) => Promise<void>;
  resizePty: (cols: number, rows: number) => Promise<void>;
  closePty: () => Promise<void>;
}

/**
 * Custom hook for managing PTY sessions
 * Handles creation, communication, and cleanup of PTY connections
 */
export function usePty(options: UsePtyOptions = {}): UsePtyReturn {
  const { onOutput, onExit } = options;

  const [ptyId, setPtyId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup functions
  const outputUnlistenRef = useRef<UnlistenFn | null>(null);
  const exitUnlistenRef = useRef<UnlistenFn | null>(null);

  /**
   * Create a new PTY session
   */
  const createPty = useCallback(async (cols: number, rows: number) => {
    try {
      setError(null);

      // Call Tauri command to create PTY
      const response = await invoke<CreatePtyResponse>('create_pty', {
        shell: null, // Use default shell
        cwd: null,   // Use default working directory
        env: null,   // Use default environment
        cols,
        rows,
      });

      setPtyId(response.pty_id);
      setIsConnected(true);

      // Set up output event listener
      const outputUnlisten = await listen<PtyOutputEvent>(
        `pty-output-${response.pty_id}`,
        (event) => {
          if (onOutput) {
            onOutput(event.payload.data);
          }
        }
      );
      outputUnlistenRef.current = outputUnlisten;

      // Set up exit event listener
      const exitUnlisten = await listen<PtyExitEvent>(
        `pty-exit-${response.pty_id}`,
        (event) => {
          setIsConnected(false);
          if (onExit) {
            onExit(event.payload.exit_code);
          }
        }
      );
      exitUnlistenRef.current = exitUnlisten;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setIsConnected(false);
      console.error('Failed to create PTY:', err);
    }
  }, [onOutput, onExit]);

  /**
   * Write data to PTY (user input)
   */
  const writeToPty = useCallback(async (data: string) => {
    if (!ptyId) {
      console.warn('Cannot write to PTY: not connected');
      return;
    }

    try {
      await invoke('write_to_pty', {
        ptyId,
        data,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Failed to write to PTY:', err);
    }
  }, [ptyId]);

  /**
   * Resize PTY session
   */
  const resizePty = useCallback(async (cols: number, rows: number) => {
    if (!ptyId) {
      return;
    }

    try {
      await invoke('resize_pty', {
        ptyId,
        cols,
        rows,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Failed to resize PTY:', err);
    }
  }, [ptyId]);

  /**
   * Close PTY session
   */
  const closePty = useCallback(async () => {
    if (!ptyId) {
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

      // Close PTY session
      await invoke('close_pty', {
        ptyId,
      });

      setPtyId(null);
      setIsConnected(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Failed to close PTY:', err);
    }
  }, [ptyId]);

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
    ptyId,
    isConnected,
    error,
    createPty,
    writeToPty,
    resizePty,
    closePty,
  };
}
