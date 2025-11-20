# SFTP Implementation Redesign Plan

## Executive Summary

Complete redesign of SFTP feature to match traditional FTP client behavior with dual-panel interface (local files left, remote files right) and proper credential management.

**Current Status**: Phases 1-6 completed but with fundamental design flaws
**Target**: Traditional dual-panel SFTP client experience


---

## 2. Target Architecture

### 2.1 UI Structure

```
┌─────────────────────────────────────────────────────────────┐
│  SFTP Toolbar (refresh, upload, download, sync, etc.)       │
├──────────────────────────┬──────────────────────────────────┤
│  Local Files (Left)      │  Remote Files (Right)            │
│                          │                                  │
│  📁 /home/user/          │  📁 /home/remote-user/          │
│  ├─ 📁 Documents/        │  ├─ 📁 Documents/               │
│  ├─ 📁 Downloads/        │  ├─ 📁 Projects/                │
│  ├─ 📄 file1.txt         │  ├─ 📄 config.txt               │
│  └─ 📄 file2.pdf         │  └─ 📄 readme.md                │
│                          │                                  │
│  [Path Breadcrumb]       │  [Path Breadcrumb]              │
│  [Action Buttons]        │  [Action Buttons]               │
│                          │                                  │
│  Drag & Drop →           │  ← Drag & Drop                  │
│                          │                                  │
├──────────────────────────┴──────────────────────────────────┤
│  Transfer Queue Panel (downloads/uploads in progress)       │
│  ⬇ downloading file1.txt (45%) █████░░░░░ 2.3 MB/s         │
│  ⬆ uploading file2.pdf (78%)   ████████░░ 1.8 MB/s         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Component Hierarchy

```
SftpBrowser (Container)
├── SftpToolbar
│   ├── Refresh button
│   ├── Upload button (from local selected)
│   ├── Download button (from remote selected)
│   ├── Sync button
│   ├── Delete button
│   └── New folder button
│
├── DualPanelLayout
│   ├── LocalFilePanel
│   │   ├── PathBreadcrumb
│   │   ├── FileList (local)
│   │   ├── ContextMenu
│   │   └── ActionButtons
│   │
│   └── RemoteFilePanel
│       ├── PathBreadcrumb
│       ├── FileList (remote)
│       ├── ContextMenu
│       └── ActionButtons
│
├── TransferPanel
│   ├── Active transfers
│   └── Completed transfers
│
└── Dialogs
    ├── NewFolderDialog
    ├── RenameDialog
    ├── DeleteConfirmDialog
    └── ConflictResolveDialog
```

---

## 3. Authentication & Credential Flow

### 3.1 Credential Storage (Match SSH Behavior)

**SftpConnectionDialog must save credentials to keyring:**

```typescript
// When user saves SFTP profile:
const profileId = generateId();
const profile: ConnectionProfile = {
  id: profileId,
  type: 'sftp',
  name,
  config: {
    host,
    port,
    username,
    // NO PASSWORD/KEY STORED HERE
  },
  savedAuthType: authMethod, // 'password' | 'privateKey' | 'passphrase' | 'none'
};

// Save to keyring based on auth method:
if (authMethod === 'password') {
  await saveCredential(profileId, password);

} else if (authMethod === 'privateKey') {
  await saveCredential(`${profileId}_key`, privateKeyPath);

} else if (authMethod === 'passphrase') {
  await saveCredential(`${profileId}_key`, privateKeyPath);
  await saveCredential(`${profileId}_passphrase`, passphrase);

} else if (authMethod === 'none') {
  // No credentials to save - interactive auth
}

