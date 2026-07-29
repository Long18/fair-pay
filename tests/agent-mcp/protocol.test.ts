import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  handleMcpMessage,
  LATEST_PROTOCOL_VERSION,
} from '../../supabase/functions/fairpay-agent-mcp/protocol.ts'
import {
  createMcpToolExecutor,
  MCP_TOOLS,
  type AgentApiTransport,
} from '../../supabase/functions/fairpay-agent-mcp/tools.ts'
import { AgentApiTransportClient } from '../../supabase/functions/fairpay-agent-mcp/rest-client.ts'
import { isAllowedOrigin } from '../../supabase/functions/fairpay-agent-mcp/_cors.ts'

afterEach(() => vi.unstubAllGlobals())

describe('FairPay MCP protocol', () => {
  it('accepts the FairPay origin and rejects untrusted browser origins', () => {
    vi.stubGlobal('Deno', { env: { get: () => undefined } })
    expect(isAllowedOrigin(new Request('https://mcp.test', {
      headers: { origin: 'https://long-pay.vercel.app' },
    }))).toBe(true)
    expect(isAllowedOrigin(new Request('https://mcp.test', {
      headers: { origin: 'https://attacker.example' },
    }))).toBe(false)
  })

  it('negotiates the current protocol and declares tools', async () => {
    const result = await handleMcpMessage({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'test', version: '1' } },
    }, vi.fn())

    expect(result.status).toBe(200)
    expect(result.body?.result).toMatchObject({
      protocolVersion: LATEST_PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
    })
  })

  it('lists only non-committing Phase 2 tools', async () => {
    const result = await handleMcpMessage(
      { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
      vi.fn()
    )
    const names = MCP_TOOLS.map((tool) => tool.name)
    expect(result.status).toBe(200)
    expect(names).toContain('fairpay_preview_expense')
    expect(names.some((name) => /confirm|commit|payment|settle/i.test(name))).toBe(false)
  })

  it('returns 202 for notifications', async () => {
    const result = await handleMcpMessage(
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      vi.fn()
    )
    expect(result).toEqual({ status: 202, body: null })
  })

  it('returns 202 for client JSON-RPC responses', async () => {
    const result = await handleMcpMessage(
      { jsonrpc: '2.0', id: 9, result: {} },
      vi.fn()
    )
    expect(result).toEqual({ status: 202, body: null })
  })

  it('wraps tool output as text and structured content', async () => {
    const execute = vi.fn().mockResolvedValue({ groups: [] })
    const result = await handleMcpMessage({
      jsonrpc: '2.0', id: 'call-1', method: 'tools/call',
      params: { name: 'fairpay_list_groups', arguments: {} },
    }, execute)

    expect(execute).toHaveBeenCalledWith('fairpay_list_groups', {})
    expect(result.body?.result).toMatchObject({ isError: false, structuredContent: { groups: [] } })
  })

  it('returns tool errors without failing the JSON-RPC request', async () => {
    const result = await handleMcpMessage({
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'fairpay_commit_expense', arguments: {} },
    }, vi.fn().mockRejectedValue(new Error('forbidden')))

    expect(result.body?.result).toMatchObject({ isError: true })
  })

  it('rejects batches and unknown protocol methods', async () => {
    const batch = await handleMcpMessage([], vi.fn())
    const unknown = await handleMcpMessage({ jsonrpc: '2.0', id: 4, method: 'resources/list' }, vi.fn())
    expect(batch.body?.error).toMatchObject({ code: -32600 })
    expect(unknown.body?.error).toMatchObject({ code: -32601 })
  })
})

describe('FairPay MCP REST adapter', () => {
  function fakeTransport() {
    const request = vi.fn().mockResolvedValue({ ok: true })
    const transport: AgentApiTransport = { request }
    return { request, execute: createMcpToolExecutor(transport) }
  }

  it('maps read tools to versioned REST endpoints', async () => {
    const { request, execute } = fakeTransport()
    await execute('fairpay_get_me', {})
    await execute('fairpay_list_group_members', { group_id: 'group-id' })
    await execute('fairpay_get_operation', { preview_id: 'preview-id' })

    expect(request).toHaveBeenNthCalledWith(1, 'GET', '/v1/me')
    expect(request).toHaveBeenNthCalledWith(2, 'GET', '/v1/groups/group-id/members')
    expect(request).toHaveBeenNthCalledWith(3, 'GET', '/v1/operations/preview-id')
  })

  it('passes preview data to the REST preview endpoint without committing', async () => {
    const { request, execute } = fakeTransport()
    const preview = {
      actor_confirmed: true,
      transaction_type: 'group',
      group_id: 'g',
      description: 'Lunch',
      amount: 100000,
      payer_member_id: 'payer',
      split_method: 'equal',
      participants: [{ member_id: 'payer' }],
      confirmed_ambiguous_member_ids: ['payer'],
    }
    await execute('fairpay_preview_expense', preview)
    expect(request).toHaveBeenCalledWith('POST', '/v1/expenses/preview', {
      group_id: 'g',
      description: 'Lunch',
      amount: 100000,
      payer_member_id: 'payer',
      split_method: 'equal',
      participants: [{ member_id: 'payer' }],
    })
  })

  it('blocks preview without actor confirmation or group transaction type', async () => {
    const { request, execute } = fakeTransport()
    const base = {
      group_id: 'g',
      description: 'Lunch',
      amount: 100000,
      payer_member_id: 'payer',
      split_method: 'equal',
      participants: [{ member_id: 'payer' }],
    }

    await expect(execute('fairpay_preview_expense', base)).resolves.toMatchObject({
      status: 'needs_clarification',
      reason: 'actor_confirmation_required',
    })
    await expect(execute('fairpay_preview_expense', { ...base, actor_confirmed: true })).resolves.toMatchObject({
      status: 'needs_clarification',
      reason: 'transaction_type_required',
    })
    await expect(execute('fairpay_preview_expense', {
      ...base,
      actor_confirmed: true,
      transaction_type: 'personal',
    })).resolves.toMatchObject({
      status: 'unsupported_personal',
    })
    expect(request).not.toHaveBeenCalled()
  })

  it('rejects direct calls to forbidden tools', async () => {
    const { request, execute } = fakeTransport()
    await expect(execute('fairpay_commit_expense', {})).rejects.toThrow('Unknown or forbidden')
    expect(request).not.toHaveBeenCalled()
  })

  it('marks nested REST requests as internal MCP for operation audit', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user: { id: 'actor' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new AgentApiTransportClient('https://example.test', 'Bearer jwt', 'anon-key')
    await client.request('GET', '/v1/me')

    expect(fetchMock).toHaveBeenCalledWith('https://example.test/v1/me', expect.objectContaining({
      headers: expect.objectContaining({ 'x-fairpay-agent-source': 'internal_mcp' }),
    }))
  })
})

