// @fairpay/agent-sdk — public surface
// Re-exports all types, the client class, and error classes.

// -- Types ------------------------------------------------------------------

export type {
  // Enums / literals
  SplitMethod,
  OperationStatus,
  MemberRole,
  DuplicateMatchType,
  ExpenseCategory,

  // Read types
  AgentMe,
  AgentGroupSummary,
  AgentGroupsResponse,
  AgentGroupMember,
  AgentGroupMembersResponse,

  // Duplicate check
  AgentDuplicateCheckRequest,
  AgentDuplicateMatch,
  AgentDuplicateCheckResponse,

  // Preview
  AgentPreviewParticipant,
  AgentPreviewRequest,
  AgentPreviewSplit,
  AgentPreviewDetail,
  AgentPreviewResponse,

  // Confirm
  AgentConfirmRequest,
  AgentConfirmResponse,

  // Commit (UI-only)
  AgentCommitRequest,
  AgentCommitResponse,

  // Operation polling
  AgentOperationResponse,

  // Error envelope
  AgentApiError,
} from './types.js'

export { isAgentApiError } from './types.js'

// -- Error classes ----------------------------------------------------------

export { FairPayApiError, RateLimitError } from './errors.js'

// -- Client -----------------------------------------------------------------

export { FairPayAgentClient } from './client.js'
export type { FairPayAgentClientOptions } from './client.js'
