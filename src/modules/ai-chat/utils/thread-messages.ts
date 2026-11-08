import type { LocalLlmStatus } from "@/lib/local-llm/types";
import type { ChatMessage } from "../types";

/** Hide empty assistant placeholder while WebLLM weights load (avoids thin cursor bubble). */
export function messagesForThreadRender(
  messages: readonly ChatMessage[],
  isLoading: boolean,
  localLlmStatus: LocalLlmStatus,
): readonly ChatMessage[] {
  if (!isLoading || localLlmStatus.state !== "loading") {
    return messages;
  }
  const last = messages[messages.length - 1];
  if (last?.role === "assistant" && !last.content?.trim()) {
    return messages.slice(0, -1);
  }
  return messages;
}
