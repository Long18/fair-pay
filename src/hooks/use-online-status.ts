import { useEffect, useState, useCallback } from 'react';

/**
 * Hook to detect online/offline status
 *
 * @returns Object with isOnline status and a function to manually check
 *
 * @example
 * function MyComponent() {
 *   const { isOnline } = useOnlineStatus();
 *
 *   return (
 *     <>
 *       {!isOnline && (
 *         <div className="bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm">
 *           You're offline. Changes will sync when reconnected.
 *         </div>
 *       )}
 *       {/* rest of component *\/}
 *     </>
 *   );
 * }
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true; // Default to online for SSR
  });

  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setLastOnlineTime(new Date());
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  useEffect(() => {
    // Set initial state
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  /**
   * Manually check online status by making a request
   * Useful when navigator.onLine might not be accurate
   */
  const checkOnlineStatus = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store',
      });
      const online = response.ok;
      setIsOnline(online);
      if (online) {
        setLastOnlineTime(new Date());
      }
      return online;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, []);

  return {
    isOnline,
    lastOnlineTime,
    checkOnlineStatus,
  };
}

/**
 * Simple hook returning just the online boolean
 */
export function useIsOnline(): boolean {
  const { isOnline } = useOnlineStatus();
  return isOnline;
}
