// PTY communication interfaces between Rust backend and frontend

// PTY creation request parameters
export interface CreatePtyRequest {
  shell?: string;             // Shell path (null = default shell)
  cwd?: string;               // Starting directory (null = home)
  env?: Record<string, string>; // Environment variables
  cols: number;               // Terminal width (columns)
  rows: number;               // Terminal height (rows)
}

// PTY creation response
export interface CreatePtyResponse {
  pty_id: string;             // PTY session ID (UUID)
  pid: number;                // Shell process PID
  shell: string;              // Actual shell path executed
}

// PTY write request
export interface WritePtyRequest {
  pty_id: string;
  data: string;               // User input (keyboard input)
}

// PTY resize request
export interface ResizePtyRequest {
  pty_id: string;
  cols: number;
  rows: number;
}

// PTY output event payload
export interface PtyOutputEvent {
  pty_id: string;
  data: string;               // Terminal output (with ANSI escape sequences)
}

// PTY exit event payload
export interface PtyExitEvent {
  pty_id: string;
  exit_code: number;          // Exit code (0 = success)
}
