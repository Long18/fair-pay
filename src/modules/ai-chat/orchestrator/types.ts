// Phase 3 — Orchestrator types.
// Pure TypeScript — no React, no browser globals.

import type { AgentPreviewResponse } from '@/lib/agent-api/types'

// -- Puter AI interface (injected, not imported from CDN global) -----------

export interface PuterToolCall {
  id: string
  type: string
  function: { name: string; arguments: string }
}

export interface PuterChatCompletion {
  message?: {
    role: string
    content: string | null
    tool_calls?: PuterToolCall[]
  }
  text?: string
}

export type PuterChatFn = (
  messages: readonly ConversationMessage[],
  options: { tools?: readonly unknown[]; model?: string }
) => Promise<PuterChatCompletion>

// -- Conversation history --------------------------------------------------

export type ConversationMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: PuterToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

// -- Orchestrator deps (dependency injection, no singletons) ---------------

/**
 * Calls the legacy ai-chat edge function for non-MCP read tools
 * (get_debt_summary, get_debt_details, get_group_details, get_expenses).
 */
export type LegacyToolExecutor = (
  toolName: string,
  args: Record<string, unknown>,
) => Promise<unknown>

export interface McpClientInterface {
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>
}

export interface OrchestratorDeps {
  /** Puter AI chat — injected so the orchestrator is testable without CDN global. */
  chatFn: PuterChatFn
  /** Phase 2 MCP client for fairpay_* tools. */
  mcpClient: McpClientInterface
  /** Legacy ai-chat edge function executor for non-MCP tools. */
  legacyExecutor: LegacyToolExecutor
}

// -- Turn result -----------------------------------------------------------

export interface ProcessTurnResult {
  /** Final assistant text for this turn. */
  text: string
  /** Full updated conversation history (caller should persist this). */
  updatedHistory: ConversationMessage[]
  /** Non-null if a new expense preview was created during this turn. */
  pendingPreview: AgentPreviewResponse | null
  /** True when a second preview was blocked until the user acts on the current card. */
  blockedPreviewReplacement: boolean
}
