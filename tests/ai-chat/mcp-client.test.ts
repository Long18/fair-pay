// Phase 3 tests — McpClient unit tests.
// All network calls are mocked via vi.stubGlobal('fetch', ...).

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  McpClient,
  McpClientError,
  MCP_PROTOCOL_VERSION,
  FORBIDDEN_MCP_TOOLS,
} from '../../src/modules/ai-chat/orchestrator/mcp-client'

const ENDPOINT = 'https://example.supabase.co/functions/v1/fairpay-agent-mcp'
const ANON_KEY = 'test-anon-key'
const JWT = 'eyJhbGciOiJIUzI1NiJ9.test'

function makeClient(overrides?: { getToken?: () => Promise<string | null>; fetchImpl?: typeof fetch }) {
  return new McpClient({
    endpointUrl: ENDPOINT,
    getToken: overrides?.getToken ?? (() => Promise.resolve(JWT)),
    anonKey: ANON_KEY,
    fetchImpl: overrides?.fetchImpl,
  })
}

function mockFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body ?? '{}')) as { method?: string }
    if (request.method === 'initialize') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0', id: 1,
        result: { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: 'test', version: '1' } },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (request.method === 'notifications/initialized') return new Response(null, { status: 202 })
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  })
}

function toolCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter((call) => {
    const request = JSON.parse(String((call[1] as RequestInit | undefined)?.body ?? '{}')) as { method?: string }
    return request.method === 'tools/call'
  }) as Array<[string, RequestInit]>
}

afterEach(() => vi.restoreAllMocks())

// ── Forbidden tools ────────────────────────────────────────────────────────

