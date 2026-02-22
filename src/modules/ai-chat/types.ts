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
  { name: 'get_groups', description: 'List groups the user belongs to', requires_confirmation: false, admin_only: false },
  { name: 'get_group_details', description: 'Get details of a specific group', requires_confirmation: false, admin_only: false },
  { name: 'create_group', description: 'Create a new expense group', requires_confirmation: true, admin_only: false },
  { name: 'add_expense', description: 'Add a new expense to a group or friend', requires_confirmation: true, admin_only: false },
  { name: 'get_expenses', description: 'List recent expenses', requires_confirmation: false, admin_only: false },
  { name: 'record_payment', description: 'Record a payment between users', requires_confirmation: true, admin_only: false },
  { name: 'admin_get_metrics', description: 'Get admin dashboard metrics', requires_confirmation: false, admin_only: true },
  { name: 'admin_query_audit_log', description: 'Query audit logs', requires_confirmation: false, admin_only: true },
];

/** OpenAI-format tool definitions for Puter.js AI */
export const PUTER_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_debt_summary',
      description: 'Get debt overview showing who owes whom for the current user',
      parameters: { type: 'object', properties: {}, required: [] as string[] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_groups',
      description: 'List all expense groups the user belongs to',
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
  {
    type: 'function' as const,
    function: {
      name: 'create_group',
      description: 'Create a new expense group. Requires user confirmation.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Group name' },
          description: { type: 'string', description: 'Optional group description' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_expense',
      description: 'Add a new expense to a group or friend. Requires user confirmation.',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Expense description' },
          amount: { type: 'number', description: 'Amount in currency' },
          currency: { type: 'string', description: 'Currency code (default VND)' },
          category: { type: 'string', description: 'Expense category' },
          group_id: { type: 'string', description: 'Group ID (if group expense)' },
          friendship_id: { type: 'string', description: 'Friendship ID (if friend expense)' },
          split_method: { type: 'string', description: 'Split method (default equal)' },
        },
        required: ['description', 'amount'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'record_payment',
      description: 'Record a payment from current user to another user. Requires user confirmation.',
      parameters: {
        type: 'object',
        properties: {
          to_user_id: { type: 'string', description: 'User ID to pay' },
          amount: { type: 'number', description: 'Payment amount' },
          currency: { type: 'string', description: 'Currency code (default VND)' },
          group_id: { type: 'string', description: 'Group ID (if group payment)' },
          note: { type: 'string', description: 'Optional payment note' },
        },
        required: ['to_user_id', 'amount'],
      },
    },
  },
];
