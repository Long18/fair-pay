import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, isAllowedOrigin } from './_cors.ts'
import { handleMcpMessage, SUPPORTED_PROTOCOL_VERSIONS } from './protocol.ts'
import { AgentApiTransportClient } from './rest-client.ts'
import { createMcpToolExecutor } from './tools.ts'
import { okJson } from '../_shared/agent-response.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const AGENT_API_URL = `${SUPABASE_URL}/functions/v1/fairpay-agent-api`
const MAX_REQUEST_BYTES = 64 * 1024

// MCP protocol errors use the JSON-RPC 2.0 envelope, not the standard API envelope.
function protocolError(req: Request, status: number, code: number, message: string): Response {
  return okJson({ jsonrpc: '2.0', id: null, error: { code, message } }, corsHeaders(req), status)
}

serve(async (req: Request) => {
  if (!isAllowedOrigin(req)) return protocolError(req, 403, -32000, 'Origin not allowed')
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) })
  if (req.method === 'GET' || req.method === 'DELETE') {
    return new Response(null, { status: 405, headers: { ...corsHeaders(req), allow: 'POST, OPTIONS' } })
  }
  if (req.method !== 'POST') return protocolError(req, 405, -32600, 'Method not allowed')

  const authorization = req.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return protocolError(req, 401, -32001, 'Supabase Bearer token required')
  }

  const accept = req.headers.get('accept')?.toLowerCase() ?? ''
  if (!accept.includes('application/json') || !accept.includes('text/event-stream')) {
    return protocolError(req, 406, -32002, 'Accept must include application/json and text/event-stream')
  }

  const declaredLength = Number(req.headers.get('content-length') ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return protocolError(req, 413, -32004, 'MCP request is too large')
  }

  let message: unknown
  try {
    const rawBody = await req.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return protocolError(req, 413, -32004, 'MCP request is too large')
    }
    message = JSON.parse(rawBody)
  } catch {
    return protocolError(req, 400, -32700, 'Parse error')
  }

  const method = typeof message === 'object' && message !== null && !Array.isArray(message)
    ? (message as Record<string, unknown>).method
    : null
  if (method !== 'initialize') {
    const protocolVersion = req.headers.get('mcp-protocol-version')
    if (!protocolVersion || !SUPPORTED_PROTOCOL_VERSIONS.has(protocolVersion)) {
      return protocolError(req, 400, -32003, 'Supported MCP-Protocol-Version header required')
    }
  }

  const transport = new AgentApiTransportClient(AGENT_API_URL, authorization, SUPABASE_ANON_KEY)
  const result = await handleMcpMessage(message, createMcpToolExecutor(transport))
  if (result.status === 202) {
    return new Response(null, { status: 202, headers: corsHeaders(req) })
  }
  return okJson(result.body, corsHeaders(req))
})
