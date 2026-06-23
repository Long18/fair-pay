// Agent API-specific CORS helper.
// Distinct from the shared getCorsHeaders so the agent path can grow its own
// header set (notably idempotency-key) without affecting other functions.
//
// Uses APP_URL env var; falls back to https://long-pay.vercel.app for prod.

const ALLOWED_HEADERS = [
  'authorization',
  'apikey',
  'content-type',
  'x-client-info',
  'idempotency-key',
].join(', ')

const ALLOWED_METHODS = 'GET, POST, OPTIONS'

const PROD_FALLBACK_ORIGIN = 'https://long-pay.vercel.app'

export function getAgentApiCorsHeaders(): Record<string, string> {
  const raw = Deno.env.get('APP_URL')?.replace(/\/$/, '')
  const origin = raw && raw.length > 0 ? raw : PROD_FALLBACK_ORIGIN
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  }
}

export function handleAgentApiCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getAgentApiCorsHeaders() })
  }
  return null
}
