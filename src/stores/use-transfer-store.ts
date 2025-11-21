import { create } from 'zustand';
import type { FileTransfer } from '@/types/sftp';

/**
 * Transfer Store
 * Manages file transfer queue and status
 */
interface TransferStore {
  // State
  transfers: FileTransfer[];

  // Actions
  addTransfer: (transfer: Omit<FileTransfer, 'id' | 'startTime'>) => string;
  updateTransfer: (id: string, updates: Partial<FileTransfer>) => void;
  removeTransfer: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  getTransfer: (id: string) => FileTransfer | undefined;
}

export const useTransferStore = create<TransferStore>((set, get) => ({
  transfers: [],

  /**
   * Add a new transfer to the queue
   * Returns the transfer ID
   */
  addTransfer: (transfer) => {
    const id = crypto.randomUUID();
    const newTransfer: FileTransfer = {
      ...transfer,
      id,
      startTime: Date.now(),
    };

    set((state) => ({
      transfers: [...state.transfers, newTransfer],
    }));

    return id;
  },

  /**
   * Update an existing transfer
   */
  updateTransfer: (id, updates) =>
    set((state) => ({
      transfers: state.transfers.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  /**
   * Remove a transfer from the queue
   */
  removeTransfer: (id) =>
    set((state) => ({
      transfers: state.transfers.filter((t) => t.id !== id),
    })),

  /**
   * Clear all completed transfers
   */
  clearCompleted: () =>
    set((state) => ({
      transfers: state.transfers.filter((t) => t.status !== 'completed'),
    })),

  /**
   * Clear all transfers
   */
  clearAll: () => set({ transfers: [] }),

  /**
   * Get a specific transfer by ID
   */
  getTransfer: (id) => {
    return get().transfers.find((t) => t.id === id);
  },
}));
