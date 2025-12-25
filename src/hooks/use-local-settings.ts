import { useState, useEffect, useCallback } from 'react';
import {
  LocalSettings,
  getLocalSettings,
  setLocalSettings,
  updateLocalSetting,
  clearLocalSettings,
  DEFAULT_LOCAL_SETTINGS,
  addRecentSearch,
  addRecentlyViewed,
  getRecentlyViewedByType,
} from '../lib/local-settings';

/**
 * React hook for managing local settings with reactive updates
 *
 * @example
 * const { settings, updateSetting, resetSettings } = useLocalSettings();
 *
 * // Update theme
 * updateSetting('theme', 'dark');
 *
 * // Update dashboard layout
 * updateSetting('dashboardLayout', 'compact');
 *
 * // Reset all settings
 * resetSettings();
 */
export function useLocalSettings() {
  const [settings, setSettings] = useState<LocalSettings>(getLocalSettings);

  useEffect(() => {
    // Listen for settings changes from other tabs or components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'fairpay:local-settings') {
        setSettings(getLocalSettings());
      }
    };

    const handleCustomEvent = (e: CustomEvent) => {
      setSettings(e.detail as LocalSettings);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-settings-changed', handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-settings-changed', handleCustomEvent as EventListener);
    };
  }, []);

  const updateSetting = useCallback(<K extends keyof LocalSettings>(
    key: K,
    value: LocalSettings[K]
  ) => {
    updateLocalSetting(key, value);
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateSettings = useCallback((partial: Partial<LocalSettings>) => {
    setLocalSettings(partial);
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(() => {
    clearLocalSettings();
    setSettings(DEFAULT_LOCAL_SETTINGS);
  }, []);

  return {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
  };
}

/**
 * Hook for theme management specifically
 *
 * @example
 * const { theme, setTheme, isDark } = useTheme();
 */
export function useTheme() {
  const { settings, updateSetting } = useLocalSettings();

  const isDark = settings.theme === 'dark' ||
    (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const setTheme = useCallback((theme: LocalSettings['theme']) => {
    updateSetting('theme', theme);
  }, [updateSetting]);

  useEffect(() => {
    // Apply theme to document
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    // Listen for system theme changes if using 'system' theme
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        if (mediaQuery.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };

      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [settings.theme]);

  return {
    theme: settings.theme,
    setTheme,
    isDark,
  };
}

/**
 * Hook for language management
 *
 * @example
 * const { language, setLanguage } = useLanguage();
 */
export function useLanguage() {
  const { settings, updateSetting } = useLocalSettings();

  const setLanguage = useCallback((language: LocalSettings['language']) => {
    updateSetting('language', language);
  }, [updateSetting]);

  return {
    language: settings.language,
    setLanguage,
  };
}

/**
 * Hook for managing recent searches with autocomplete
 *
 * @example
 * const { recentSearches, addSearch, clearSearches } = useRecentSearches();
 */
export function useRecentSearches() {
  const { settings, updateSetting } = useLocalSettings();

  const addSearch = useCallback((query: string) => {
    if (query.trim()) {
      addRecentSearch(query.trim());
    }
  }, []);

  const clearSearches = useCallback(() => {
    updateSetting('recentSearches', []);
  }, [updateSetting]);

  return {
    recentSearches: settings.recentSearches,
    addSearch,
    clearSearches,
  };
}

/**
 * Hook for managing recently viewed items
 *
 * @example
 * const { recentlyViewed, addViewed, getByType } = useRecentlyViewed();
 */
export function useRecentlyViewed() {
  const { settings, updateSetting } = useLocalSettings();

  const addViewed = useCallback((
    type: 'expense' | 'group' | 'friend',
    id: string,
    title: string
  ) => {
    addRecentlyViewed(type, id, title);
  }, []);

  const getByType = useCallback((type: 'expense' | 'group' | 'friend') => {
    return getRecentlyViewedByType(type);
  }, []);

  const clearViewed = useCallback(() => {
    updateSetting('recentlyViewed', []);
  }, [updateSetting]);

  return {
    recentlyViewed: settings.recentlyViewed,
    addViewed,
    getByType,
    clearViewed,
  };
}

/**
 * Hook for dashboard layout preferences
 *
 * @example
 * const { layout, setLayout, isCompact } = useDashboardLayout();
 */
export function useDashboardLayout() {
  const { settings, updateSetting } = useLocalSettings();

  const setLayout = useCallback((layout: LocalSettings['dashboardLayout']) => {
    updateSetting('dashboardLayout', layout);
  }, [updateSetting]);

  return {
    layout: settings.dashboardLayout,
    setLayout,
    isCompact: settings.dashboardLayout === 'compact',
  };
}

/**
 * Hook for chart preferences
 *
 * @example
 * const { chartPrefs, updateChartPref } = useChartPreferences();
 */
export function useChartPreferences() {
  const { settings, updateSettings } = useLocalSettings();

  const updateChartPref = useCallback(<K extends keyof LocalSettings['chartPreferences']>(
    key: K,
    value: LocalSettings['chartPreferences'][K]
  ) => {
    updateSettings({
      chartPreferences: {
        ...settings.chartPreferences,
        [key]: value,
      },
    });
  }, [settings.chartPreferences, updateSettings]);

  return {
    chartPrefs: settings.chartPreferences,
    updateChartPref,
  };
}
