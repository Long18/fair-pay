// Phase 3 — Puter tool definitions given to the AI model.
//
// Phase 2 MCP tools (fairpay_*) are routed to the MCP endpoint.
// Legacy read tools are routed to the ai-chat edge function.
//
// confirm and commit are intentionally absent — they are never offered
// to the model. The FairPay UI confirmation flow calls them exclusively.

const UUID_SCHEMA = { type: 'string', format: 'uuid' } as const
const VND_SCHEMA = { type: 'integer', minimum: 1, maximum: 9_999_999_999 } as const

/** The set of tools routed to the Phase 2 MCP endpoint. */
export const MCP_TOOL_NAMES: ReadonlySet<string> = new Set([
  'fairpay_get_me',
  'fairpay_list_groups',
  'fairpay_list_group_members',
  'fairpay_check_expense_duplicates',
  'fairpay_preview_expense',
  'fairpay_get_operation',
])

export const LEGACY_TOOL_NAMES: ReadonlySet<string> = new Set([
  'get_debt_summary',
  'get_debt_details',
  'get_group_details',
  'get_expenses',
])

/** OpenAI-format tool definitions sent to Puter AI. */
export const PHASE3_TOOL_DEFINITIONS: ReadonlyArray<{ type: 'function'; function: Record<string, unknown> }> = [
  // ── Phase 2 MCP tools ─────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'fairpay_get_me',
      description:
        'Return the FairPay actor identity (user_id, email, full_name) derived from the current Supabase JWT. Call this when you need the actor\'s own member info.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fairpay_list_groups',
      description:
        'List non-archived groups the authenticated user belongs to. Returns group_id values needed for expense creation.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fairpay_list_group_members',
      description:
        'List registered members of a group. Returns member_id (group_members.id), user_id, full_name, and email. Always call this before creating an expense — use member_id (not user_id) for payer_member_id and participants.',
      parameters: {
        type: 'object',
        properties: { group_id: { ...UUID_SCHEMA, description: 'Group UUID from fairpay_list_groups' } },
        required: ['group_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fairpay_check_expense_duplicates',
      description:
        'Check for likely duplicate expenses in a group before calling fairpay_preview_expense.',
      parameters: {
        type: 'object',
        properties: {
          group_id: UUID_SCHEMA,
          description: { type: 'string', minLength: 1, maxLength: 200 },
          amount: { ...VND_SCHEMA, description: 'Integer VND amount' },
          payer_member_id: { ...UUID_SCHEMA, description: 'group_members.id of the payer' },
          expense_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          window_hours: { type: 'integer', minimum: 1, maximum: 168 },
        },
        required: ['group_id', 'description', 'amount', 'payer_member_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fairpay_preview_expense',
      description:
        'Validate and store an immutable VND group-expense preview. The FairPay UI shows a confirmation card — do NOT call confirm or commit yourself. The user must click the card.',
      parameters: {
        type: 'object',
        properties: {
          group_id: UUID_SCHEMA,
          description: { type: 'string', minLength: 1, maxLength: 200 },
          amount: { ...VND_SCHEMA, description: 'Total in VND (integer, no decimals)' },
          currency: { type: 'string', const: 'VND' },
          category: {
            type: 'string',
            enum: [
              'Food & Drink', 'Transportation', 'Accommodation', 'Entertainment',
              'Shopping', 'Utilities', 'Healthcare', 'Education', 'Other',
            ],
          },
          expense_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          comment: { type: ['string', 'null'], maxLength: 1000 },
          payer_member_id: { ...UUID_SCHEMA, description: 'group_members.id of who paid' },
          split_method: {
            type: 'string',
            enum: ['equal', 'exact', 'fixed_then_equal_remainder'],
            description: 'equal=even split; exact=specify each amount; fixed_then_equal_remainder=fixed for some + remainder split equally',
          },
          participants: {
            type: 'array',
            minItems: 1,
            maxItems: 100,
            items: {
              type: 'object',
              properties: {
                member_id: { ...UUID_SCHEMA, description: 'group_members.id' },
                amount: { ...VND_SCHEMA, description: 'For exact split: this member\'s share (VND)' },
                fixed_amount: { ...VND_SCHEMA, description: 'For fixed_then_equal_remainder: this member\'s fixed portion (VND)' },
              },
              required: ['member_id'],
              additionalProperties: false,
            },
          },
          confirmed_ambiguous_member_ids: {
            type: 'array',
            items: UUID_SCHEMA,
            description: 'Workflow-only. Include an ambiguous member_id only after the user explicitly selected that candidate by member_id/email.',
          },
        },
        required: ['group_id', 'description', 'amount', 'payer_member_id', 'split_method', 'participants'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fairpay_get_operation',
      description: 'Poll the status of an agent expense operation by preview_id.',
      parameters: {
        type: 'object',
        properties: {
          preview_id: { ...UUID_SCHEMA, description: 'preview_id from fairpay_preview_expense' },
        },
        required: ['preview_id'],
      },
    },
  },
  // ── Legacy read tools (routed to ai-chat edge function) ────────────────
  {
    type: 'function',
    function: {
      name: 'get_debt_summary',
      description:
        'Get a debt overview showing who owes whom for the current user. Returns aggregated totals per counterparty. For expense-level detail, use get_debt_details with a counterparty_id from this result.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_debt_details',
      description:
        'Get detailed expense-level debt breakdown with a specific counterparty. Returns each expense: description, date, amount owed, settlement status, and group context.',
      parameters: {
        type: 'object',
        properties: {
          counterparty_id: { type: 'string', description: 'UUID from get_debt_summary' },
        },
        required: ['counterparty_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_group_details',
      description: 'Get details of a specific group including members and recent expenses.',
      parameters: {
        type: 'object',
        properties: { group_id: { type: 'string', description: 'Group UUID' } },
        required: ['group_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_expenses',
      description: 'List recent expenses, optionally filtered by group.',
      parameters: {
        type: 'object',
        properties: {
          group_id: { type: 'string', description: 'Optional group UUID to filter by' },
          limit: { type: 'number', description: 'Max results (default 10)' },
        },
        required: [],
      },
    },
  },
]
