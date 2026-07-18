import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalLlmWorkerResponse } from "../types";

vi.mock("@mlc-ai/web-llm", () => ({
  hasModelInCache: vi.fn(async () => false),
  prebuiltAppConfig: { model_list: [], cacheBackend: "cache" },
}));

class MockWorker extends EventTarget {
  static instances: MockWorker[] = [];
  posted: unknown[] = [];

  constructor() {
    super();
    MockWorker.instances.push(this);
  }

  postMessage(message: unknown) {
    this.posted.push(message);
  }

  terminate() {
    this.posted.push({ type: "terminated" });
  }

  emit(message: LocalLlmWorkerResponse) {
    this.dispatchEvent(new MessageEvent("message", { data: message }));
  }
}

async function importClient() {
  vi.resetModules();
  return import("../client");
}

/** loadModel awaits a cache check before posting — wait for the worker request. */
async function waitForWorkerRequest(index = 0): Promise<{
  worker: MockWorker;
  request: { id: number; type: string; model: string };
}> {
  await vi.waitFor(() => {
    expect(MockWorker.instances[0]?.posted[index]).toBeTruthy();
  });
  const worker = MockWorker.instances[0];
  return {
    worker,
    request: worker.posted[index] as { id: number; type: string; model: string },
  };
}

function clearLocalStorage(): void {
  try {
    window.localStorage?.clear();
  } catch {
    // localStorage may be unavailable in some Vitest/Node setups.
  }
}

function installLocalStoragePolyfill(): void {
  const store = new Map<string, string>();
  const localStorageMock: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageMock,
  });
}

beforeEach(() => {
  installLocalStoragePolyfill();
  // supportsWebGpu uses `"gpu" in navigator` — delete the key, don't set undefined.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).gpu;
  } catch {
    Object.defineProperty(navigator, "gpu", { configurable: true, value: undefined });
  }
  clearLocalStorage();
  MockWorker.instances = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearLocalStorage();
  MockWorker.instances = [];
});

