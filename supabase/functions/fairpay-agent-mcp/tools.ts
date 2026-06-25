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
const ACTOR_REF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    email: { type: 'string', format: 'email' },
    display_name: { type: 'string', minLength: 1, maxLength: 200 },
  },
} as const

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const

export const MCP_TOOLS: readonly McpToolDefinition[] = [
  {
    name: 'fairpay_get_me',
    title: 'Get FairPay actor',
    description: 'Return the FairPay profile represented by the authenticated Supabase JWT.',
    inputSchema: { type: 'object', additionalProperties: false },
    annotations: READ_ONLY,
  },
  {
    name: 'fairpay_list_groups',
    title: 'List FairPay groups',
    description: 'List non-archived groups that the authenticated actor belongs to.',
    inputSchema: { type: 'object', additionalProperties: false },
    annotations: READ_ONLY,
  },
  {
    name: 'fairpay_list_group_members',
    title: 'List registered group members',
    description: 'List registered members of one group. Use member_id, which means group_members.id, in expense tools.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['group_id'],
      properties: { group_id: UUID_SCHEMA },
    },
    annotations: READ_ONLY,
  },
  {
    name: 'fairpay_resolve_expense_context',
    title: 'Resolve FairPay expense context',
    description:
      'Read-only preflight for an expense request. Confirms actor identity, group-vs-personal scope, group candidates, and member candidates before any preview is created.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        actor_confirmed: {
          type: 'boolean',
          description: 'True only after the user confirms their FairPay name/email.',
        },
        transaction_type: {
          type: 'string',
          enum: ['group', 'personal'],
          description: 'Ask the user whether this is group or personal before previewing.',
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
    },
    annotations: READ_ONLY,
  },
  {
    name: 'fairpay_check_expense_duplicates',
    title: 'Check duplicate expenses',
    description: 'Check recent group expenses for a likely duplicate before creating a preview.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
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
    annotations: READ_ONLY,
  },
  {
    name: 'fairpay_preview_expense',
    title: 'Preview a FairPay expense',
    description:
      'Validate and store an immutable VND group-expense preview. This never commits an expense; the user must confirm inside FairPay.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['group_id', 'description', 'amount', 'payer_member_id', 'split_method', 'participants'],
      properties: {
        group_id: UUID_SCHEMA,
        description: { type: 'string', minLength: 1, maxLength: 200 },
        amount: VND_SCHEMA,
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
        payer_member_id: UUID_SCHEMA,
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
      },
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: 'fairpay_get_operation',
    title: 'Get expense operation status',
    description: 'Poll an agent expense operation by preview_id.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['preview_id'],
      properties: { preview_id: UUID_SCHEMA },
    },
    annotations: READ_ONLY,
  },
]

function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Tool arguments must be an object')
  }
  return value as Record<string, unknown>
}

function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${key} is required`)
  return value
}

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ') : ''
}

function actorKey(value: unknown): { email?: string; display_name?: string } {
  const obj = typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  return {
    ...(typeof obj.email === 'string' ? { email: obj.email.trim().toLowerCase() } : {}),
    ...(typeof obj.display_name === 'string' ? { display_name: obj.display_name.trim() } : {}),
  }
}

function resolveMembers(refs: unknown, members: Array<Record<string, unknown>>) {
  const list = Array.isArray(refs) ? refs : refs === undefined ? [] : [refs]
  return list.map((ref) => {
    const actor = actorKey(ref)
    const matches = members.filter((member) => {
      const email = typeof member.email === 'string' ? member.email.toLowerCase() : ''
      const fullName = normalize(member.full_name)
      return (actor.email && email === actor.email) || (actor.display_name && fullName === normalize(actor.display_name))
    })
    return {
      requested: actor,
      status: matches.length === 1 ? 'resolved' : matches.length > 1 ? 'ambiguous_member' : 'not_group_member',
      candidates: matches.map((member) => ({
        member_id: member.member_id,
        user_id: member.user_id,
        full_name: member.full_name,
        email: member.email,
      })),
    }
  })
}

async function resolveExpenseContext(transport: AgentApiTransport, args: Record<string, unknown>) {
  const me = await transport.request('GET', '/v1/me') as Record<string, unknown>
  if (args.actor_confirmed !== true) {
    return {
      status: 'needs_clarification',
      reason: 'actor_confirmation_required',
      message: 'Ask the user to confirm their FairPay name/email before previewing.',
      actor: me,
    }
  }

  if (args.transaction_type === undefined) {
    return {
      status: 'needs_clarification',
      reason: 'transaction_type_required',
      message: 'Ask whether this is a group transaction or a personal/1-on-1 transaction.',
      actor: me,
    }
  }

  if (args.transaction_type === 'personal') {
    return {
      status: 'unsupported_personal',
      reason: 'personal_not_supported',
      message: 'Personal/1-on-1 agent-created transactions are not supported yet.',
      actor: me,
    }
  }

  if (args.transaction_type !== 'group') {
    return {
      status: 'needs_clarification',
      reason: 'invalid_transaction_type',
      message: 'transaction_type must be "group" or "personal".',
      actor: me,
    }
  }

  const groupsResponse = await transport.request('GET', '/v1/groups') as { groups?: Array<Record<string, unknown>> }
  const groups = Array.isArray(groupsResponse.groups) ? groupsResponse.groups : []
  const groupName = normalize(args.group_name)
  const groupMatches = typeof args.group_id === 'string'
    ? groups.filter((group) => group.id === args.group_id)
    : groupName
      ? groups.filter((group) => normalize(group.name) === groupName)
      : []

  if (groupMatches.length === 0) {
    return {
      status: 'needs_clarification',
      reason: 'group_required',
      message: 'Ask which FairPay group this expense belongs to.',
      actor: me,
      groups,
    }
  }

  if (groupMatches.length > 1) {
    return {
      status: 'ambiguous_group',
      message: 'Ask the user to select the exact group.',
      actor: me,
      candidates: groupMatches,
    }
  }

  const group = groupMatches[0]
  const membersResponse = await transport.request('GET', `/v1/groups/${encodeURIComponent(String(group.id))}/members`) as {
    members?: Array<Record<string, unknown>>
  }
  const members = Array.isArray(membersResponse.members) ? membersResponse.members : []
  const payer = resolveMembers(args.payer, members)[0] ?? null
  const participants = resolveMembers(args.participants, members)
  const unresolved = [payer, ...participants].filter((result) => result && result.status !== 'resolved')

  return {
    status: unresolved.length === 0 ? 'ready' : 'needs_clarification',
    reason: unresolved.length === 0 ? undefined : 'member_resolution_required',
    actor: me,
    group,
    payer,
    participants,
    members,
  }
}

export function createMcpToolExecutor(transport: AgentApiTransport) {
  return async (name: string, rawArguments: unknown): Promise<unknown> => {
    const args = requireObject(rawArguments)

    switch (name) {
      case 'fairpay_get_me':
        return transport.request('GET', '/v1/me')
      case 'fairpay_list_groups':
        return transport.request('GET', '/v1/groups')
      case 'fairpay_list_group_members':
        return transport.request('GET', `/v1/groups/${encodeURIComponent(requireString(args, 'group_id'))}/members`)
      case 'fairpay_resolve_expense_context':
        return resolveExpenseContext(transport, args)
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

export default createMcpToolExecutor
