/**
 * Terminal event system for cross-component communication
 * Allows CommandPalette and other components to trigger terminal actions
 * without direct terminal instance references
 */

export const TERMINAL_EVENTS = {
  CLEAR: 'terminal:clear',
  SELECT_ALL: 'terminal:select-all',
  COPY: 'terminal:copy',
  PASTE: 'terminal:paste',
  UPDATE_FONT_SIZE: 'terminal:update-font-size',
} as const;

export type TerminalEventType = (typeof TERMINAL_EVENTS)[keyof typeof TERMINAL_EVENTS];

export interface TerminalEventDetail {
  [TERMINAL_EVENTS.PASTE]: { text: string };
  [TERMINAL_EVENTS.UPDATE_FONT_SIZE]: { fontSize: number };
  [TERMINAL_EVENTS.CLEAR]: undefined;
  [TERMINAL_EVENTS.SELECT_ALL]: undefined;
  [TERMINAL_EVENTS.COPY]: undefined;
}

/**
 * Emit a terminal event
 * @param event - Event type from TERMINAL_EVENTS
 * @param detail - Optional event data
 */
export function emitTerminalEvent<T extends TerminalEventType>(
  event: T,
  detail?: TerminalEventDetail[T]
): void {
  window.dispatchEvent(
    new CustomEvent(event, {
      detail,
      bubbles: false,
      cancelable: false,
    })
  );
}

/**
 * Listen to terminal events
 * @param event - Event type to listen for
 * @param handler - Event handler function
 * @returns Cleanup function to remove listener
 */
export function listenTerminalEvent<T extends TerminalEventType>(
  event: T,
  handler: (detail: TerminalEventDetail[T]) => void
): () => void {
  const listener = ((e: CustomEvent<TerminalEventDetail[T]>) => {
    handler(e.detail);
  }) as EventListener;

  window.addEventListener(event, listener);

  return () => {
    window.removeEventListener(event, listener);
  };
}