describe("local LLM client", () => {
  it("reports unsupported when WebGPU is unavailable", async () => {
    vi.stubGlobal("Worker", MockWorker);
    const client = await importClient();

    expect(client.getLocalLlmStatus().state).toBe("unsupported");
    await expect(client.loadModel()).resolves.toMatchObject({ state: "unsupported" });
  });

  it("publishes loading progress and ready status from worker events", async () => {
    Object.defineProperty(navigator, "gpu", { configurable: true, value: {} });
    vi.stubGlobal("Worker", MockWorker);
    const client = await importClient();
    const statuses: string[] = [];
    client.subscribeLocalLlmStatus((status) => statuses.push(status.state));

    const loading = client.loadModel();
    const { worker, request } = await waitForWorkerRequest();
    worker.emit({
      id: request.id,
      type: "loading",
      model: request.model,
      progress: 0.5,
      message: "Halfway",
    });
    worker.emit({ id: request.id, type: "ready", model: request.model });

    await expect(loading).resolves.toMatchObject({ state: "ready", model: request.model });
    expect(statuses).toContain("loading");
    expect(client.getLocalLlmStatus()).toMatchObject({ state: "ready", model: request.model });
  });

  it("moves to error status when the worker reports an error", async () => {
    Object.defineProperty(navigator, "gpu", { configurable: true, value: {} });
    vi.stubGlobal("Worker", MockWorker);
    const client = await importClient();

    const loading = client.loadModel();
    const { worker, request } = await waitForWorkerRequest();
    worker.emit({ id: request.id, type: "error", model: request.model, message: "No memory" });

    await expect(loading).rejects.toThrow("No memory");
    expect(client.getLocalLlmStatus()).toMatchObject({ state: "error", message: "No memory" });
  });

  it("surfaces deployment guidance for blocked model downloads", async () => {
    Object.defineProperty(navigator, "gpu", { configurable: true, value: {} });
    vi.stubGlobal("Worker", MockWorker);
    const client = await importClient();

    const loading = client.loadModel();
    const { worker, request } = await waitForWorkerRequest();
    worker.emit({
      id: request.id,
      type: "error",
      model: request.model,
      message:
        "Local AI could not download WebLLM model files. Check that this deployment allows Hugging Face and raw.githubusercontent.com in Content-Security-Policy connect-src.",
    });

    await expect(loading).rejects.toThrow("Hugging Face");
    expect(client.getLocalLlmStatus()).toMatchObject({
      state: "error",
      message: expect.stringContaining("connect-src"),
    });
  });

  it("falls back to a smaller model when WebGPU storage-buffer limits are too low", async () => {
    Object.defineProperty(navigator, "gpu", { configurable: true, value: {} });
    vi.stubGlobal("Worker", MockWorker);
    const client = await importClient();

    const loading = client.loadModel();
    const { worker, request: firstRequest } = await waitForWorkerRequest();
    worker.emit({
      id: firstRequest.id,
      type: "error",
      model: firstRequest.model,
      message:
        "Cannot initialize runtime because of requested maxStorageBuffersPerShaderStage exceeds limit. requested=10, limit=8.",
    });

    const { request: secondRequest } = await waitForWorkerRequest(1);
    expect(secondRequest.model).toBe("TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC-1k");

    worker.emit({ id: secondRequest.id, type: "ready", model: secondRequest.model });
    await expect(loading).resolves.toMatchObject({ state: "ready", model: secondRequest.model });
    expect(client.getSelectedModel()).toBe(secondRequest.model);
  });

  it("persists the selected local model", async () => {
    Object.defineProperty(navigator, "gpu", { configurable: true, value: {} });
    vi.stubGlobal("Worker", MockWorker);

    const client = await importClient();
    const model = "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC-1k";

    expect(client.selectModel(model)).toMatchObject({ state: "idle", model });
    expect(client.getSelectedModel()).toBe(model);

    const reloaded = await importClient();
    expect(reloaded.getLocalLlmStatus()).toMatchObject({ state: "idle", model });
  });

  it("offers a full catalog of supported WebLLM model choices", async () => {
    const {
      WEB_LLM_MODEL_LIST,
      WEB_LLM_MODEL_OPTIONS,
      DEFAULT_WEB_LLM_MODEL,
      WEB_LLM_COMPAT_MODEL,
      isWebLlmModelId,
    } = await import("../types");

    expect(WEB_LLM_MODEL_LIST.length).toBeGreaterThanOrEqual(40);
    expect(WEB_LLM_MODEL_OPTIONS.length).toBe(WEB_LLM_MODEL_LIST.length);

    expect(DEFAULT_WEB_LLM_MODEL).toBe("Llama-3.2-1B-Instruct-q4f16_1-MLC");
    expect(isWebLlmModelId(DEFAULT_WEB_LLM_MODEL)).toBe(true);
    expect(isWebLlmModelId(WEB_LLM_COMPAT_MODEL)).toBe(true);

    const ids = WEB_LLM_MODEL_LIST.map((m) => m.id);
    expect(ids).toContain("Hermes-3-Llama-3.2-3B-q4f16_1-MLC");
    expect(ids).toContain("Llama-3.2-1B-Instruct-q4f16_1-MLC");
    expect(ids).toContain("Llama-3.2-3B-Instruct-q4f16_1-MLC");
    expect(ids).toContain("Phi-3.5-mini-instruct-q4f16_1-MLC");
    expect(ids).toContain("SmolLM2-1.7B-Instruct-q4f16_1-MLC");
    expect(ids).toContain("Qwen3-1.7B-q4f16_1-MLC");
    expect(ids).toContain("gemma3-1b-it-q4f16_1-MLC");
    expect(ids).toContain("TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC-1k");

    for (const model of WEB_LLM_MODEL_LIST) {
      expect(model.id).toBeTruthy();
      expect(model.label).toBeTruthy();
      expect(model.family).toBeTruthy();
      expect(model.vramMB).toBeGreaterThan(0);
      expect(model.contextLength).toBeGreaterThan(0);
    }
  });

  it("deletes the selected model cache and resets to idle", async () => {
    Object.defineProperty(navigator, "gpu", { configurable: true, value: {} });
    vi.stubGlobal("Worker", MockWorker);

    const client = await importClient();
    const deleting = client.deleteSelectedModelCache("Llama-3.2-1B-Instruct-q4f16_1-MLC");
    const { worker, request } = await waitForWorkerRequest();

    expect(request).toMatchObject({
      type: "delete-model-cache",
      model: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    });

    worker.emit({ id: request.id, type: "cache-deleted", model: request.model });

    await expect(deleting).resolves.toBeUndefined();
    expect(client.getLocalLlmStatus()).toMatchObject({ state: "idle", model: request.model });
  });
});
