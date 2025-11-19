import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CreatePtyResponse, PtyExitEvent, PtyOutputEvent } from '@/types/pty';

interface UsePtyOptions {
  onOutput?: (data: string) => void;
  onExit?: (exitCode: number | null) => void;
}

interface CreatePtyOptions {
  shell?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

interface UsePtyReturn {
  ptyId: string | null;
  isConnected: boolean;
  error: string | null;
  createPty: (cols: number, rows: number, options?: CreatePtyOptions) => Promise<void>;
  writeToPty: (data: string) => Promise<void>;
  resizePty: (cols: number, rows: number) => Promise<void>;
  closePty: () => Promise<void>;
}

/**
 * Custom hook for managing PTY sessions
 * Handles creation, communication, and cleanup of PTY connections
 */
export function usePty(options: UsePtyOptions = {}): UsePtyReturn {
  const [ptyId, setPtyId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs to store state to avoid recreating functions
  const ptyIdRef = useRef<string | null>(null);
  const onOutputRef = useRef(options.onOutput);
  const onExitRef = useRef(options.onExit);

  // Update refs when callbacks change
  useEffect(() => {
    onOutputRef.current = options.onOutput;
    onExitRef.current = options.onExit;
  }, [options.onOutput, options.onExit]);

  // Update ptyId ref when state changes
  useEffect(() => {
    ptyIdRef.current = ptyId;
  }, [ptyId]);

  // Refs for cleanup functions
  const outputUnlistenRef = useRef<UnlistenFn | null>(null);
  const exitUnlistenRef = useRef<UnlistenFn | null>(null);

  /**
   * Create a new PTY session
   */
  const createPty = useCallback(
    async (cols: number, rows: number, createOptions?: CreatePtyOptions) => {
      try {
        setError(null);

        // Call Tauri command to create PTY
        const response = await invoke<CreatePtyResponse>('create_pty', {
          shell: createOptions?.shell || null, // Use default shell if not provided
          args: createOptions?.args || null, // Command arguments (for ssh, etc.)
          cwd: createOptions?.cwd || null, // Use default working directory
          env: createOptions?.env || null, // Use default environment
          cols,
          rows,
        });

        setPtyId(response.pty_id);
        ptyIdRef.current = response.pty_id;
        setIsConnected(true);

        // Set up output event listener
        const outputUnlisten = await listen<PtyOutputEvent>(
          `pty-output-${response.pty_id}`,
          (event) => {
            if (onOutputRef.current) {
              onOutputRef.current(event.payload.data);
            }
          }
        );
        outputUnlistenRef.current = outputUnlisten;

        // Set up exit event listener
        const exitUnlisten = await listen<PtyExitEvent>(`pty-exit-${response.pty_id}`, (event) => {
          setIsConnected(false);
          if (onExitRef.current) {
            onExitRef.current(event.payload.exit_code);
          }
        });
        exitUnlistenRef.current = exitUnlisten;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        setIsConnected(false);
        console.error('Failed to create PTY:', err);
      }
    },
    []
  ); // No dependencies - uses refs instead

  /**
   * Write data to PTY (user input)
   */
  const writeToPty = useCallback(async (data: string) => {
    if (!ptyIdRef.current) {
      console.warn('Cannot write to PTY: not connected');
      return;
    }

    try {
      await invoke('write_to_pty', {
        ptyId: ptyIdRef.current,
        data,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Failed to write to PTY:', err);
    }
  }, []); // No dependencies - uses ref instead

  /**
   * Resize PTY session
   */
  const resizePty = useCallback(async (cols: number, rows: number) => {
    if (!ptyIdRef.current) {
      return;
    }

    try {
      await invoke('resize_pty', {
        ptyId: ptyIdRef.current,
        cols,
        rows,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Failed to resize PTY:', err);
    }
  }, []); // No dependencies - uses ref instead

  /**
   * Close PTY session
   */
  const closePty = useCallback(async () => {
    if (!ptyIdRef.current) {
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
        ptyId: ptyIdRef.current,
      });

      setPtyId(null);
      ptyIdRef.current = null;
      setIsConnected(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Failed to close PTY:', err);
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
    ptyId,
    isConnected,
    error,
    createPty,
    writeToPty,
    resizePty,
    closePty,
  };
}