describe('FairPay MCP resolveExpenseContext', () => {
  const me = { user_id: 'u1', email: 'a@example.com', full_name: 'Alice' }
  const group = { id: 'g1', name: 'Trip' }
  const members = [
    { member_id: 'm1', user_id: 'u1', full_name: 'Alice', email: 'a@example.com' },
    { member_id: 'm2', user_id: 'u2', full_name: 'Bob', email: 'b@example.com' },
  ]

  function transportWithContext() {
    const request = vi.fn(async (method: string, path: string) => {
      if (path === '/v1/me') return me
      if (path === '/v1/groups') return { groups: [group] }
      if (path === '/v1/groups/g1/members') return { members }
      return { ok: true }
    })
    return { request, execute: createMcpToolExecutor({ request }) }
  }

  it('returns needs_clarification when payer is missing (never ready with null payer)', async () => {
    const { execute } = transportWithContext()
    const result = await execute('fairpay_resolve_expense_context', {
      actor_confirmed: true,
      transaction_type: 'group',
      group_id: 'g1',
    })
    expect(result).toMatchObject({
      status: 'needs_clarification',
      reason: 'payer_required',
    })
    expect((result as { payer?: unknown }).payer).toBeUndefined()
  })

  it('returns needs_clarification when participants are missing', async () => {
    const { execute } = transportWithContext()
    const result = await execute('fairpay_resolve_expense_context', {
      actor_confirmed: true,
      transaction_type: 'group',
      group_id: 'g1',
      payer: { email: 'a@example.com' },
    })
    expect(result).toMatchObject({
      status: 'needs_clarification',
      reason: 'participants_required',
    })
  })

  it('returns ready only when payer and participants all resolve', async () => {
    const { execute } = transportWithContext()
    const result = await execute('fairpay_resolve_expense_context', {
      actor_confirmed: true,
      transaction_type: 'group',
      group_id: 'g1',
      payer: { email: 'a@example.com' },
      participants: [{ email: 'a@example.com' }, { email: 'b@example.com' }],
    })
    expect(result).toMatchObject({
      status: 'ready',
      payer: { status: 'resolved' },
    })
    expect((result as { payer: { candidates: unknown[] } }).payer.candidates).toHaveLength(1)
  })

  it('resolves partial display names (e.g. Tuyến vs full name)', async () => {
    const request = vi.fn(async (method: string, path: string) => {
      if (path === '/v1/me') return me
      if (path === '/v1/groups') return { groups: [group] }
      if (path === '/v1/groups/g1/members') {
        return {
          members: [
            { member_id: 'm1', user_id: 'u1', full_name: 'Alice', email: 'a@example.com' },
            { member_id: 'm3', user_id: 'u3', full_name: 'Nguyễn Văn Tuyến', email: 'tuyen@example.com' },
          ],
        }
      }
      return { ok: true }
    })
    const execute = createMcpToolExecutor({ request })
    const result = await execute('fairpay_resolve_expense_context', {
      actor_confirmed: true,
      transaction_type: 'group',
      group_id: 'g1',
      payer: { email: 'a@example.com' },
      participants: [{ email: 'a@example.com' }, { display_name: 'Tuyến' }],
    })
    expect(result).toMatchObject({ status: 'ready' })
    const participants = (result as { participants: Array<{ status: string }> }).participants
    expect(participants[1]?.status).toBe('resolved')
  })

  it('returns needs_clarification for unresolved members', async () => {
    const { execute } = transportWithContext()
    const result = await execute('fairpay_resolve_expense_context', {
      actor_confirmed: true,
      transaction_type: 'group',
      group_id: 'g1',
      payer: { email: 'a@example.com' },
      participants: [{ email: 'missing@example.com' }],
    })
    expect(result).toMatchObject({
      status: 'needs_clarification',
      reason: 'member_resolution_required',
    })
  })
})
