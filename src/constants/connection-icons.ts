import { Lock, type LucideIcon, Monitor } from 'lucide-react';
import type { ConnectionType } from '@/types/connection';

/**
 * Connection type icon mapping
 * Maps each connection type to its corresponding Lucide icon
 */
export const CONNECTION_ICONS: Record<ConnectionType, LucideIcon> = {
  local: Monitor,
  ssh: Lock,
} as const;

/**
 * Connection type label mapping
 * User-friendly labels for each connection type
 */
export const CONNECTION_LABELS: Record<ConnectionType, string> = {
  local: 'Local Terminal',
  ssh: 'SSH',
} as const;

/**
 * Helper function to get icon component for a connection type
 */
export function getConnectionIcon(type: ConnectionType): LucideIcon {
  return CONNECTION_ICONS[type];
}

/**
 * Helper function to get label for a connection type
 */
export function getConnectionLabel(type: ConnectionType): string {
  return CONNECTION_LABELS[type];
}
