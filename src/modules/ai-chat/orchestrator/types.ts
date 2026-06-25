import type { AgentPreviewResponse } from "@/lib/agent-api/types";

export interface AssistantToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface AssistantChatCompletion {
  message?: {
    content?: string | null;
    tool_calls?: AssistantToolCall[];
  };
  text?: string;
}

export type AssistantChatFn = (
  messages: readonly ConversationMessage[],
  options: {
    tools?: readonly unknown[];
    model?: string;
  },
) => Promise<AssistantChatCompletion>;

export type ConversationRole = "system" | "user" | "assistant" | "tool";

export interface ConversationMessage {
  role: ConversationRole;
  content: string | null;
  tool_calls?: AssistantToolCall[];
  tool_call_id?: string;
}

export interface McpClientInterface {
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}

export type LegacyToolExecutor = (
  toolName: string,
  toolArgs: Record<string, unknown>,
) => Promise<unknown>;

export interface OrchestratorDeps {
  chatFn: AssistantChatFn;
  mcpClient: McpClientInterface;
  legacyExecutor: LegacyToolExecutor;
}

export interface ProcessTurnResult {
  text: string;
  updatedHistory: ConversationMessage[];
  pendingPreview: AgentPreviewResponse | null;
  blockedPreviewReplacement: boolean;
}
