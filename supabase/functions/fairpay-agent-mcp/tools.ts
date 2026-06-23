export interface McpToolDefinition {
  name: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
  annotations: {
    readOnlyHint: boolean
    destructiveHint: boolean
    idempotentHint: boolean
    openWorldHint: boolean
  }
}

export interface AgentApiTransport {
  request(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>): Promise<unknown>
}

const UUID_SCHEMA = { type: 'string', format: 'uuid' } as const
const VND_SCHEMA = { type: 'integer', minimum: 1, maximum: 9_999_999_999 } as const

export const MCP_TOOLS: readonly McpToolDefinition[] = [
  {
    name: 'fairpay_get_me',
    title: 'Get FairPay actor',
    description: 'Return the FairPay profile represented by the authenticated Supabase JWT.',
    inputSchema: { type: 'object', additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'fairpay_list_groups',
    title: 'List FairPay groups',
    description: 'List non-archived groups that the authenticated actor belongs to.',
    inputSchema: { type: 'object', additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'fairpay_list_group_members',
    title: 'List registered group members',
    description: 'List registered members of one group. Use member_id, which means group_members.id, in expense tools.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['group_id'],
      properties: { group_id: UUID_SCHEMA },
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'fairpay_check_expense_duplicates',
    title: 'Check duplicate expenses',
    description: 'Check recent group expenses for a likely duplicate before creating a preview.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      required: ['group_id', 'description', 'amount', 'payer_member_id'],
      properties: {
        group_id: UUID_SCHEMA,
        description: { type: 'string', minLength: 1, maxLength: 200 },
        amount: VND_SCHEMA,
        payer_member_id: UUID_SCHEMA,
        expense_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        window_hours: { type: 'integer', minimum: 1, maximum: 168 },
      },
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'fairpay_preview_expense',
    title: 'Preview a FairPay expense',
    description: 'Validate and store an immutable VND group-expense preview. This never commits an expense; the user must confirm inside FairPay.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      required: ['group_id', 'description', 'amount', 'payer_member_id', 'split_method', 'participants'],
      properties: {
        group_id: UUID_SCHEMA,
        description: { type: 'string', minLength: 1, maxLength: 200 },
        amount: VND_SCHEMA,
        currency: { type: 'string', const: 'VND' },
        category: {
          type: 'string',
          enum: ['Food & Drink', 'Transportation', 'Accommodation', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Education', 'Other'],
        },
        expense_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        comment: { type: ['string', 'null'], maxLength: 1000 },
        payer_member_id: UUID_SCHEMA,
        split_method: { type: 'string', enum: ['equal', 'exact', 'fixed_then_equal_remainder'] },
        participants: {
          type: 'array', minItems: 1, maxItems: 100,
          items: {
            type: 'object', additionalProperties: false, required: ['member_id'],
            properties: {
              member_id: UUID_SCHEMA,
              amount: VND_SCHEMA,
              fixed_amount: VND_SCHEMA,
            },
          },
        },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'fairpay_get_operation',
    title: 'Get expense operation status',
    description: 'Poll an agent expense operation by preview_id.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['preview_id'],
      properties: { preview_id: UUID_SCHEMA },
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
] as const

function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Tool arguments must be an object')
  }
  return value as Record<string, unknown>
}

function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${key} is required`)
  return value
}

export function createMcpToolExecutor(transport: AgentApiTransport) {
  return async (name: string, rawArguments: unknown): Promise<unknown> => {
    const args = requireObject(rawArguments ?? {})

    switch (name) {
      case 'fairpay_get_me':
        return transport.request('GET', '/v1/me')
      case 'fairpay_list_groups':
        return transport.request('GET', '/v1/groups')
      case 'fairpay_list_group_members':
        return transport.request('GET', `/v1/groups/${encodeURIComponent(requireString(args, 'group_id'))}/members`)
      case 'fairpay_check_expense_duplicates':
        return transport.request('POST', '/v1/expense-duplicate-checks', args)
      case 'fairpay_preview_expense':
        return transport.request('POST', '/v1/expenses/preview', args)
      case 'fairpay_get_operation':
        return transport.request('GET', `/v1/operations/${encodeURIComponent(requireString(args, 'preview_id'))}`)
      default:
        throw new Error(`Unknown or forbidden FairPay tool: ${name}`)
    }
  }
}
