// TypeScript types for the FairPay Agent API v1.
// These mirror the Zod contracts in the Edge Function and are the
// source of truth for SDK consumers.

export type SplitMethod = 'equal' | 'exact' | 'fixed_then_equal_remainder'
export type OperationStatus = 'pending' | 'previewed' | 'confirmed' | 'committed' | 'failed' | 'expired'
export type MemberRole = 'admin' | 'member'
export type DuplicateMatchType = 'strong' | 'likely'
export type ExpenseCategory =
  | 'Food & Drink' | 'Transportation' | 'Accommodation' | 'Entertainment'
  | 'Shopping' | 'Utilities' | 'Healthcare' | 'Education' | 'Other'

// -- Read types ---------------------------------------------------------

export interface AgentMe {
  user: {
    id: string
    email: string
    full_name: string
    avatar_url: string | null
  }
}

export interface AgentGroupSummary {
  id: string
  name: string
  description: string | null
  is_archived: boolean
  member_count: number
  member_role: MemberRole
}

export interface AgentGroupsResponse {
  groups: AgentGroupSummary[]
}

export interface AgentGroupMember {
  member_id: string   // group_members.id — always use this for payer/participant references
  user_id: string     // profiles.id
  role: MemberRole
  full_name: string
  email: string | null
  avatar_url: string | null
}

export interface AgentGroupMembersResponse {
  group_id: string
  members: AgentGroupMember[]
}

// -- Duplicate check ----------------------------------------------------

export interface AgentDuplicateCheckRequest {
  group_id: string
  description: string
  amount: number          // integer VND
  payer_member_id: string // group_members.id
  expense_date?: string   // YYYY-MM-DD
  window_hours?: number
}

export interface AgentDuplicateMatch {
  expense_id: string
  match_type: DuplicateMatchType
  reason: string
  description: string
  amount: number
  expense_date: string
  created_at: string
}

export interface AgentDuplicateCheckResponse {
  matches: AgentDuplicateMatch[]
}

// -- Preview ------------------------------------------------------------

export interface AgentPreviewParticipant {
  member_id: string       // group_members.id
  amount?: number         // for 'exact' splits
  fixed_amount?: number   // for 'fixed_then_equal_remainder'
}

export interface AgentPreviewRequest {
  group_id: string
  description: string
  amount: number          // integer VND
  currency?: 'VND'
  category?: ExpenseCategory
  expense_date?: string   // YYYY-MM-DD
  comment?: string | null
  payer_member_id: string // group_members.id
  split_method: SplitMethod
  participants: AgentPreviewParticipant[]
}

export interface AgentPreviewSplit {
  member_id: string
  user_id: string
  full_name: string
  amount: number
}

export interface AgentPreviewDetail {
  group_id: string
  group_name: string
  description: string
  amount: number
  currency: 'VND'
  category: string | null
  expense_date: string
  comment: string | null
  payer: {
    member_id: string
    user_id: string
    full_name: string
  }
  requested_split_method: SplitMethod
  splits: AgentPreviewSplit[]
  total_check: number
}

export interface AgentPreviewResponse {
  preview_id: string
  preview_hash: string
  operation_id: string
  expires_at: string
  preview: AgentPreviewDetail
  duplicate_warnings: AgentDuplicateMatch[]
}

// -- Confirm ------------------------------------------------------------

export interface AgentConfirmRequest {
  preview_hash: string
}

export interface AgentConfirmResponse {
  confirmation_id: string
  preview_id: string
  preview_hash: string
  expires_at: string
}

// -- Commit (UI controller only — NOT in model tool list) ---------------

export interface AgentCommitRequest {
  preview_id: string
  preview_hash: string
  confirmation_id: string
}

export interface AgentCommitResponse {
  success: true
  expense_id: string
  preview_id: string
  operation_id: string
  total_amount: number
  currency: 'VND'
  splits_count: number
}

// -- Operation polling --------------------------------------------------

export interface AgentOperationResponse {
  operation_id: string
  preview_id: string | null
  status: OperationStatus
  result: unknown | null
  error: unknown | null
  created_at: string
  updated_at: string
}

// -- Error envelope -----------------------------------------------------

export interface AgentApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export function isAgentApiError(v: unknown): v is AgentApiError {
  return (
    typeof v === 'object' &&
    v !== null &&
    'error' in v &&
    typeof (v as AgentApiError).error?.code === 'string'
  )
}
