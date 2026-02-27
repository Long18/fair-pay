import { useState, useEffect, useCallback } from "react";

/**
 * usePersistedState Hook
 *
 * Generic hook for persisting state to localStorage with automatic sync.
 * Useful for remembering user preferences like tab selections, filter states, etc.
 *
 * @template T - Type of the state value
 * @param key - localStorage key for persistence
 * @param initialValue - Default value if no persisted value exists
 * @param options - Optional configuration
 *
 * @returns [state, setState, clearState] - Tuple with state, setter, and clear function
 *
 * @example
 * const [activeTab, setActiveTab] = usePersistedState('dashboard-tab', 'balances');
 *
 * @example
 * const [filters, setFilters, clearFilters] = usePersistedState(
 *   'expense-filters',
 *   { status: 'all', dateRange: '30d' }
 * );
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T,
  options?: {
    // Whether to sync across browser tabs
    syncAcrossTabs?: boolean;
    // Custom serializer (default: JSON.stringify)
    serialize?: (value: T) => string;
    // Custom deserializer (default: JSON.parse)
    deserialize?: (value: string) => T;
  }
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const {
    syncAcrossTabs = true,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options || {};

  // Initialize state from localStorage or use initial value
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      console.warn(`Failed to load persisted state for key "${key}":`, error);
      return initialValue;
    }
  });

  // Persist to localStorage when state changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, serialize(state));
    } catch (error) {
      console.warn(`Failed to persist state for key "${key}":`, error);
    }
  }, [key, state, serialize]);

  // Listen for storage events to sync across tabs
  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setState(deserialize(e.newValue));
        } catch (error) {
          console.warn(`Failed to sync state for key "${key}":`, error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, syncAcrossTabs, deserialize]);

  // Clear persisted state
  const clearState = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setState(initialValue);
    } catch (error) {
      console.warn(`Failed to clear persisted state for key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [state, setState, clearState];
}
