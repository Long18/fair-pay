/** AI Chat message roles */
export type ChatRole = 'user' | 'assistant' | 'system';

/** Chat response mode */
export type ChatMode = 'info' | 'action';

/** Chat response status */
export type ChatStatus = 'success' | 'failure' | 'needs_confirmation' | 'needs_clarification';

import type { ReadDigestBag } from "./utils/format-read-digest";
import type { ChatEntitySurface } from "./utils/chat-entity-surface";
import type { AssistantToolTraceStep } from "./orchestrator/tool-trace";

/** A single chat message */
export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: ChatRole;
  content: string;
  metadata: ChatMessageMetadata;
  created_at: string;
}

/** Metadata attached to assistant messages */
export interface ChatMessageMetadata {
  mode?: ChatMode;
  status?: ChatStatus;
  /** Structured FairPay summary for intelligent UI rendering. */
  read_digest?: ReadDigestBag;
  /** Clickable list for group/friends/debt answers without full digest. */
  entity_surface?: ChatEntitySurface;
  assistant_capabilities?: boolean;
  tool_trace?: AssistantToolTraceStep[];
  response_language?: string;
  /** Needed to resolve friend names from digest payload. */
  viewer_user_id?: string;
  tool_name?: string;
  entity_type?: string;
  entity_id?: string;
  changed_fields?: string[];
  validation_errors?: string[];
  next_suggestions?: string[];
  trace_id?: string;
}

/** A chat conversation */
export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/** Response from the legacy read-only tool executor. */
export interface ToolExecuteResponse {
  status: 'success' | 'failure' | 'needs_confirmation' | 'rejected';
  result?: unknown;
  error?: string;
}