// Then save profile
await addProfile(profile);
```

### 3.2 Credential Restoration (Already Implemented)

**SftpBrowser restores from keyring on mount:**

```typescript
useEffect(() => {
  const initSession = async () => {
    const profile = getProfileById(profileId);

    // Restore from keyring
    let password, privateKey, passphrase;

    if (profile.savedAuthType === 'password') {
      password = await getCredential(profileId);
    } else if (profile.savedAuthType === 'privateKey' || profile.savedAuthType === 'passphrase') {
      privateKey = await getCredential(`${profileId}_key`);
      if (profile.savedAuthType === 'passphrase') {
        passphrase = await getCredential(`${profileId}_passphrase`);
      }
    }
    // else: savedAuthType === 'none' - no credentials

    await connect({ host, port, username, password, privateKey, passphrase });
  };

  initSession();
}, [profileId]);
```

### 3.3 Authentication Options

**Support same options as SSH:**

1. **Password** - Traditional password authentication
2. **Private Key** - SSH key file (no passphrase)
3. **Private Key + Passphrase** - Encrypted SSH key
4. **None/Interactive** - No credentials (keyboard-interactive, agent, etc.)

---

## 4. Connection Flow

### 4.1 From Home Component

**When user clicks SFTP connection card:**

```typescript
// src/components/home/Home.tsx

const handleConnectionCardClick = (profile: ConnectionProfile) => {
  if (profile.type === 'ssh') {
    openSshTerminal(profile.id);

  } else if (profile.type === 'sftp') {
    openSftpBrowser(profile.id);  // ← ADD THIS
  }
};

const openSftpBrowser = (profileId: string) => {
  addTab({
    type: 'sftp',
    connectionType: 'sftp',
    connectionProfileId: profileId,
    title: `SFTP: ${profile.name}`,
  });
};
```

### 4.2 From Connection Dialog

**New SFTP connection from menu/palette:**

```typescript
// src/components/sftp/SftpConnectionDialog.tsx

const handleConnect = async () => {
  // 1. Generate profile ID
  const profileId = generateId();

  // 2. Save credentials to keyring
  if (authMethod === 'password') {
    await saveCredential(profileId, password);
  } else if (authMethod === 'privateKey') {
    await saveCredential(`${profileId}_key`, privateKeyPath);
    if (passphrase) {
      await saveCredential(`${profileId}_passphrase`, passphrase);
    }
  }
  // else: no credentials for 'none' auth

  // 3. Save profile (without credentials)
  await addProfile({
    id: profileId,
    type: 'sftp',
    name,
    config: { host, port, username },
    savedAuthType: authMethod,
  });

  // 4. Open SFTP tab
  addTab({
    type: 'sftp',
    connectionType: 'sftp',
    connectionProfileId: profileId,
    title: `SFTP: ${name}`,
  });

  // 5. Close dialog
  onClose();
};
```

---

## 5. Local File System Access

### 5.1 Backend Requirements

**Need new Tauri commands for local file operations:**

```rust
// src-tauri/src/commands/fs_commands.rs

#[tauri::command]
pub async fn list_local_directory(path: String) -> Result<Vec<FileEntry>, String> {
    // Read local directory using std::fs
}

#[tauri::command]
pub async fn get_local_home_directory() -> Result<String, String> {
    // Return user's home directory path
}

#[tauri::command]
pub async fn get_local_file_info(path: String) -> Result<FileEntry, String> {
    // Get file metadata (size, modified time, permissions)
}

#[tauri::command]
pub async fn create_local_directory(path: String) -> Result<(), String> {
    // Create directory locally
}

#[tauri::command]
pub async fn delete_local_path(path: String) -> Result<(), String> {
    // Delete file or directory
}

#[tauri::command]
pub async fn rename_local_path(old_path: String, new_path: String) -> Result<(), String> {
    // Rename/move file or directory
}
```

### 5.2 Tauri Permissions

**Update capabilities to allow file system access:**

```json
// src-tauri/capabilities/default.json

{
  "permissions": [
    "core:default",
    "core:path:default",
    "core:path:allow-home-dir",
    "core:path:allow-app-config-dir",
    "fs:allow-read-dir",
    "fs:allow-read-file",
    "fs:allow-write-file",
    "fs:allow-create",
    "fs:allow-remove",
    "fs:allow-rename",
    "fs:allow-exists"
  ]
}
```

### 5.3 Frontend Hook

**Create useLocalFs hook:**

```typescript
// src/hooks/use-local-fs.ts

