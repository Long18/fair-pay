import { describe, expect, it, vi } from "vitest";
import {
  resolveWebLlmAppConfig,
  WEBLLM_APP_CONFIG,
  WEBLLM_LEGACY_APP_CONFIG,
} from "../webllm-app-config";

describe("resolveWebLlmAppConfig", () => {
  it("prefers IndexedDB when the model is already there", async () => {
    const hasModelInCache = vi.fn(async (_modelId: string, appConfig?: { cacheBackend?: string }) => {
      return appConfig?.cacheBackend === "indexeddb";
    });

    await expect(resolveWebLlmAppConfig("m", hasModelInCache)).resolves.toBe(WEBLLM_APP_CONFIG);
    expect(hasModelInCache).toHaveBeenCalledWith("m", WEBLLM_APP_CONFIG);
  });

  it("falls back to Cache API for legacy downloads", async () => {
    const hasModelInCache = vi.fn(async (_modelId: string, appConfig?: { cacheBackend?: string }) => {
      return appConfig?.cacheBackend === "cache";
    });

    await expect(resolveWebLlmAppConfig("m", hasModelInCache)).resolves.toBe(
      WEBLLM_LEGACY_APP_CONFIG,
    );
  });

  it("defaults to IndexedDB for first-time downloads", async () => {
    const hasModelInCache = vi.fn(async () => false);

    await expect(resolveWebLlmAppConfig("m", hasModelInCache)).resolves.toBe(WEBLLM_APP_CONFIG);
  });
});
