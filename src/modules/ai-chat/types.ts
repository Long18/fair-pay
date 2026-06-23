/** AI Chat message roles */
export type ChatRole = 'user' | 'assistant' | 'system';

/** Chat response mode */
export type ChatMode = 'info' | 'action';

/** Chat response status */
export type ChatStatus = 'success' | 'failure' | 'needs_confirmation' | 'needs_clarification';

/** Pending action status */
export type PendingActionStatus = 'pending' | 'confirmed' | 'rejected' | 'expired';

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
  tool_name?: string;
  entity_type?: string;
  entity_id?: string;
  changed_fields?: string[];
  validation_errors?: string[];
  pending_action_id?: string;
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

/** Pending action requiring user confirmation */
export interface PendingAction {
  id: string;
  conversation_id: string;
  user_id: string;
  tool_name: string;
  tool_args: Record<string, unknown>;
  preview: ActionPreview;
  status: PendingActionStatus;
  expires_at: string;
  created_at: string;
  resolved_at: string | null;
}

/** Preview data shown to user before confirming */
export interface ActionPreview {
  summary: string;
  fields: Array<{ label: string; value: string }>;
  impact?: string;
}

/** Request payload sent to the Edge Function (tool executor) */
export interface ToolExecuteRequest {
  action: 'execute_tool' | 'confirm' | 'reject';
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  conversation_id?: string;
  confirm_action_id?: string;
  reject_action_id?: string;
}

/** Response from the Edge Function (tool executor) */
export interface ToolExecuteResponse {
  status: 'success' | 'failure' | 'needs_confirmation' | 'rejected';
  result?: unknown;
  error?: string;
  pending_action?: PendingAction;
}

/** Tool definition for the AI model */
export interface AiTool {
  name: string;
  description: string;
  requires_confirmation: boolean;
  admin_only: boolean;
}

/** Available tools list (for reference) */
export const AI_TOOLS: AiTool[] = [
  { name: 'get_debt_summary', description: 'Get debt overview for current user', requires_confirmation: false, admin_only: false },
  { name: 'get_debt_details', description: 'Get detailed expense-level debt breakdown with a specific person', requires_confirmation: false, admin_only: false },
  { name: 'get_groups', description: 'List groups the user belongs to', requires_confirmation: false, admin_only: false },
  { name: 'get_group_details', description: 'Get details of a specific group', requires_confirmation: false, admin_only: false },
  { name: 'get_expenses', description: 'List recent expenses', requires_confirmation: false, admin_only: false },
  // Phase 1A agent tools — routed to fairpay-agent-api (not ai-chat)
  { name: 'agent_get_group_members', description: 'Get group members with member_ids for expense creation', requires_confirmation: false, admin_only: false },
  { name: 'agent_check_duplicates', description: 'Check for potential duplicate expenses before creating', requires_confirmation: false, admin_only: false },
  { name: 'agent_preview_expense', description: 'Preview a group expense — UI handles confirmation', requires_confirmation: false, admin_only: false },
  { name: 'admin_get_metrics', description: 'Get admin dashboard metrics', requires_confirmation: false, admin_only: true },
  { name: 'admin_query_audit_log', description: 'Query audit logs', requires_confirmation: false, admin_only: true },
  // Disabled — legacy write tools are hard-rejected on the server (Phase 1A)
  // create_group, add_expense, record_payment → use fairpay-agent-api flow instead
];

