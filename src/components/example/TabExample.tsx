// 탭 관리 예시 컴포넌트
import { useTabStore } from '@/stores';

export function TabExample() {
  // 선택적 구독 - 필요한 상태만 가져오기
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);

  // 액션만 가져오기 (리렌더링 없음)
  const addTab = useTabStore((state) => state.addTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const closeTab = useTabStore((state) => state.closeTab);
  const updateTab = useTabStore((state) => state.updateTab);

  const handleCreateNewTab = () => {
    const newTabId = crypto.randomUUID();
    addTab({
      id: newTabId,
      title: `Terminal ${tabs.length + 1}`,
      type: 'terminal',
      closable: true,
    });
  };

  const handleRenameTab = (id: string) => {
    const newTitle = prompt('Enter new tab title:');
    if (newTitle) {
      updateTab(id, { title: newTitle });
    }
  };

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleCreateNewTab}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + New Tab
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`
              flex items-center gap-2 px-4 py-2 rounded border
              ${tab.isActive ? 'bg-blue-500 text-white' : 'bg-gray-100'}
              cursor-pointer
            `}
          >
            <span
              onClick={() => setActiveTab(tab.id)}
              className="flex-1"
            >
              {tab.title}
            </span>

            <button
              onClick={() => handleRenameTab(tab.id)}
              className="px-2 hover:bg-white/20 rounded"
              title="Rename"
            >
              ✎
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="px-2 hover:bg-white/20 rounded"
              title="Close"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {activeTabId && (
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            Active Tab ID: {activeTabId}
          </p>
        </div>
      )}

      {tabs.length === 0 && (
        <div className="mt-4 text-center text-gray-500">
          No tabs. Click "New Tab" to create one.
        </div>
      )}
    </div>
  );
}
