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
      group_id: 'g', description: 'Lunch', amount: 100000,
      payer_member_id: 'payer', split_method: 'equal', participants: [{ member_id: 'payer' }],
    }
    await execute('fairpay_preview_expense', preview)
    expect(request).toHaveBeenCalledWith('POST', '/v1/expenses/preview', preview)
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
