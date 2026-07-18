import { prebuiltAppConfig, type AppConfig } from "@mlc-ai/web-llm";

/** Mirrors web-llm `CacheBackend` (not re-exported from the package entry). */
type CacheBackend = NonNullable<AppConfig["cacheBackend"]>;

/**
 * Preferred storage for WebLLM weights. IndexedDB survives PWA/build
 * refreshes that call `caches.delete()` on every Cache API entry.
 */
export const WEBLLM_CACHE_BACKEND: CacheBackend = "indexeddb";

/** Legacy backend used before FairPay switched to IndexedDB. */
export const WEBLLM_LEGACY_CACHE_BACKEND: CacheBackend = "cache";

export const WEBLLM_APP_CONFIG: AppConfig = {
  ...prebuiltAppConfig,
  cacheBackend: WEBLLM_CACHE_BACKEND,
};

export const WEBLLM_LEGACY_APP_CONFIG: AppConfig = {
  ...prebuiltAppConfig,
  cacheBackend: WEBLLM_LEGACY_CACHE_BACKEND,
};

/**
 * Pick the AppConfig whose backend already holds `modelId`.
 * New downloads always land in IndexedDB.
 */
export async function resolveWebLlmAppConfig(
  modelId: string,
  hasModelInCache: (modelId: string, appConfig?: AppConfig) => Promise<boolean>,
): Promise<AppConfig> {
  try {
    if (await hasModelInCache(modelId, WEBLLM_APP_CONFIG)) {
      return WEBLLM_APP_CONFIG;
    }
    if (await hasModelInCache(modelId, WEBLLM_LEGACY_APP_CONFIG)) {
      return WEBLLM_LEGACY_APP_CONFIG;
    }
  } catch {
    // Fall through to preferred backend for first-time download.
  }

  return WEBLLM_APP_CONFIG;
}
