import type { AssistantChatCompletion, AssistantChatFn, ConversationMessage } from "../orchestrator/types";

/** Product gate — flip when cloud fallback is ready for users (requires server OPENAI_API_KEY). */
const PRODUCT_SHIPPED = false;

const ENV_ENABLED = import.meta.env.VITE_AI_CHAT_CLOUD_ORCHESTRATOR === "1";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? "";

/** Shown in UI while cloud assist is not available to end users. */
export function isCloudOrchestratorComingSoon(): boolean {
  return !PRODUCT_SHIPPED;
}

export function isCloudOrchestratorEnabled(): boolean {
  return PRODUCT_SHIPPED && ENV_ENABLED && Boolean(SUPABASE_URL);
}

export function createCloudOrchestratorChatFn(
  getToken: () => Promise<string | null>,
): AssistantChatFn | undefined {
  if (!isCloudOrchestratorEnabled() || !SUPABASE_URL) return undefined;

  const endpoint = `${SUPABASE_URL}/functions/v1/fairpay-agent-orchestrator`;

  return async (
    messages: readonly ConversationMessage[],
    options: { model?: string },
  ): Promise<AssistantChatCompletion> => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        messages,
        model: options.model ?? "gpt-4o-mini",
      }),
    });

    const json = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: { content?: string };
    };
    if (!response.ok) {
      throw new Error(json.error ?? "Cloud orchestrator request failed.");
    }

    return { message: { content: json.message?.content ?? "" } };
  };
}