export function useLocalFs() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listDirectory = async (path: string) => {
    setIsLoading(true);
    try {
      const entries = await invoke<FileEntry[]>('list_local_directory', { path });
      setFiles(entries);
      setCurrentPath(path);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateHome = async () => {
    const homePath = await invoke<string>('get_local_home_directory');
    await listDirectory(homePath);
  };

  // ... other operations (createDirectory, deleteItem, rename)

  return {
    currentPath,
    files,
    isLoading,
    error,
    listDirectory,
    navigateHome,
    // ... other operations
  };
}
```

---

## 6. File Transfer Operations

### 6.1 Transfer Directions

**Support bidirectional transfers:**

1. **Upload**: Local → Remote (drag from left to right)
2. **Download**: Remote → Local (drag from right to left)
3. **Sync**: Synchronize directories between local and remote

### 6.2 Transfer State Management

**Extend existing useSftpStore:**

```typescript
// src/stores/use-sftp-store.ts

export interface FileTransfer {
  transferId: string;
  sessionId: string;
  direction: 'upload' | 'download';  // ADD THIS
  sourcePath: string;
  destinationPath: string;
  fileName: string;
  fileSize: number;
  bytesTransferred: number;
  progress: number;
  speed: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  error?: string;
  startedAt?: number;
  completedAt?: number;
}
```

### 6.3 Drag & Drop

**Implement drag-and-drop transfer:**

```typescript
// LocalFilePanel.tsx
const handleDragStart = (file: FileEntry) => {
  // Store file info in drag data
  event.dataTransfer.setData('source', 'local');
  event.dataTransfer.setData('path', joinPath(currentPath, file.name));
};

// RemoteFilePanel.tsx
const handleDrop = async (event: DragEvent) => {
  const source = event.dataTransfer.getData('source');
  const sourcePath = event.dataTransfer.getData('path');

  if (source === 'local') {
    // Upload: local → remote
    const fileName = sourcePath.split('/').pop();
    const remotePath = joinPath(currentPath, fileName);
    await uploadFile(sourcePath, remotePath);
  }
};
```

---

## 7. Component Implementation Details

### 7.1 LocalFilePanel

**New component for local file browsing:**

```typescript
// src/components/sftp/LocalFilePanel.tsx

interface LocalFilePanelProps {
  sessionId: string;
  onFileSelect?: (file: FileEntry) => void;
  onTransferRequest?: (localPath: string, fileName: string) => void;
}

export function LocalFilePanel({ sessionId, onFileSelect, onTransferRequest }: LocalFilePanelProps) {
  const {
    currentPath,
    files,
    isLoading,
    error,
    listDirectory,
    navigateHome,
    createDirectory,
    deleteItem,
    renameItem,
  } = useLocalFs();

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    navigateHome(); // Initialize to home directory
  }, []);

  const handleFileDoubleClick = (file: FileEntry) => {
    if (file.isDir) {
      listDirectory(joinPath(currentPath, file.name));
    } else {
      onFileSelect?.(file);
    }
  };

  const handleDragStart = (file: FileEntry) => {
    // Prepare drag data for upload
  };

  return (
    <div className="flex flex-col h-full border-r">
      <div className="px-4 py-2 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">Local Files</h3>
      </div>

      <PathBreadcrumb
        currentPath={currentPath}
        onNavigate={listDirectory}
      />

      <div className="flex-1 overflow-auto">
        <FileList
          files={files}
          selectedFiles={selectedFiles}
          isLoading={isLoading}
          onFileClick={(name) => {
            setSelectedFiles(new Set([name]));
          }}
          onFileDoubleClick={handleFileDoubleClick}
          onDragStart={handleDragStart}
        />
      </div>

      <div className="px-4 py-2 border-t text-xs text-muted-foreground">
        {files.length} items • {selectedFiles.size} selected
      </div>
    </div>
  );
}
```

### 7.2 RemoteFilePanel

**Updated remote file panel with drop support:**

```typescript
// src/components/sftp/RemoteFilePanel.tsx

interface RemoteFilePanelProps {
  sessionId: string;
  onFileSelect?: (file: FileEntry) => void;
}

