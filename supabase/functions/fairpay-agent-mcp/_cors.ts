const PROD_ORIGIN = 'https://long-pay.vercel.app'
const LOCAL_ORIGINS = ['http://127.0.0.1:3000', 'http://localhost:3000']

export function allowedOrigins(): Set<string> {
  const configured = Deno.env.get('APP_URL')?.replace(/\/$/, '')
  return new Set([PROD_ORIGIN, ...LOCAL_ORIGINS, ...(configured ? [configured] : [])])
}

export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  return origin === null || allowedOrigins().has(origin)
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin')
  const allowOrigin = origin && allowedOrigins().has(origin) ? origin : PROD_ORIGIN
  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'authorization, apikey, content-type, accept, mcp-protocol-version',
    'access-control-max-age': '600',
    vary: 'Origin',
  }
}
