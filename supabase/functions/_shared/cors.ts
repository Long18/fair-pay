// Shared CORS helper for Supabase Edge Functions
// Uses APP_URL env var (NOT VITE_APP_URL — Vite prefix has no meaning in Deno)

export function getCorsHeaders(): Record<string, string> {
  const origin = Deno.env.get('APP_URL')
  if (!origin) {
    // Fail closed: no CORS header
    return { 'Content-Type': 'application/json' }
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  }
}

export function handleCorsPreflightIfNeeded(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders() })
  }
  return null
}
