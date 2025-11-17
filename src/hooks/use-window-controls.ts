import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { Platform, UseWindowControlsReturn } from '@/types/window';

/**
 * Hook for controlling window actions (minimize, maximize, close)
 * and tracking window state
 */
export function useWindowControls(): UseWindowControlsReturn {
  const [isMaximized, setIsMaximized] = useState(false);
  const [platform, setPlatform] = useState<Platform>('windows');

  const appWindow = getCurrentWindow();

  // Detect platform
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) {
      setPlatform('macos');
    } else if (userAgent.includes('linux')) {
      setPlatform('linux');
    } else {
      setPlatform('windows');
    }
  }, []);

  // Track maximized state
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      // Check initial state
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);

      // Listen for resize events
      unlisten = await appWindow.onResized(async () => {
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [appWindow]);

  const minimize = async () => {
    await appWindow.minimize();
  };

  const toggleMaximize = async () => {
    const maximized = await appWindow.isMaximized();
    if (maximized) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
  };

  const close = async () => {
    await appWindow.close();
  };

  return {
    minimize,
    toggleMaximize,
    close,
    isMaximized,
    platform,
  };
}
