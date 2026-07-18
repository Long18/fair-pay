// Phase 3 — Barrel export for the orchestrator module.

export { FairPayChatOrchestrator } from './FairPayChatOrchestrator'
export { McpClient, McpClientError, FORBIDDEN_MCP_TOOLS, MCP_PROTOCOL_VERSION } from './mcp-client'
export { FAIRPAY_SYSTEM_PROMPT, buildSystemPrompt, resolveSystemPromptTier } from './system-prompt'
export type { BuildSystemPromptOptions, SystemPromptTier } from './system-prompt'
export { PHASE3_TOOL_DEFINITIONS, MCP_TOOL_NAMES, LEGACY_TOOL_NAMES } from './tool-definitions'
export type {
  ConversationMessage,
  ProcessTurnResult,
  AssistantToolCall,
  AssistantChatFn,
  AssistantChatCompletion,
  OrchestratorDeps,
  LegacyToolExecutor,
  McpClientInterface,
} from './types'
