import type { AssistantChatCompletion, AssistantChatFn } from "@/modules/ai-chat/orchestrator";
import {
  DEFAULT_WEB_LLM_MODEL,
  WEB_LLM_COMPAT_MODEL,
  type LocalLlmChatRequest,
  type LocalLlmStatus,
  type LocalLlmStatusListener,
  type LocalLlmWorkerRequest,
  type LocalLlmWorkerResponse,
} from "./types";

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

type LocalLlmRequestWithoutId =
  | { type: "load"; model: string }
  | { type: "chat"; payload: LocalLlmChatRequest };

const listeners = new Set<LocalLlmStatusListener>();
const pending = new Map<number, PendingRequest>();

let worker: Worker | null = null;
let requestId = 0;
let status: LocalLlmStatus = getInitialStatus();

function supportsWebGpu(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

function getInitialStatus(): LocalLlmStatus {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return { state: "unsupported", reason: "Local AI requires a browser with Web Worker support." };
  }

  if (!supportsWebGpu()) {
    return { state: "unsupported", reason: "Local AI requires a browser with WebGPU support." };
  }

  return { state: "idle", model: DEFAULT_WEB_LLM_MODEL };
}

function setStatus(next: LocalLlmStatus): void {
  status = next;
  listeners.forEach((listener) => listener(status));
}

function rejectPending(error: Error): void {
  pending.forEach(({ reject }) => reject(error));
  pending.clear();
}

function ensureWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL("./web-llm.worker.ts", import.meta.url), { type: "module" });

  worker.addEventListener("message", (event: MessageEvent<LocalLlmWorkerResponse>) => {
    const message = event.data;

    if (message.type === "loading") {
      setStatus({
        state: "loading",
        model: message.model,
        progress: message.progress,
        message: message.message,
      });
      return;
    }

    if (message.type === "ready") {
      setStatus({ state: "ready", model: message.model });
      if (typeof message.id === "number") {
        pending.get(message.id)?.resolve(status);
        pending.delete(message.id);
      }
      return;
    }

    if (message.type === "response") {
      pending.get(message.id)?.resolve({ message: { content: message.content } });
      pending.delete(message.id);
      return;
    }

    if (message.type === "error") {
      const model = message.model ?? DEFAULT_WEB_LLM_MODEL;
      const error = new Error(message.message);
      setStatus({ state: "error", model, message: message.message });
      if (typeof message.id === "number") {
        pending.get(message.id)?.reject(error);
        pending.delete(message.id);
      } else {
        rejectPending(error);
      }
    }
  });

  worker.addEventListener("error", (event) => {
    const error = new Error(event.message || "Local AI worker failed.");
    setStatus({ state: "error", model: DEFAULT_WEB_LLM_MODEL, message: error.message });
    rejectPending(error);
  });

  return worker;
}

function postRequest<T>(request: LocalLlmRequestWithoutId): Promise<T> {
  const id = ++requestId;
  const activeWorker = ensureWorker();

  return new Promise<T>((resolve, reject) => {
    pending.set(id, {
      resolve: (value) => resolve(value as T),
      reject,
    });
    activeWorker.postMessage({ id, ...request } satisfies LocalLlmWorkerRequest);
  });
}

function isStorageBufferLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /maxStorageBuffersPerShaderStage/i.test(message);
}

export function getLocalLlmStatus(): LocalLlmStatus {
  if (status.state === "unsupported") return status;

  if (!supportsWebGpu()) {
    status = { state: "unsupported", reason: "Local AI requires a browser with WebGPU support." };
  }

  return status;
}

export function subscribeLocalLlmStatus(listener: LocalLlmStatusListener): () => void {
  listeners.add(listener);
  listener(getLocalLlmStatus());
  return () => {
    listeners.delete(listener);
  };
}

export async function loadModel(model = DEFAULT_WEB_LLM_MODEL): Promise<LocalLlmStatus> {
  const current = getLocalLlmStatus();
  if (current.state === "unsupported") return current;
  if (current.state === "ready" && current.model === model) return current;
  if (current.state === "loading" && current.model === model) return current;

  setStatus({ state: "loading", model, progress: 0, message: "Starting local model..." });
  try {
    return await postRequest<LocalLlmStatus>({ type: "load", model });
  } catch (error) {
    if (model !== WEB_LLM_COMPAT_MODEL && isStorageBufferLimitError(error)) {
      setStatus({
        state: "loading",
        model: WEB_LLM_COMPAT_MODEL,
        progress: 0,
        message: "Device WebGPU limits are low. Loading a smaller local model...",
      });
      return postRequest<LocalLlmStatus>({ type: "load", model: WEB_LLM_COMPAT_MODEL });
    }

    throw error;
  }
}

export const chat: AssistantChatFn = async (messages, options): Promise<AssistantChatCompletion> => {
  const current = getLocalLlmStatus();
  if (current.state !== "ready") {
    throw new Error("Local AI model is not ready. Load the model before chatting.");
  }

  return postRequest<AssistantChatCompletion>({
    type: "chat",
    payload: {
      messages,
      model: options.model ?? current.model,
    },
  });
};

export function reset(): void {
  worker?.terminate();
  worker = null;
  rejectPending(new Error("Local AI worker was reset."));
  setStatus(getInitialStatus());
}
