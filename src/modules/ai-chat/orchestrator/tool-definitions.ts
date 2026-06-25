const UUID_SCHEMA = { type: 'string', format: 'uuid' } as const
const VND_SCHEMA = { type: 'integer', minimum: 1, maximum: 9_999_999_999 } as const

const ACTOR_REF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    email: { type: 'string', format: 'email' },
    display_name: { type: 'string', minLength: 1, maxLength: 200 },
  },
} as const

export const MCP_TOOL_NAMES: ReadonlySet<string> = new Set([
  'fairpay_get_me',
  'fairpay_list_groups',
  'fairpay_list_group_members',
  'fairpay_resolve_expense_context',
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

export const PHASE3_TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'fairpay_get_me',
      description:
        'Return the FairPay actor identity (user_id, email, full_name) derived from the current Supabase JWT.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fairpay_list_groups',
      description: 'List non-archived groups the authenticated user belongs to.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fairpay_list_group_members',
      description:
        'List registered members of a group. Returns member_id (group_members.id), user_id, full_name, and email.',
      parameters: {
        type: 'object',
        properties: {
          group_id: { ...UUID_SCHEMA, description: 'Group UUID from fairpay_list_groups' },
        },
        required: ['group_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fairpay_resolve_expense_context',
      description:
        'Read-only preflight for an expense request. Use before fairpay_preview_expense to confirm actor identity, group-vs-personal scope, group, payer, and participants.',
      parameters: {
        type: 'object',
        properties: {
          actor_confirmed: {
            type: 'boolean',
            description: 'True only after the user confirms their FairPay name/email.',
          },
          transaction_type: {
            type: 'string',
            enum: ['group', 'personal'],
            description: 'Ask the user whether this is a group or personal transaction.',
          },
          group_id: UUID_SCHEMA,
          group_name: { type: 'string', minLength: 1, maxLength: 200 },
          payer: ACTOR_REF_SCHEMA,
          participants: {
            type: 'array',
            maxItems: 100,
            items: ACTOR_REF_SCHEMA,
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fairpay_check_expense_duplicates',
      description: 'Check for likely duplicate expenses in a group before calling fairpay_preview_expense.',
      parameters: {
        type: 'object',
        properties: {
          group_id: UUID_SCHEMA,
          description: { type: 'string', minLength: 1, maxLength: 200 },
          amount: { ...VND_SCHEMA, description: 'Integer VND amount' },
          payer_member_id: { ...UUID_SCHEMA, description: 'group_members.id of payer' },
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
        'Validate and store an immutable VND group-expense preview. The FairPay UI shows a confirmation card. Do not call confirm or commit.',
      parameters: {
        type: 'object',
        properties: {
          actor_confirmed: {
            type: 'boolean',
            description: 'Workflow-only. Must be true after the user confirms their FairPay name/email.',
          },
          transaction_type: {
            type: 'string',
            enum: ['group', 'personal'],
            description: 'Workflow-only. Must be group; personal is not supported by agent preview.',
          },
          group_id: UUID_SCHEMA,
          description: { type: 'string', minLength: 1, maxLength: 200 },
          amount: { ...VND_SCHEMA, description: 'Total in VND (integer, no decimals)' },
          currency: { type: 'string', const: 'VND' },
          category: {
            type: 'string',
            enum: [
              'Food & Drink',
              'Transportation',
              'Accommodation',
              'Entertainment',
              'Shopping',
              'Utilities',
              'Healthcare',
              'Education',
              'Other',
            ],
          },
          expense_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          comment: { type: ['string', 'null'], maxLength: 1000 },
          payer_member_id: { ...UUID_SCHEMA, description: 'group_members.id of payer' },
          split_method: { type: 'string', enum: ['equal', 'exact', 'fixed_then_equal_remainder'] },
          participants: {
            type: 'array',
            minItems: 1,
            maxItems: 100,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['member_id'],
              properties: {
                member_id: UUID_SCHEMA,
                amount: VND_SCHEMA,
                fixed_amount: VND_SCHEMA,
              },
            },
          },
          confirmed_ambiguous_member_ids: {
            type: 'array',
            items: UUID_SCHEMA,
            description:
              'Workflow-only. Include an ambiguous member_id only after the user explicitly selected that candidate by member_id/email.',
          },
        },
        required: [
          'actor_confirmed',
          'transaction_type',
          'group_id',
          'description',
          'amount',
          'payer_member_id',
          'split_method',
          'participants',
        ],
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
  {
    type: 'function',
    function: {
      name: 'get_debt_summary',
      description:
        'Get a debt overview showing who owes whom for the current user. Returns aggregated totals per counterparty.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_debt_details',
      description:
        'Get detailed expense-level debt breakdown with a specific counterparty. Returns description, date, owed amount, settlement status, and group context.',
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
        properties: {
          group_id: { type: 'string', description: 'Group UUID' },
        },
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
] as const
