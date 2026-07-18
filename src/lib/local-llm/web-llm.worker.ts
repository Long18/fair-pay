import {
  CreateMLCEngine,
  deleteModelAllInfoInCache,
  hasModelInCache,
  type InitProgressReport,
  type MLCEngine,
} from "@mlc-ai/web-llm";
import type {
  LocalLlmChatRequest,
  LocalLlmWorkerRequest,
  LocalLlmWorkerResponse,
} from "./types";
import {
  resolveWebLlmAppConfig,
  WEBLLM_APP_CONFIG,
  WEBLLM_LEGACY_APP_CONFIG,
} from "./webllm-app-config";

let engine: MLCEngine | null = null;
let loadedModel: string | null = null;

function post(message: LocalLlmWorkerResponse): void {
  self.postMessage(message);
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Local AI failed unexpectedly.";
  if (/networkerror|failed to fetch|load failed/i.test(message)) {
    return "Local AI could not download WebLLM model files. Check that this deployment allows Hugging Face and raw.githubusercontent.com in Content-Security-Policy connect-src.";
  }
  return message;
}

function normalizeMessages({ messages }: LocalLlmChatRequest) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content ?? "",
    ...(message.tool_call_id ? { tool_call_id: message.tool_call_id } : {}),
  }));
}

self.addEventListener("message", async (event: MessageEvent<LocalLlmWorkerRequest>) => {
  const request = event.data;

  try {
    if (request.type === "load") {
      if (engine && loadedModel === request.model) {
        post({ id: request.id, type: "ready", model: request.model });
        return;
      }

      const appConfig = await resolveWebLlmAppConfig(request.model, hasModelInCache);
      const fromCache =
        (await hasModelInCache(request.model, WEBLLM_APP_CONFIG)) ||
        (await hasModelInCache(request.model, WEBLLM_LEGACY_APP_CONFIG));

      engine = await CreateMLCEngine(request.model, {
        appConfig,
        initProgressCallback: (progress: InitProgressReport) => {
          post({
            id: request.id,
            type: "loading",
            model: request.model,
            progress: progress.progress ?? 0,
            message: progress.text ?? "Loading local model...",
            fromCache,
          });
        },
      });
      loadedModel = request.model;
      post({ id: request.id, type: "ready", model: request.model });
      return;
    }

    if (request.type === "delete-model-cache") {
      if (loadedModel === request.model) {
        engine = null;
        loadedModel = null;
      }

      // Clear both backends so picker / disk usage stay accurate after migration.
      await deleteModelAllInfoInCache(request.model, WEBLLM_APP_CONFIG);
      await deleteModelAllInfoInCache(request.model, WEBLLM_LEGACY_APP_CONFIG);
      post({ id: request.id, type: "cache-deleted", model: request.model });
      return;
    }

    if (!engine) {
      throw new Error("Local AI model is not loaded.");
    }

    const chunks = await engine.chat.completions.create({
      messages: normalizeMessages(request.payload) as never,
      temperature: 0.1,
      max_tokens: 700,
      stream: true,
    });

    let fullContent = "";
    for await (const chunk of chunks) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullContent += delta;
        post({ id: request.id, type: "chunk", delta });
      }
    }

    post({
      id: request.id,
      type: "response",
      content: fullContent,
    });
  } catch (error) {
    post({
      id: request.id,
      type: "error",
      model: request.type === "chat" ? request.payload.model : request.model,
      message: errorMessage(error),
    });
  }
});