describe('McpClient — forbidden tools', () => {
  it('blocks all known confirm/commit tool names before making any network call', async () => {
    const fetchMock = vi.fn()
    const client = makeClient({ fetchImpl: fetchMock as unknown as typeof fetch })

    const forbiddenList = Array.from(FORBIDDEN_MCP_TOOLS)
    for (const name of forbiddenList) {
      await expect(client.callTool(name, {})).rejects.toThrow(McpClientError)
      await expect(client.callTool(name, {})).rejects.toMatchObject({ code: -32601 })
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not block legitimate read tools', async () => {
    const fetchMock = mockFetch({
      jsonrpc: '2.0',
      id: 1,
      result: { structuredContent: { groups: [] }, isError: false },
    })
    const client = makeClient({ fetchImpl: fetchMock as unknown as typeof fetch })

    const result = await client.callTool('fairpay_list_groups', {})
    expect(result).toEqual({ groups: [] })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})

// ── Request shape ──────────────────────────────────────────────────────────

describe('McpClient — request headers and body', () => {
  it('sends correct MCP-Protocol-Version, Authorization, apikey, and Accept headers', async () => {
    const fetchMock = mockFetch({
      jsonrpc: '2.0', id: 1,
      result: { structuredContent: { user: { id: 'actor' } }, isError: false },
    })
    const client = makeClient({ fetchImpl: fetchMock as unknown as typeof fetch })

    await client.callTool('fairpay_get_me', {})

    const calls = (fetchMock as ReturnType<typeof vi.fn>).mock.calls as Array<[string, RequestInit]>
    const initialize = calls[0]
    const [url, init] = toolCalls(fetchMock as ReturnType<typeof vi.fn>)[0]
    expect(url).toBe(ENDPOINT)
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers['mcp-protocol-version']).toBe(MCP_PROTOCOL_VERSION)
    expect(headers['authorization']).toBe(`Bearer ${JWT}`)
    expect(headers['apikey']).toBe(ANON_KEY)
    expect(headers['accept']).toContain('application/json')
    expect(headers['accept']).toContain('text/event-stream')
    expect((initialize[1].headers as Record<string, string>)['mcp-protocol-version']).toBeUndefined()
    expect(JSON.parse(initialize[1].body as string).method).toBe('initialize')
  })

  it('encodes tool name and args in JSON-RPC tools/call body', async () => {
    const fetchMock = mockFetch({
      jsonrpc: '2.0', id: 1,
      result: { structuredContent: { members: [] }, isError: false },
    })
    const client = makeClient({ fetchImpl: fetchMock as unknown as typeof fetch })

    const args = { group_id: 'grp-uuid-123' }
    await client.callTool('fairpay_list_group_members', args)

    const [, init] = toolCalls(fetchMock as ReturnType<typeof vi.fn>)[0]
    const body = JSON.parse(init.body as string)
    expect(body).toMatchObject({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'fairpay_list_group_members', arguments: args },
    })
  })

  it('increments id monotonically across calls', async () => {
    const fetchMock = mockFetch({ jsonrpc: '2.0', id: 0, result: { structuredContent: null, isError: false } }) as ReturnType<typeof vi.fn>
    const client = makeClient({ fetchImpl: fetchMock as unknown as typeof fetch })

    await client.callTool('fairpay_get_me', {})
    await client.callTool('fairpay_list_groups', {})

    const calls = toolCalls(fetchMock)
    const id1 = JSON.parse(calls[0][1].body as string).id
    const id2 = JSON.parse(calls[1][1].body as string).id
    expect(id2).toBeGreaterThan(id1)
  })

  it('initializes once and sends the initialized notification before tool calls', async () => {
    const fetchMock = mockFetch({ jsonrpc: '2.0', id: 3, result: { structuredContent: {} } }) as ReturnType<typeof vi.fn>
    const client = makeClient({ fetchImpl: fetchMock as unknown as typeof fetch })
    await client.callTool('fairpay_get_me', {})
    await client.callTool('fairpay_list_groups', {})

    const methods = fetchMock.mock.calls.map((call) => JSON.parse(String((call[1] as RequestInit).body)).method)
    expect(methods).toEqual(['initialize', 'notifications/initialized', 'tools/call', 'tools/call'])
  })
})

// ── Response parsing ───────────────────────────────────────────────────────

describe('McpClient — response parsing', () => {
  it('returns structuredContent when present', async () => {
    const payload = { groups: [{ id: 'g1', name: 'Nhóm A' }] }
    const fetchMock = mockFetch({
      jsonrpc: '2.0', id: 1,
      result: { structuredContent: payload, content: [{ type: 'text', text: JSON.stringify(payload) }], isError: false },
    })
    const client = makeClient({ fetchImpl: fetchMock as unknown as typeof fetch })

    expect(await client.callTool('fairpay_list_groups', {})).toEqual(payload)
  })

  it('falls back to parsed text when structuredContent is absent', async () => {
    const payload = { members: [] }
    const fetchMock = mockFetch({
      jsonrpc: '2.0', id: 1,
      result: { content: [{ type: 'text', text: JSON.stringify(payload) }], isError: false },
    })
    const client = makeClient({ fetchImpl: fetchMock as unknown as typeof fetch })

    expect(await client.callTool('fairpay_list_group_members', { group_id: 'g' })).toEqual(payload)
  })

  it('returns raw text string when text is not valid JSON', async () => {
    const fetchMock = mockFetch({
      jsonrpc: '2.0', id: 1,
      result: { content: [{ type: 'text', text: 'plain text result' }], isError: false },
    })
    const client = makeClient({ fetchImpl: fetchMock as unknown as typeof fetch })

    expect(await client.callTool('fairpay_get_me', {})).toBe('plain text result')
  })

  it('returns null when result has no content and no structuredContent', async () => {
    const fetchMock = mockFetch({ jsonrpc: '2.0', id: 1, result: { isError: false } })
    const client = makeClient({ fetchImpl: fetchMock as unknown as typeof fetch })

    expect(await client.callTool('fairpay_get_me', {})).toBeNull()
  })
})

// ── Error handling ─────────────────────────────────────────────────────────

describe('McpClient — error handling', () => {
  it('throws McpClientError when not authenticated (no token)', async () => {
    const client = makeClient({ getToken: () => Promise.resolve(null) })
    await expect(client.callTool('fairpay_get_me', {})).rejects.toMatchObject({
      name: 'McpClientError',
      code: -32001,
    })
  })

  it('throws McpClientError on non-OK HTTP response with JSON-RPC error body', async () => {
    const fetchMock = mockFetch(
      { jsonrpc: '2.0', id: 1, error: { code: -32003, message: 'Supported MCP-Protocol-Version header required' } },
      400,
    )
    const client = makeClient({ fetchImpl: fetchMock as unknown as typeof fetch })

    await expect(client.callTool('fairpay_get_me', {})).rejects.toMatchObject({
      code: -32003,
      message: expect.stringContaining('MCP-Protocol-Version'),
    })
  })

  it('throws McpClientError on HTTP 401', async () => {
    const fetchMock = mockFetch({ error: { code: -32001, message: 'Unauthorized' } }, 401)
    const client = makeClient({ fetchImpl: fetchMock as unknown as typeof fetch })
    await expect(client.callTool('fairpay_get_me', {})).rejects.toMatchObject({ code: -32001 })
  })

  it('throws McpClientError when result.isError is true', async () => {
    const fetchMock = mockFetch({
      jsonrpc: '2.0', id: 1,
      result: {
        content: [{ type: 'text', text: 'group not found' }],
        isError: true,
      },
    })
    const client = makeClient({ fetchImpl: fetchMock as unknown as typeof fetch })

    await expect(
      client.callTool('fairpay_list_group_members', { group_id: 'bad-id' }),
    ).rejects.toMatchObject({ code: -32603, message: 'group not found' })
  })

  it('throws McpClientError when fetch itself rejects (network failure)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const client = makeClient({ fetchImpl: fetchMock as unknown as typeof fetch })
    await expect(client.callTool('fairpay_get_me', {})).rejects.toMatchObject({
      name: 'McpClientError',
    })
  })
})

// ── MCP tool catalog contains no financial write ops ──────────────────────

describe('McpClient — catalog safety', () => {
  it('FORBIDDEN_MCP_TOOLS covers common confirm/commit spellings', () => {
    const required = ['confirm', 'commit', 'fairpay_confirm_expense', 'fairpay_commit_expense']
    for (const name of required) {
      expect(FORBIDDEN_MCP_TOOLS.has(name)).toBe(true)
    }
  })
})
