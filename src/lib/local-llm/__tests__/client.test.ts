import { afterEach, describe, expect, it, vi } from "vitest";
import type { LocalLlmWorkerResponse } from "../types";

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

afterEach(() => {
  vi.unstubAllGlobals();
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
    const worker = MockWorker.instances[0];
    const request = worker.posted[0] as { id: number; model: string };
    worker.emit({ id: request.id, type: "loading", model: request.model, progress: 0.5, message: "Halfway" });
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
    const worker = MockWorker.instances[0];
    const request = worker.posted[0] as { id: number; model: string };
    worker.emit({ id: request.id, type: "error", model: request.model, message: "No memory" });

    await expect(loading).rejects.toThrow("No memory");
    expect(client.getLocalLlmStatus()).toMatchObject({ state: "error", message: "No memory" });
  });

  it("surfaces deployment guidance for blocked model downloads", async () => {
    Object.defineProperty(navigator, "gpu", { configurable: true, value: {} });
    vi.stubGlobal("Worker", MockWorker);
    const client = await importClient();

    const loading = client.loadModel();
    const worker = MockWorker.instances[0];
    const request = worker.posted[0] as { id: number; model: string };
    worker.emit({
      id: request.id,
      type: "error",
      model: request.model,
      message:
        "Local AI could not download WebLLM model files. Check that this deployment allows Hugging Face and raw.githubusercontent.com in Content-Security-Policy connect-src.",
    });

    await expect(loading).rejects.toThrow("Hugging Face");
    expect(client.getLocalLlmStatus()).toMatchObject({ state: "error", message: expect.stringContaining("connect-src") });
  });
});