export function RemoteFilePanel({ sessionId, onFileSelect }: RemoteFilePanelProps) {
  const {
    currentPath,
    files,
    selectedFiles,
    isLoading,
    error,
    navigateToDirectory,
    refresh,
    toggleSelection,
    uploadFile,
    downloadFile,
    createDirectory,
    deleteItems,
    renameItem,
  } = useSftp({ sessionId });

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const source = event.dataTransfer.getData('source');

    if (source === 'local') {
      const localPath = event.dataTransfer.getData('path');
      const fileName = localPath.split(/[/\\]/).pop() || 'unknown';
      const remotePath = joinPath(currentPath, fileName);

      await uploadFile(localPath, remotePath);
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="px-4 py-2 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">Remote Files</h3>
      </div>

      <PathBreadcrumb
        currentPath={currentPath}
        onNavigate={navigateToDirectory}
      />

      <div className="flex-1 overflow-auto">
        {error ? (
          <ErrorDisplay error={error} onRetry={refresh} />
        ) : (
          <FileList
            files={files}
            selectedFiles={selectedFiles}
            isLoading={isLoading}
            onFileClick={toggleSelection}
            onFileDoubleClick={(file) => {
              if (file.isDir) {
                navigateToDirectory(joinPath(currentPath, file.name));
              }
            }}
          />
        )}
      </div>

      <div className="px-4 py-2 border-t text-xs text-muted-foreground">
        {files.length} items • {selectedFiles.size} selected
      </div>
    </div>
  );
}
```

### 7.3 DualPanelLayout

**Container for both panels:**

```typescript
// src/components/sftp/DualPanelLayout.tsx

interface DualPanelLayoutProps {
  sessionId: string;
}

export function DualPanelLayout({ sessionId }: DualPanelLayoutProps) {
  return (
    <div className="flex h-full">
      <div className="w-1/2">
        <LocalFilePanel sessionId={sessionId} />
      </div>

      <div className="w-1/2">
        <RemoteFilePanel sessionId={sessionId} />
      </div>
    </div>
  );
}
```

### 7.4 Updated SftpBrowser

**Main container with new layout:**

```typescript
// src/components/sftp/SftpBrowser.tsx

