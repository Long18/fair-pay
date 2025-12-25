/**
 * LocalSettings - UI-only preferences stored in localStorage
 *
 * These settings are NOT stored in the database and only affect UI presentation.
 * Backend-required settings (currency, notifications, privacy) are in user_settings table.
 */

export interface LocalSettings {
  /** UI theme preference */
  theme: 'light' | 'dark' | 'system';

  /** Display language for UI (not server-side emails) */
  language: 'en' | 'vi';

  /** Date format for display only */
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

  /** Sidebar collapsed state */
  sidebarCollapsed: boolean;

  /** Dashboard layout preference */
  dashboardLayout: 'compact' | 'comfortable';

  /** Recent search queries (for autocomplete) */
  recentSearches: string[];

  /** Recently viewed items (for quick access) */
  recentlyViewed: Array<{
    type: 'expense' | 'group' | 'friend';
    id: string;
    title: string;
    timestamp: number;
  }>;

  /** Chart preferences */
  chartPreferences: {
    defaultPeriod: 'week' | 'month' | 'year';
    showLegend: boolean;
    chartType: 'line' | 'bar' | 'area';
  };
}

/**
 * Default local settings values
 */
export const DEFAULT_LOCAL_SETTINGS: LocalSettings = {
  theme: 'system',
  language: 'vi',
  dateFormat: 'DD/MM/YYYY',
  sidebarCollapsed: false,
  dashboardLayout: 'comfortable',
  recentSearches: [],
  recentlyViewed: [],
  chartPreferences: {
    defaultPeriod: 'month',
    showLegend: true,
    chartType: 'line',
  },
};

/**
 * LocalStorage key for settings
 */
const STORAGE_KEY = 'fairpay:local-settings';

/**
 * LocalStorage key for last updated timestamp
 */
const TIMESTAMP_KEY = 'fairpay:settings-timestamp';

/**
 * Get local settings from localStorage with validation
 */
export function getLocalSettings(): LocalSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return DEFAULT_LOCAL_SETTINGS;
    }

    const parsed = JSON.parse(stored) as Partial<LocalSettings>;

    // Merge with defaults to handle missing keys from schema updates
    return {
      ...DEFAULT_LOCAL_SETTINGS,
      ...parsed,
      chartPreferences: {
        ...DEFAULT_LOCAL_SETTINGS.chartPreferences,
        ...(parsed.chartPreferences || {}),
      },
    };
  } catch (error) {
    console.error('Failed to parse local settings:', error);
    return DEFAULT_LOCAL_SETTINGS;
  }
}

/**
 * Save local settings to localStorage
 */
export function setLocalSettings(settings: Partial<LocalSettings>): void {
  try {
    const current = getLocalSettings();
    const updated: LocalSettings = {
      ...current,
      ...settings,
      chartPreferences: {
        ...current.chartPreferences,
        ...(settings.chartPreferences || {}),
      },
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());

    // Dispatch custom event for reactive updates
    window.dispatchEvent(new CustomEvent('local-settings-changed', {
      detail: updated
    }));
  } catch (error) {
    console.error('Failed to save local settings:', error);
  }
}

/**
 * Update a specific setting key
 */
export function updateLocalSetting<K extends keyof LocalSettings>(
  key: K,
  value: LocalSettings[K]
): void {
  setLocalSettings({ [key]: value } as Partial<LocalSettings>);
}

/**
 * Clear all local settings (reset to defaults)
 */
export function clearLocalSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TIMESTAMP_KEY);
    window.dispatchEvent(new CustomEvent('local-settings-changed', {
      detail: DEFAULT_LOCAL_SETTINGS
    }));
  } catch (error) {
    console.error('Failed to clear local settings:', error);
  }
}

/**
 * Add a recent search query (max 10)
 */
export function addRecentSearch(query: string): void {
  const settings = getLocalSettings();
  const recentSearches = [
    query,
    ...settings.recentSearches.filter(q => q !== query),
  ].slice(0, 10);

  setLocalSettings({ recentSearches });
}

/**
 * Add a recently viewed item (max 20)
 */
export function addRecentlyViewed(
  type: 'expense' | 'group' | 'friend',
  id: string,
  title: string
): void {
  const settings = getLocalSettings();
  const item = { type, id, title, timestamp: Date.now() };

  const recentlyViewed = [
    item,
    ...settings.recentlyViewed.filter(i => !(i.type === type && i.id === id)),
  ].slice(0, 20);

  setLocalSettings({ recentlyViewed });
}

/**
 * Get recently viewed items by type
 */
export function getRecentlyViewedByType(
  type: 'expense' | 'group' | 'friend'
): LocalSettings['recentlyViewed'] {
  const settings = getLocalSettings();
  return settings.recentlyViewed.filter(item => item.type === type);
}

/**
 * Export settings as JSON (for backup/sync)
 */
export function exportLocalSettings(): string {
  const settings = getLocalSettings();
  const timestamp = localStorage.getItem(TIMESTAMP_KEY);

  return JSON.stringify({
    settings,
    timestamp,
    version: '1.0',
  }, null, 2);
}

/**
 * Import settings from JSON (for backup/sync)
 */
export function importLocalSettings(json: string): boolean {
  try {
    const { settings } = JSON.parse(json);
    setLocalSettings(settings);
    return true;
  } catch (error) {
    console.error('Failed to import settings:', error);
    return false;
  }
}

/**
 * Check if settings have been customized (differ from defaults)
 */
export function hasCustomSettings(): boolean {
  const current = getLocalSettings();
  return JSON.stringify(current) !== JSON.stringify(DEFAULT_LOCAL_SETTINGS);
}

/**
 * Get settings last modified timestamp
 */
export function getSettingsTimestamp(): number | null {
  const timestamp = localStorage.getItem(TIMESTAMP_KEY);
  return timestamp ? parseInt(timestamp, 10) : null;
}
