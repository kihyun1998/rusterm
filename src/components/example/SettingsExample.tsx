// 설정 관리 예시 컴포넌트
import { useSettingsStore } from '@/stores';

export function SettingsExample() {
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const updateTheme = useSettingsStore((state) => state.updateTheme);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ fontSize: parseInt(e.target.value, 10) || 14 });
  };

  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ fontFamily: e.target.value });
  };

  const handleCursorStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({
      cursorStyle: e.target.value as 'block' | 'underline' | 'bar',
    });
  };

  const handleCursorBlinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ cursorBlink: e.target.checked });
  };

  const applyDarkTheme = () => {
    updateTheme({
      background: '#1e1e1e',
      foreground: '#cccccc',
      cursor: '#ffffff',
    });
  };

  const applyLightTheme = () => {
    updateTheme({
      background: '#ffffff',
      foreground: '#000000',
      cursor: '#000000',
    });
  };

  return (
    <div className="p-4 max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">Terminal Settings</h2>

      {/* Font Settings */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Font</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <span className="w-32">Font Size:</span>
            <input
              type="number"
              value={settings.fontSize}
              onChange={handleFontSizeChange}
              className="px-2 py-1 border rounded"
              min="8"
              max="32"
            />
            <span className="text-sm text-gray-500">px</span>
          </label>

          <label className="flex items-center gap-2">
            <span className="w-32">Font Family:</span>
            <input
              type="text"
              value={settings.fontFamily}
              onChange={handleFontFamilyChange}
              className="flex-1 px-2 py-1 border rounded"
            />
          </label>
        </div>
      </div>

      {/* Cursor Settings */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Cursor</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <span className="w-32">Cursor Style:</span>
            <select
              value={settings.cursorStyle}
              onChange={handleCursorStyleChange}
              className="px-2 py-1 border rounded"
            >
              <option value="block">Block</option>
              <option value="underline">Underline</option>
              <option value="bar">Bar</option>
            </select>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.cursorBlink}
              onChange={handleCursorBlinkChange}
              className="w-4 h-4"
            />
            <span>Cursor Blink</span>
          </label>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Theme</h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyDarkTheme}
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
            >
              Dark Theme
            </button>
            <button
              type="button"
              onClick={applyLightTheme}
              className="px-4 py-2 bg-white text-black border rounded hover:bg-gray-100"
            >
              Light Theme
            </button>
          </div>

          <div
            className="p-4 rounded"
            style={{
              backgroundColor: settings.theme.background,
              color: settings.theme.foreground,
            }}
          >
            <p style={{ fontFamily: settings.fontFamily, fontSize: settings.fontSize }}>
              Terminal Preview: Hello, World!
            </p>
            <div
              className="mt-2 h-4 w-2"
              style={{
                backgroundColor: settings.theme.cursor,
                animation: settings.cursorBlink ? 'blink 1s infinite' : 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div className="mt-6">
        <button
          type="button"
          onClick={resetSettings}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Current Settings (Debug) */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h4 className="font-semibold mb-2">Current Settings (Debug)</h4>
        <pre className="text-xs overflow-auto">{JSON.stringify(settings, null, 2)}</pre>
      </div>

      <style>{`
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
