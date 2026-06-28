import { CreateMLCEngine, deleteModelAllInfoInCache, type InitProgressReport, type MLCEngine } from "@mlc-ai/web-llm";
import type {
  LocalLlmChatRequest,
  LocalLlmWorkerRequest,
  LocalLlmWorkerResponse,
} from "./types";

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

      engine = await CreateMLCEngine(request.model, {
        initProgressCallback: (progress: InitProgressReport) => {
          post({
            id: request.id,
            type: "loading",
            model: request.model,
            progress: progress.progress ?? 0,
            message: progress.text ?? "Loading local model...",
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

      await deleteModelAllInfoInCache(request.model);
      post({ id: request.id, type: "cache-deleted", model: request.model });
      return;
    }

    if (!engine) {
      throw new Error("Local AI model is not loaded.");
    }

    const completion = await engine.chat.completions.create({
      messages: normalizeMessages(request.payload) as never,
      temperature: 0.1,
      max_tokens: 700,
    });

    post({
      id: request.id,
      type: "response",
      content: completion.choices[0]?.message?.content ?? "",
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
