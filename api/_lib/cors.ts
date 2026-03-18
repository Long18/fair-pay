import type { VercelResponse } from '@vercel/node'

/**
 * Set CORS headers using VITE_APP_URL. Fails closed — if VITE_APP_URL is not set,
 * no Access-Control-Allow-Origin header is sent (browser blocks cross-origin by default).
 */
export function setCorsHeaders(res: VercelResponse): VercelResponse {
  const origin = process.env.VITE_APP_URL
  if (!origin) {
    // Fail closed: no CORS header means browser blocks cross-origin requests
    return res
  }
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}

/**
 * Handle CORS preflight (OPTIONS) request.
 * Returns true if the response was handled (caller should return immediately).
 * Returns false if the caller should continue processing.
 */
export function handleCorsPreflightIfNeeded(
  req: { method?: string },
  res: VercelResponse
): boolean {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}

/**
 * Check if VITE_APP_URL is configured. Returns true if missing (caller should return 500).
 */
export function isCorsConfigMissing(): boolean {
  return !process.env.VITE_APP_URL
}
