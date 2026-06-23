// Phase 3 — Stateless JSON-RPC client for the Phase 2 MCP endpoint.
//
// The server is stateless, but the MCP lifecycle still requires initialize
// before the first tool call. Each client instance performs it once.
//
// SAFETY: confirm and commit are NOT in the Phase 2 catalog and are also
// hard-blocked here as defense in depth so the model can never get them.

import type { McpClientInterface } from './types'

export const MCP_PROTOCOL_VERSION = '2025-11-25'

/**
 * Tool names the MCP catalog never exposes. Hard-blocked client-side as a
 * defense-in-depth check so an injected/hallucinated tool name can't slip
 * through to the network.
 */
export const FORBIDDEN_MCP_TOOLS: ReadonlySet<string> = new Set([
  'fairpay_confirm_expense',
  'fairpay_commit_expense',
  'confirm_expense',
  'commit_expense',
  'confirm',
  'commit',
  'add_expense',
  'record_payment',
  'payment',
  'settle',
  'settle_all',
])

export class McpClientError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly data?: unknown,
  ) {
    super(message)
    this.name = 'McpClientError'
  }
}

interface JsonRpcResponse {
  jsonrpc?: string
  id?: unknown
  result?: {
    protocolVersion?: string
    content?: Array<{ type: string; text: string }>
    structuredContent?: unknown
    isError?: boolean
  }
  error?: { code: number; message: string; data?: unknown }
}

export interface McpClientOptions {
  endpointUrl: string
  /** Returns the current Supabase JWT or null if signed out. */
  getToken: () => Promise<string | null>
  /** Supabase anon key required by the Edge Function gateway. */
  anonKey: string
  /** Override fetch (used by tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch
}

/**
 * Lightweight JSON-RPC client for the Phase 2 MCP endpoint. One request per
 * tool call; no persistent session — matches the stateless server contract.
 */
export class McpClient implements McpClientInterface {
  private nextId = 1
  private initialization: Promise<void> | null = null
  private readonly endpointUrl: string
  private readonly getToken: () => Promise<string | null>
  private readonly anonKey: string
  private readonly fetchImpl: typeof fetch

  constructor(options: McpClientOptions) {
    this.endpointUrl = options.endpointUrl
    this.getToken = options.getToken
    this.anonKey = options.anonKey
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  /**
   * Call a Phase 2 MCP tool with the current user's Supabase JWT.
   * Returns structuredContent when present, otherwise the parsed text.
   *
   * Throws McpClientError for: forbidden tools, missing auth, HTTP errors,
   * JSON-RPC errors, and tool execution errors (isError: true).
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (FORBIDDEN_MCP_TOOLS.has(name)) {
      throw new McpClientError(
        -32601,
        `Tool '${name}' is not available. Financial confirmation and commit are not exposed to AI tool callers — the FairPay UI handles them.`,
      )
    }

    const token = await this.getToken()
    if (!token) {
      throw new McpClientError(-32001, 'Not authenticated — Supabase session missing.')
    }

    await this.ensureInitialized(token)
    const body = await this.sendRequest('tools/call', { name, arguments: args }, token, true)
    return this.toolResult(body)
  }

  private async ensureInitialized(token: string): Promise<void> {
    if (!this.initialization) {
      this.initialization = this.initialize(token).catch((error) => {
        this.initialization = null
        throw error
      })
    }
    return this.initialization
  }

  private async initialize(token: string): Promise<void> {
    const body = await this.sendRequest('initialize', {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'fairpay-internal-agent', version: '3.0.0' },
    }, token, false)
    const negotiated = body.result?.protocolVersion
    if (negotiated !== MCP_PROTOCOL_VERSION) {
      throw new McpClientError(-32003, `Unsupported negotiated MCP protocol version: ${String(negotiated)}`)
    }
    await this.sendInitializedNotification(token)
  }

  private async sendInitializedNotification(token: string): Promise<void> {
    let response: Response
    try {
      response = await this.fetchImpl(this.endpointUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          authorization: `Bearer ${token}`,
          apikey: this.anonKey,
          'mcp-protocol-version': MCP_PROTOCOL_VERSION,
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      })
    } catch (caught) {
      throw new McpClientError(-32000, caught instanceof Error ? caught.message : 'MCP initialization failed')
    }
    if (response.status !== 202) {
      throw new McpClientError(-32000, `MCP initialized notification returned HTTP ${response.status}`)
    }
  }

  private async sendRequest(
    method: string,
    params: Record<string, unknown>,
    token: string,
    includeProtocolHeader: boolean,
  ): Promise<JsonRpcResponse> {
    const id = this.nextId++
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      authorization: `Bearer ${token}`,
      apikey: this.anonKey,
    }
    if (includeProtocolHeader) headers['mcp-protocol-version'] = MCP_PROTOCOL_VERSION

    let res: Response
    try {
      res = await this.fetchImpl(this.endpointUrl, {
        method: 'POST',
        headers: {
          ...headers,
        },
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      })
    } catch (err) {
      throw new McpClientError(
        -32000,
        err instanceof Error ? err.message : 'MCP endpoint unreachable',
      )
    }

    let body: JsonRpcResponse | null = null
    try {
      body = (await res.json()) as JsonRpcResponse
    } catch {
      // Empty/invalid body
    }

    if (!res.ok) {
      const code = typeof body?.error?.code === 'number' ? body.error.code : -32000
      const message = body?.error?.message ?? `MCP endpoint returned HTTP ${res.status}`
      throw new McpClientError(code, message, body?.error?.data)
    }

    if (body?.error) {
      throw new McpClientError(body.error.code, body.error.message, body.error.data)
    }

    return body ?? {}
  }

  private toolResult(body: JsonRpcResponse): unknown {
    const result = body.result
    if (result?.isError) {
      const text = result.content?.[0]?.text ?? 'Tool execution failed'
      throw new McpClientError(-32603, text)
    }

    if (result && Object.prototype.hasOwnProperty.call(result, 'structuredContent')) {
      return result.structuredContent
    }
    const text = result?.content?.[0]?.text
    if (typeof text === 'string') {
      try {
        return JSON.parse(text)
      } catch {
        return text
      }
    }
    return null
  }
}
