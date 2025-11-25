import { create } from 'zustand';
import type { FileInfo, TransferItem } from '@/types/sftp';

/**
 * 패널 상태 (로컬 또는 원격)
 */
interface PanelState {
  currentPath: string;
  files: FileInfo[];
  selectedFiles: Set<string>; // file paths
  lastSelectedIndex: number | null; // Index of last selected file for range selection
  loading: boolean;
  error: string | null;
}

/**
 * SFTP 세션별 상태
 */
interface SessionState {
  tabId: string;
  sessionId: string; // Backend SFTP session ID
  localPanel: PanelState;
  remotePanel: PanelState;
}

/**
 * SFTP Store 상태 및 액션
 */
interface SftpStore {
  // 상태
  sessions: Record<string, SessionState>; // tabId -> SessionState
  transferQueue: TransferItem[];

  // 세션 관리
  initSession: (tabId: string, sessionId: string, localHome: string, remoteHome: string) => void;
  removeSession: (tabId: string) => void;
  getSession: (tabId: string) => SessionState | undefined;

  // 로컬 패널 상태
  setLocalPath: (tabId: string, path: string) => void;
  setLocalFiles: (tabId: string, files: FileInfo[]) => void;
  setLocalLoading: (tabId: string, loading: boolean) => void;
  setLocalError: (tabId: string, error: string | null) => void;
  toggleLocalFileSelection: (tabId: string, filePath: string, multiSelect?: boolean) => void;
  selectLocalFileRange: (tabId: string, startIndex: number, endIndex: number) => void;
  clearLocalSelection: (tabId: string) => void;
  getLocalSelectedFiles: (tabId: string) => string[];

  // 원격 패널 상태
  setRemotePath: (tabId: string, path: string) => void;
  setRemoteFiles: (tabId: string, files: FileInfo[]) => void;
  setRemoteLoading: (tabId: string, loading: boolean) => void;
  setRemoteError: (tabId: string, error: string | null) => void;
  toggleRemoteFileSelection: (tabId: string, filePath: string, multiSelect?: boolean) => void;
  selectRemoteFileRange: (tabId: string, startIndex: number, endIndex: number) => void;
  clearRemoteSelection: (tabId: string) => void;
  getRemoteSelectedFiles: (tabId: string) => string[];

  // 전송 큐 관리
  addTransfer: (item: TransferItem) => void;
  updateTransferProgress: (transferId: string, bytes: number, totalBytes: number) => void;
  updateTransferStatus: (
    transferId: string,
    status: TransferItem['status'],
    error?: string
  ) => void;
  removeTransfer: (transferId: string) => void;
  clearCompletedTransfers: () => void;
}