export function SftpBrowser({ sessionId, profileId }: SftpBrowserProps) {
  const profile = getProfileById(profileId);

  // ... credential restoration logic (already implemented)

  return (
    <div className="flex flex-col h-full bg-background">
      <SftpToolbar
        sessionId={sessionId}
        onRefresh={refresh}
        onUpload={handleUpload}
        onDownload={handleDownload}
        onSync={handleSync}
        disabled={isLoading}
      />

      {isConnecting ? (
        <LoadingScreen config={profile.config} />
      ) : error ? (
        <ErrorScreen error={error} onRetry={refresh} />
      ) : (
        <>
          <DualPanelLayout sessionId={sessionId} />
          <TransferPanel sessionId={sessionId} />
        </>
      )}
    </div>
  );
}
```

---

## 8. Implementation Phases

### Phase 1: Fix Critical Bugs ✅ COMPLETED

- [x] Fix TransferPanel infinite render loop
- [x] Add Tauri event.unlisten permission
- [x] Add loading screen during connection
- [x] Fix credential restoration in SftpBrowser

### Phase 2: Fix Credential Management 🔄 IN PROGRESS

**Priority: CRITICAL**

**Files to modify:**
- `src/components/sftp/SftpConnectionDialog.tsx`
- `src/types/connection.ts`
- `src/lib/keyring.ts`

**Tasks:**
1. Add credential saving to keyring in `handleConnect` method
2. Support 'none' authentication type (like SSH)
3. Update profile creation to match SSH behavior
4. Test credential save/restore flow

**Expected outcome**: Credentials persist across sessions, authentication succeeds

### Phase 3: Local File System Support

**Priority: HIGH**

**New files:**
- `src-tauri/src/commands/fs_commands.rs`
- `src/hooks/use-local-fs.ts`
- `src/components/sftp/LocalFilePanel.tsx`

**Tasks:**
1. Implement Tauri commands for local file operations
2. Add file system permissions to capabilities
3. Create useLocalFs hook
4. Build LocalFilePanel component
5. Test local directory navigation and file operations

**Expected outcome**: Local file browser working independently

### Phase 4: Dual Panel UI Restructure

**Priority: HIGH**

**Files to modify:**
- `src/components/sftp/SftpBrowser.tsx`
- `src/components/sftp/RemoteFilePanel.tsx` (refactor from current implementation)

**New files:**
- `src/components/sftp/DualPanelLayout.tsx`

**Tasks:**
1. Extract current SftpBrowser remote logic to RemoteFilePanel
2. Create DualPanelLayout container
3. Update SftpBrowser to use DualPanelLayout
4. Update SftpToolbar to work with both panels
5. Style adjustments for side-by-side layout

**Expected outcome**: Dual-panel UI showing local (left) and remote (right)

### Phase 5: Drag & Drop Transfer

**Priority: MEDIUM**

**Files to modify:**
- `src/components/sftp/LocalFilePanel.tsx`
- `src/components/sftp/RemoteFilePanel.tsx`
- `src/hooks/use-sftp.ts`
- `src/stores/use-sftp-store.ts`

**Tasks:**
1. Implement drag handlers in LocalFilePanel
2. Implement drop handlers in RemoteFilePanel
3. Add transfer direction to FileTransfer type
4. Update TransferPanel to show direction icons
5. Test drag-and-drop upload/download

**Expected outcome**: Users can drag files between panels to transfer

### Phase 6: Home Integration

**Priority: MEDIUM**

**Files to modify:**
- `src/components/home/Home.tsx`
- `src/stores/use-tab-store.ts`

**Tasks:**
1. Update `handleConnectionCardClick` to detect SFTP profiles
2. Create `openSftpBrowser` function
3. Add SFTP tab type handling in TabStore
4. Test clicking SFTP cards opens SFTP browser

**Expected outcome**: SFTP connection cards open SFTP tabs when clicked

### Phase 7: Advanced Features

**Priority: LOW**

**New files:**
- `src/components/sftp/SyncDialog.tsx`
- `src/components/sftp/ConflictResolveDialog.tsx`

**Tasks:**
1. Implement bidirectional sync
2. Add conflict resolution UI
3. Batch transfer support
4. Transfer queue management (pause/resume/cancel)
5. Transfer history and logs

**Expected outcome**: Full-featured SFTP client capabilities

---

## 9. File Organization

### New Files to Create

```
src/
├── components/
│   └── sftp/
│       ├── DualPanelLayout.tsx          # NEW - Container for both panels
│       ├── LocalFilePanel.tsx           # NEW - Local file browser
│       ├── RemoteFilePanel.tsx          # NEW - Remote file browser (refactor)
│       ├── SyncDialog.tsx               # NEW - Sync configuration
│       └── ConflictResolveDialog.tsx    # NEW - File conflict resolution
│
├── hooks/
│   └── use-local-fs.ts                  # NEW - Local file system operations
│
└── src-tauri/
    └── src/
        └── commands/
            └── fs_commands.rs           # NEW - Local file system Tauri commands
```

### Files to Modify

```
src/
├── components/
│   ├── sftp/
│   │   ├── SftpBrowser.tsx              # MODIFY - Use DualPanelLayout
│   │   ├── SftpConnectionDialog.tsx     # MODIFY - Add keyring saving
│   │   ├── SftpToolbar.tsx              # MODIFY - Add sync/download buttons
│   │   └── TransferPanel.tsx            # MODIFY - Show transfer direction
│   │
│   └── home/
│       └── Home.tsx                     # MODIFY - Handle SFTP card clicks
│
├── stores/
│   └── use-sftp-store.ts                # MODIFY - Add transfer direction
│
├── hooks/
│   └── use-sftp.ts                      # MODIFY - Support bidirectional transfer
│
├── types/
│   └── connection.ts                    # MODIFY - Add 'none' auth type
│
└── src-tauri/
    ├── capabilities/
    │   └── default.json                 # MODIFY - Add fs permissions
    │
    └── src/
        └── main.rs                      # MODIFY - Register fs_commands
