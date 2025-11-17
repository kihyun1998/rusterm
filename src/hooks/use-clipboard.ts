import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useCallback, useState } from 'react';

interface UseClipboardReturn {
  copyToClipboard: (text: string) => Promise<boolean>;
  pasteFromClipboard: () => Promise<string | null>;
  error: string | null;
}

/**
 * Hook for clipboard operations using Tauri clipboard manager
 * Provides copy and paste functionality with error handling
 */
export function useClipboard(): UseClipboardReturn {
  const [error, setError] = useState<string | null>(null);

  /**
   * Copy text to clipboard
   * @param text - Text to copy
   * @returns true if successful, false otherwise
   */
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      setError(null);
      await writeText(text);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to copy to clipboard';
      setError(errorMessage);
      console.error('Clipboard copy error:', err);
      return false;
    }
  }, []);

  /**
   * Paste text from clipboard
   * @returns clipboard text or null if failed
   */
  const pasteFromClipboard = useCallback(async (): Promise<string | null> => {
    try {
      setError(null);
      const text = await readText();
      return text || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to read from clipboard';
      setError(errorMessage);
      console.error('Clipboard paste error:', err);
      return null;
    }
  }, []);

  return {
    copyToClipboard,
    pasteFromClipboard,
    error,
  };
}