export const useSftpStore = create<SftpStore>((set, get) => ({
  sessions: {},
  transferQueue: [],

  // 세션 관리
  initSession: (tabId, sessionId, localHome, remoteHome) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [tabId]: {
          tabId,
          sessionId,
          localPanel: {
            currentPath: localHome,
            files: [],
            selectedFiles: new Set(),
            lastSelectedIndex: null,
            loading: false,
            error: null,
          },
          remotePanel: {
            currentPath: remoteHome,
            files: [],
            selectedFiles: new Set(),
            lastSelectedIndex: null,
            loading: false,
            error: null,
          },
        },
      },
    })),

  removeSession: (tabId) =>
    set((state) => {
      const { [tabId]: removed, ...rest } = state.sessions;
      return { sessions: rest };
    }),

  getSession: (tabId) => get().sessions[tabId],

  // 로컬 패널 상태
  setLocalPath: (tabId, path) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            localPanel: {
              ...session.localPanel,
              currentPath: path,
            },
          },
        },
      };
    }),

  setLocalFiles: (tabId, files) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            localPanel: {
              ...session.localPanel,
              files,
            },
          },
        },
      };
    }),

  setLocalLoading: (tabId, loading) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            localPanel: {
              ...session.localPanel,
              loading,
            },
          },
        },
      };
    }),

  setLocalError: (tabId, error) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            localPanel: {
              ...session.localPanel,
              error,
            },
          },
        },
      };
    }),

  toggleLocalFileSelection: (tabId, filePath, multiSelect = false) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;

      const selectedFiles = new Set(session.localPanel.selectedFiles);
      const fileIndex = session.localPanel.files.findIndex((f) => f.path === filePath);

      if (!multiSelect) {
        // 단일 선택 모드
        if (selectedFiles.has(filePath)) {
          selectedFiles.delete(filePath);
        } else {
          selectedFiles.clear();
          selectedFiles.add(filePath);
        }
      } else {
        // 다중 선택 모드 (Ctrl+Click)
        if (selectedFiles.has(filePath)) {
          selectedFiles.delete(filePath);
        } else {
          selectedFiles.add(filePath);
        }
      }

      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            localPanel: {
              ...session.localPanel,
              selectedFiles,
              lastSelectedIndex: fileIndex >= 0 ? fileIndex : session.localPanel.lastSelectedIndex,
            },
          },
        },
      };
    }),

  selectLocalFileRange: (tabId, startIndex, endIndex) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;

      const files = session.localPanel.files;
      const selectedFiles = new Set(session.localPanel.selectedFiles);

      // Select all files in range
      const minIndex = Math.min(startIndex, endIndex);
      const maxIndex = Math.max(startIndex, endIndex);

      for (let i = minIndex; i <= maxIndex; i++) {
        if (i >= 0 && i < files.length) {
          selectedFiles.add(files[i].path);
        }
      }

      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            localPanel: {
              ...session.localPanel,
              selectedFiles,
              lastSelectedIndex: endIndex,
            },
          },
        },
      };
    }),

  clearLocalSelection: (tabId) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            localPanel: {
              ...session.localPanel,
              selectedFiles: new Set(),
              lastSelectedIndex: null,
            },
          },
        },
      };
    }),

  getLocalSelectedFiles: (tabId) => {
    const session = get().sessions[tabId];
    return session ? Array.from(session.localPanel.selectedFiles) : [];
  },

  // 원격 패널 상태 (로컬과 동일한 패턴)
  setRemotePath: (tabId, path) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            remotePanel: {
              ...session.remotePanel,
              currentPath: path,
            },
          },
        },
      };
    }),

  setRemoteFiles: (tabId, files) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            remotePanel: {
              ...session.remotePanel,
              files,
            },
          },
        },
      };
    }),

  setRemoteLoading: (tabId, loading) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            remotePanel: {
              ...session.remotePanel,
              loading,
            },
          },
        },
      };
    }),

  setRemoteError: (tabId, error) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            remotePanel: {
              ...session.remotePanel,
              error,
            },
          },
        },
      };
    }),

  toggleRemoteFileSelection: (tabId, filePath, multiSelect = false) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;

      const selectedFiles = new Set(session.remotePanel.selectedFiles);
      const fileIndex = session.remotePanel.files.findIndex((f) => f.path === filePath);

      if (!multiSelect) {
        if (selectedFiles.has(filePath)) {
          selectedFiles.delete(filePath);
        } else {
          selectedFiles.clear();
          selectedFiles.add(filePath);
        }
      } else {
        if (selectedFiles.has(filePath)) {
          selectedFiles.delete(filePath);
        } else {
          selectedFiles.add(filePath);
        }
      }

      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            remotePanel: {
              ...session.remotePanel,
              selectedFiles,
              lastSelectedIndex: fileIndex >= 0 ? fileIndex : session.remotePanel.lastSelectedIndex,
            },
          },
        },
      };
    }),

  selectRemoteFileRange: (tabId, startIndex, endIndex) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;

      const files = session.remotePanel.files;
      const selectedFiles = new Set(session.remotePanel.selectedFiles);

      // Select all files in range
      const minIndex = Math.min(startIndex, endIndex);
      const maxIndex = Math.max(startIndex, endIndex);

      for (let i = minIndex; i <= maxIndex; i++) {
        if (i >= 0 && i < files.length) {
          selectedFiles.add(files[i].path);
        }
      }

      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            remotePanel: {
              ...session.remotePanel,
              selectedFiles,
              lastSelectedIndex: endIndex,
            },
          },
        },
      };
    }),

  clearRemoteSelection: (tabId) =>
    set((state) => {
      const session = state.sessions[tabId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [tabId]: {
            ...session,
            remotePanel: {
              ...session.remotePanel,
              selectedFiles: new Set(),
              lastSelectedIndex: null,
            },
          },
        },
      };
    }),

  getRemoteSelectedFiles: (tabId) => {
    const session = get().sessions[tabId];
    return session ? Array.from(session.remotePanel.selectedFiles) : [];
  },

  // 전송 큐 관리
  addTransfer: (item) =>
    set((state) => ({
      transferQueue: [...state.transferQueue, item],
    })),

  updateTransferProgress: (transferId, bytes, totalBytes) =>
    set((state) => ({
      transferQueue: state.transferQueue.map((item) =>
        item.id === transferId
          ? {
              ...item,
              progress: {
                bytes,
                totalBytes,
                percentage: Math.round((bytes / totalBytes) * 100),
              },
            }
          : item
      ),
    })),

  updateTransferStatus: (transferId, status, error) =>
    set((state) => ({
      transferQueue: state.transferQueue.map((item) =>
        item.id === transferId
          ? {
              ...item,
              status,
              error,
            }
          : item
      ),
    })),

  removeTransfer: (transferId) =>
    set((state) => ({
      transferQueue: state.transferQueue.filter((item) => item.id !== transferId),
    })),

  clearCompletedTransfers: () =>
    set((state) => ({
      transferQueue: state.transferQueue.filter(
        (item) => item.status !== 'completed' && item.status !== 'failed'
      ),
    })),
}));
