// PTY communication interfaces between Rust backend and frontend

// PTY creation response
export interface CreatePtyResponse {
  pty_id: string; // PTY session ID (UUID)
  pid: number; // Shell process PID
  shell: string; // Actual shell path executed
}

// PTY output event payload
export interface PtyOutputEvent {
  pty_id: string;
  data: string; // Terminal output (with ANSI escape sequences)
}

// PTY exit event payload
export interface PtyExitEvent {
  pty_id: string;
  exit_code: number; // Exit code (0 = success)
}
