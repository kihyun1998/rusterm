/**
 * IPC (Inter-Process Communication) event type definitions
 * Types for events sent from backend to frontend
 */

/**
 * Payload for tab-created event
 * Emitted when a new tab is created from backend (e.g., via IPC server)
 */
export interface TabCreatedPayload {
  tabId: string;
  title: string;
  tabType: 'local' | 'ssh';
  ptyId?: string;
  sessionId?: string;
}

/**
 * Payload for tab-closed event
 * Emitted when a tab is closed from backend
 */
export interface TabClosedPayload {
  tabId: string;
}
