import type { ConversationMessage } from "@/modules/ai-chat/orchestrator";

export const DEFAULT_WEB_LLM_MODEL = "Hermes-3-Llama-3.2-3B-q4f16_1-MLC";
export const WEB_LLM_COMPAT_MODEL = "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC-1k";
export const WEB_LLM_MODEL_CANDIDATES = [DEFAULT_WEB_LLM_MODEL, WEB_LLM_COMPAT_MODEL] as const;

export type LocalLlmStatus =
  | { state: "unsupported"; reason: string }
  | { state: "idle"; model: string }
  | { state: "loading"; model: string; progress: number; message: string }
  | { state: "ready"; model: string }
  | { state: "error"; model: string; message: string };

export type LocalLlmStatusListener = (status: LocalLlmStatus) => void;

export interface LocalLlmChatRequest {
  messages: readonly ConversationMessage[];
  model: string;
}

export type LocalLlmWorkerRequest =
  | { id: number; type: "load"; model: string }
  | { id: number; type: "chat"; payload: LocalLlmChatRequest };

export type LocalLlmWorkerResponse =
  | { id?: number; type: "loading"; model: string; progress: number; message: string }
  | { id?: number; type: "ready"; model: string }
  | { id: number; type: "response"; content: string }
  | { id?: number; type: "error"; model?: string; message: string };