```

---

## 10. Testing Checklist

### Phase 2: Credential Management
- [ ] Password auth saved to keyring
- [ ] Private key auth saved to keyring
- [ ] Passphrase auth saved to keyring
- [ ] None/interactive auth works without credentials
- [ ] Credentials restored on reconnect
- [ ] Edit profile preserves credentials
- [ ] Delete profile removes credentials

### Phase 3: Local File System
- [ ] List home directory on mount
- [ ] Navigate into subdirectories
- [ ] Navigate up/back with breadcrumbs
- [ ] Create new folder
- [ ] Rename file/folder
- [ ] Delete file/folder
- [ ] Show file size and modified date
- [ ] Handle permission errors gracefully

### Phase 4: Dual Panel UI
- [ ] Both panels visible side-by-side
- [ ] Independent navigation in each panel
- [ ] Selection works independently
- [ ] Toolbar buttons work with both panels
- [ ] Responsive layout (resize handles?)

### Phase 5: Drag & Drop
- [ ] Drag from local to remote uploads
- [ ] Drag from remote to local downloads
- [ ] Visual feedback during drag
- [ ] Progress shown in TransferPanel
- [ ] Handle errors (permissions, space, etc.)
- [ ] Support multiple file selection

### Phase 6: Home Integration
- [ ] Click SSH card opens SSH terminal
- [ ] Click SFTP card opens SFTP browser
- [ ] Correct profile credentials loaded
- [ ] Tab title shows connection name

---

## 11. Open Questions

1. **Resize Panels**: Should users be able to resize the local/remote panels? (Add draggable divider?)

2. **Transfer Conflicts**: How to handle file already exists? (Overwrite/Skip/Rename/Ask)

3. **Batch Operations**: Support multi-select drag-and-drop? (Yes, but Phase 7)

4. **Transfer Resume**: Support resuming interrupted transfers? (Phase 7)

5. **Bookmarks**: Should users be able to bookmark frequently used directories? (Phase 7)

---

## 12. Success Criteria

### Must Have (MVP)
- ✅ Dual-panel UI (local left, remote right)
- ✅ Credential management working (saved to keyring)
- ✅ Interactive/none auth support
- ✅ Drag-and-drop file transfer (both directions)
- ✅ Basic file operations (create folder, rename, delete)
- ✅ Transfer progress indication
- ✅ Home integration (SFTP cards work)

### Should Have (V2)
- Directory synchronization
- Conflict resolution
- Transfer queue management (pause/resume/cancel)
- Batch operations
- Transfer history

### Nice to Have (Future)
- Resizable panels
- Directory bookmarks
- Transfer resume
- File preview
- Syntax highlighting for text files

---

## 13. Dependencies

### No New Dependencies Required

All required functionality available in existing dependencies:
- Tauri 2: File system API, IPC
- React: UI components, hooks
- Zustand: State management
- xterm.js: Not needed for SFTP
- Radix UI + Tailwind: Styling
- Rust std::fs: Local file operations
- ssh2: Remote file operations (already used)

---

## 14. Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1 | Critical bugs | ✅ DONE |
| Phase 2 | Credential management | 2-3 hours |
| Phase 3 | Local file system | 4-6 hours |
| Phase 4 | Dual panel UI | 3-4 hours |
| Phase 5 | Drag & drop | 3-4 hours |
| Phase 6 | Home integration | 1-2 hours |
| Phase 7 | Advanced features | 8-12 hours |
| **Total** | | **21-31 hours** |

---

## 15. Next Steps

**Immediate Priority: Phase 2 - Fix Credential Management**

This is the blocker preventing the current implementation from working at all. Once credentials are properly saved and restored, users can at least use the current single-panel UI while we build the dual-panel experience.

**Step-by-step:**
1. Fix `SftpConnectionDialog.tsx` to save credentials to keyring
2. Add 'none' authentication option
3. Test full connection flow (save → close → reopen → connect)
4. Commit: "fix(sftp): implement keyring credential management and none auth"

Then proceed to Phase 3 (local file system) and Phase 4 (dual panel UI) in parallel or sequence.

---

**Document Version**: 1.0
**Created**: 2025-11-20
**Status**: Awaiting approval to begin Phase 2
