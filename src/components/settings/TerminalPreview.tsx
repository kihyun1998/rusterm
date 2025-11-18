import { Terminal } from '@xterm/xterm';
import { useEffect, useRef } from 'react';
import type { TerminalTheme } from '@/types/settings';
import '@xterm/xterm/css/xterm.css';

interface TerminalPreviewProps {
  theme: TerminalTheme;
  fontSize?: number;
  fontFamily?: string;
}

/**
 * Terminal Preview Component
 * Displays a small read-only terminal with sample text to preview color themes
 */
export function TerminalPreview({ theme, fontSize = 12, fontFamily }: TerminalPreviewProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const terminal = new Terminal({
      rows: 8,
      cols: 50,
      fontSize,
      fontFamily: fontFamily || 'monospace',
      theme: {
        background: theme.background,
        foreground: theme.foreground,
        cursor: theme.cursor,
        cursorAccent: theme.cursorAccent,
        selectionBackground: theme.selectionBackground,
        black: theme.black,
        red: theme.red,
        green: theme.green,
        yellow: theme.yellow,
        blue: theme.blue,
        magenta: theme.magenta,
        cyan: theme.cyan,
        white: theme.white,
        brightBlack: theme.brightBlack,
        brightRed: theme.brightRed,
        brightGreen: theme.brightGreen,
        brightYellow: theme.brightYellow,
        brightBlue: theme.brightBlue,
        brightMagenta: theme.brightMagenta,
        brightCyan: theme.brightCyan,
        brightWhite: theme.brightWhite,
      },
      cursorBlink: false,
      disableStdin: true,
      allowTransparency: false,
    });

    terminal.open(terminalRef.current);

    // Write sample text with ANSI colors
    terminal.writeln('$ \x1b[1;32mls\x1b[0m -la');
    terminal.writeln('\x1b[34mdrwxr-xr-x\x1b[0m  user  \x1b[36mDocuments\x1b[0m');
    terminal.writeln('\x1b[34mdrwxr-xr-x\x1b[0m  user  \x1b[36mDownloads\x1b[0m');
    terminal.writeln('$ \x1b[1;32mecho\x1b[0m \x1b[33m"Hello, World!"\x1b[0m');
    terminal.writeln('\x1b[33mHello, World!\x1b[0m');
    terminal.writeln('$ \x1b[1;32mgit\x1b[0m status');
    terminal.writeln('\x1b[32mOn branch main\x1b[0m');
    terminal.write('$ ');

    xtermRef.current = terminal;

    return () => {
      terminal.dispose();
      xtermRef.current = null;
    };
  }, [theme, fontSize, fontFamily]);

  return (
    <div
      className="rounded-md border border-border overflow-hidden"
      style={{ backgroundColor: theme.background }}
    >
      <div ref={terminalRef} className="p-2" />
    </div>
  );
}