/** OpenAI-format tool definitions for Puter.js AI */
export const PUTER_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_debt_summary',
      description: 'Get debt overview showing who owes whom for the current user. Returns aggregated totals per person. For detailed expense-level breakdown, use get_debt_details with a counterparty_id from this result.',
      parameters: { type: 'object', properties: {}, required: [] as string[] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_debt_details',
      description: 'Get detailed expense-level debt breakdown with a specific person. Returns each individual expense: what it was for (description), when (date), how much is owed, settlement status, and which group/friend context. Use this when the user asks for specifics about what they owe someone or what someone owes them. Requires a counterparty_id from get_debt_summary.',
      parameters: {
        type: 'object',
        properties: {
          counterparty_id: { type: 'string', description: 'The UUID of the counterparty (get from get_debt_summary results)' },
        },
        required: ['counterparty_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_groups',
      description: 'List all expense groups the user belongs to. Returns group_id values needed for expense creation.',
      parameters: { type: 'object', properties: {}, required: [] as string[] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_group_details',
      description: 'Get details of a specific group including members and recent expenses',
      parameters: {
        type: 'object',
        properties: { group_id: { type: 'string', description: 'The group ID' } },
        required: ['group_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_expenses',
      description: 'List recent expenses, optionally filtered by group',
      parameters: {
        type: 'object',
        properties: {
          group_id: { type: 'string', description: 'Optional group ID to filter by' },
          limit: { type: 'number', description: 'Max results (default 10)' },
        },
        required: [] as string[],
      },
    },
  },
  // Phase 1A: agent expense creation tools (routed to fairpay-agent-api)
  {
    type: 'function' as const,
    function: {
      name: 'agent_get_group_members',
      description: 'Get the registered members of a group, including their member_id. IMPORTANT: always use member_id (not user_id) when specifying payer or participants in agent_preview_expense.',
      parameters: {
        type: 'object',
        properties: {
          group_id: { type: 'string', description: 'Group UUID from get_groups' },
        },
        required: ['group_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'agent_check_duplicates',
      description: 'Check for potential duplicate expenses in a group. Call this before agent_preview_expense when in doubt.',
      parameters: {
        type: 'object',
        properties: {
          group_id: { type: 'string', description: 'Group UUID' },
          description: { type: 'string', description: 'Expense description' },
          amount: { type: 'integer', description: 'Amount in VND (integer, no decimals)' },
          payer_member_id: { type: 'string', description: 'member_id of the payer' },
          expense_date: { type: 'string', description: 'Date YYYY-MM-DD' },
        },
        required: ['group_id', 'description', 'amount', 'payer_member_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'agent_preview_expense',
      description: 'Preview a new group expense with split calculation. The UI will show a confirmation card for the user to approve — do NOT call confirm or commit yourself.',
      parameters: {
        type: 'object',
        properties: {
          group_id: { type: 'string', description: 'Group UUID' },
          description: { type: 'string', description: 'Expense description' },
          amount: { type: 'integer', description: 'Total amount in VND (integer — no decimals)' },
          payer_member_id: { type: 'string', description: 'member_id of who paid (from agent_get_group_members)' },
          split_method: {
            type: 'string',
            enum: ['equal', 'exact', 'fixed_then_equal_remainder'],
            description: 'How to split: equal=split evenly, exact=specify each amount, fixed_then_equal_remainder=some fixed + rest equal',
          },
          participants: {
            type: 'array',
            description: 'Who shares this expense. Use member_id from agent_get_group_members.',
            items: {
              type: 'object',
              properties: {
                member_id: { type: 'string', description: 'member_id from agent_get_group_members' },
                amount: { type: 'integer', description: 'For exact split: amount this member pays (VND)' },
                fixed_amount: { type: 'integer', description: 'For fixed_then_equal_remainder: this member fixed amount (VND)' },
              },
              required: ['member_id'],
            },
          },
          category: {
            type: 'string',
            enum: ['Food & Drink', 'Transportation', 'Accommodation', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Education', 'Other'],
            description: 'Expense category (optional)',
          },
          expense_date: { type: 'string', description: 'Date YYYY-MM-DD (optional, defaults to today)' },
          comment: { type: 'string', description: 'Optional comment or note' },
        },
        required: ['group_id', 'description', 'amount', 'payer_member_id', 'split_method', 'participants'],
      },
    },
  },
];
