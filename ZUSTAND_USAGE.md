# Zustand 상태관리 사용 가이드

## 설치 완료

```bash
pnpm add zustand
```

## 프로젝트 구조

```
src/
  stores/
    index.ts                  # 모든 스토어 export
    use-tab-store.ts         # 탭 관리 스토어
    use-settings-store.ts    # 설정 관리 스토어
```

## 1. 탭 관리 스토어 (useTabStore)

### 기본 사용법

```typescript
import { useTabStore } from '@/stores';

function TabBar() {
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const addTab = useTabStore((state) => state.addTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const closeTab = useTabStore((state) => state.closeTab);

  const handleNewTab = () => {
    addTab({
      id: crypto.randomUUID(),
      title: 'New Terminal',
    });
  };

  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={tab.isActive ? 'active' : ''}
          onClick={() => setActiveTab(tab.id)}
        >
          <span>{tab.title}</span>
          <button onClick={() => closeTab(tab.id)}>×</button>
        </div>
      ))}
      <button onClick={handleNewTab}>+ New Tab</button>
    </div>
  );
}
```

### 선택적 구독 (최적화)

```typescript
// 특정 값만 구독하여 불필요한 리렌더링 방지
const activeTabId = useTabStore((state) => state.activeTabId);

// 여러 값 선택
const { tabs, activeTabId } = useTabStore((state) => ({
  tabs: state.tabs,
  activeTabId: state.activeTabId,
}));
```

### 액션만 사용 (리렌더링 없음)

```typescript
// 컴포넌트가 리렌더링되지 않음
const addTab = useTabStore((state) => state.addTab);
const removeTab = useTabStore((state) => state.removeTab);
```

## 2. 설정 스토어 (useSettingsStore)

### 기본 사용법

```typescript
import { useSettingsStore } from '@/stores';

function TerminalSettings() {
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  return (
    <div>
      <label>
        Font Size:
        <input
          type="number"
          value={settings.fontSize}
          onChange={(e) =>
            updateSettings({ fontSize: parseInt(e.target.value) })
          }
        />
      </label>

      <label>
        Font Family:
        <input
          type="text"
          value={settings.fontFamily}
          onChange={(e) => updateSettings({ fontFamily: e.target.value })}
        />
      </label>
    </div>
  );
}
```

### 테마 업데이트

```typescript
function ThemeSelector() {
  const theme = useSettingsStore((state) => state.settings.theme);
  const updateTheme = useSettingsStore((state) => state.updateTheme);

  const applyDarkTheme = () => {
    updateTheme({
      background: '#1e1e1e',
      foreground: '#cccccc',
    });
  };

  const applyLightTheme = () => {
    updateTheme({
      background: '#ffffff',
      foreground: '#000000',
    });
  };

  return (
    <div>
      <button onClick={applyDarkTheme}>Dark Theme</button>
      <button onClick={applyLightTheme}>Light Theme</button>
    </div>
  );
}
```

### LocalStorage 자동 저장

`useSettingsStore`는 `persist` 미들웨어를 사용하여 자동으로 localStorage에 저장됩니다.
- Key: `rusterm-settings`
- 변경사항이 자동으로 저장되고 복원됩니다.

## 3. 외부에서 스토어 접근 (컴포넌트 외부)

```typescript
import { useTabStore, useSettingsStore } from '@/stores';

// React 컴포넌트 외부에서 사용
function createNewTerminal() {
  const settings = useSettingsStore.getState().settings;

  useTabStore.getState().addTab({
    id: crypto.randomUUID(),
    title: 'Terminal',
  });
}

// 구독 (subscribe)
const unsubscribe = useTabStore.subscribe((state) => {
  console.log('Tabs changed:', state.tabs);
});

// 구독 해제
unsubscribe();
```

## 4. DevTools (선택사항)

개발 중 디버깅을 위해 Zustand DevTools를 사용할 수 있습니다:

```bash
pnpm add -D @redux-devtools/extension
```

스토어 수정:
```typescript
import { devtools } from 'zustand/middleware';

export const useTabStore = create<TabState>()(
  devtools(
    (set) => ({
      // ... 기존 코드
    }),
    { name: 'TabStore' }
  )
);
```

## 5. 추가 스토어 생성 예시

터미널 인스턴스 관리 스토어:

```typescript
// src/stores/use-terminal-store.ts
import { create } from 'zustand';
import type { Terminal } from '@xterm/xterm';

interface TerminalInstance {
  tabId: string;
  terminal: Terminal;
  ptyId?: number;
}

interface TerminalState {
  instances: Map<string, TerminalInstance>;

  addInstance: (tabId: string, terminal: Terminal) => void;
  removeInstance: (tabId: string) => void;
  getInstance: (tabId: string) => TerminalInstance | undefined;
  updatePtyId: (tabId: string, ptyId: number) => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  instances: new Map(),

  addInstance: (tabId, terminal) =>
    set((state) => {
      const newInstances = new Map(state.instances);
      newInstances.set(tabId, { tabId, terminal });
      return { instances: newInstances };
    }),

  removeInstance: (tabId) =>
    set((state) => {
      const newInstances = new Map(state.instances);
      newInstances.delete(tabId);
      return { instances: newInstances };
    }),

  getInstance: (tabId) => get().instances.get(tabId),

  updatePtyId: (tabId, ptyId) =>
    set((state) => {
      const instance = state.instances.get(tabId);
      if (!instance) return state;

      const newInstances = new Map(state.instances);
      newInstances.set(tabId, { ...instance, ptyId });
      return { instances: newInstances };
    }),
}));
```

## 베스트 프랙티스

1. **선택적 구독**: 필요한 상태만 구독하여 성능 최적화
2. **액션 분리**: 읽기와 쓰기를 분리하여 불필요한 리렌더링 방지
3. **타입 안정성**: TypeScript 인터페이스로 타입 체크
4. **Persist 활용**: 설정은 localStorage에 저장하여 영구 보관
5. **작은 스토어**: 기능별로 스토어를 분리하여 관리

## 참고 자료

- [Zustand 공식 문서](https://zustand-demo.pmnd.rs/)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
