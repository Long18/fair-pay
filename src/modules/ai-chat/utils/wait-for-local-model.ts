import {
  getLocalLlmStatus,
  loadModel,
  subscribeLocalLlmStatus,
} from "@/lib/local-llm/client";
import type { LocalLlmStatus, WebLlmModelId } from "@/lib/local-llm/types";

/** Max wait before surfacing a timeout (downloads can be slow but should not hang forever). */
export const MODEL_LOAD_TIMEOUT_MS = 5 * 60 * 1000;

export function waitForLocalModelReady(model: WebLlmModelId): Promise<LocalLlmStatus> {
  const current = getLocalLlmStatus();
  if (current.state === "ready" && current.model === model) {
    return Promise.resolve(current);
  }

  return new Promise((resolve) => {
    void loadModel(model);

    let settled = false;
    const finish = (status: LocalLlmStatus) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      unsub();
      resolve(status);
    };

    const timeoutId = window.setTimeout(() => {
      finish({
        state: "error",
        model,
        message: "MODEL_LOAD_TIMEOUT",
      });
    }, MODEL_LOAD_TIMEOUT_MS);

    const unsub = subscribeLocalLlmStatus((s) => {
      if (s.state === "loading") return;
      if (s.state === "ready" && s.model === model) {
        finish(s);
        return;
      }
      if (s.state === "unsupported") {
        finish(s);
        return;
      }
      if (s.state === "error" && s.model === model) {
        finish(s);
      }
    });
  });
}
