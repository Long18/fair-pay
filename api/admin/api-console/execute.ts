import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { catalog } from '../../../src/modules/admin/api-docs/catalog'
import type { ApiCatalogEntry } from '../../../src/modules/admin/api-docs/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 30_000
const MAX_RESPONSE_BYTES = 1_048_576 // 1 MB
const OPERATION_BY_ID: ReadonlyMap<string, ApiCatalogEntry> = new Map(
  catalog.map((entry) => [entry.id, entry])
)
const BLOCKED_OPERATION_IDS = new Set<string>(['http-api-admin-api-console-execute'])

/** Allowed target host patterns (SSRF protection) */
const ALLOWED_HOST_PATTERNS = [
  /^localhost(:\d+)?$/,
  /\.vercel\.app$/,
  /\.supabase\.co$/,
  /\.supabase\.in$/,
  /^fairpay\./,
]

/** Header keys that are redacted in echoed request (prevent secret leakage) */
const REDACTED_HEADER_KEYS = ['authorization', 'x-service-key', 'apikey', 'x-api-key', 'cookie']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    out[k] = REDACTED_HEADER_KEYS.includes(k.toLowerCase()) ? '[REDACTED]' : v
  }
  return out
}

function isAllowedHost(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ALLOWED_HOST_PATTERNS.some((re) => re.test(parsed.hostname))
  } catch {
    return false
  }
}

function isAbsoluteUrl(target: string): boolean {
  return /^https?:\/\//i.test(target)
}

function getRequestOrigin(req: VercelRequest): string {
  const forwardedHost = typeof req.headers['x-forwarded-host'] === 'string'
    ? req.headers['x-forwarded-host'].split(',')[0]?.trim()
    : undefined
  const host = forwardedHost || req.headers.host
  if (!host) return 'http://localhost'

  const forwardedProto = typeof req.headers['x-forwarded-proto'] === 'string'
    ? req.headers['x-forwarded-proto'].split(',')[0]?.trim()
    : undefined
  const proto = forwardedProto || (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

function resolveHttpTargetUrl(req: VercelRequest, target: string, supabaseUrl: string): string {
  if (isAbsoluteUrl(target)) return target
  if (target.startsWith('/api/')) return new URL(target, getRequestOrigin(req)).toString()
  return new URL(target, supabaseUrl).toString()
}

function sanitizeForwardHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    if (REDACTED_HEADER_KEYS.includes(k.toLowerCase())) continue
    out[k] = v
  }
  return out
}

function truncate(data: unknown): unknown {
  const json = JSON.stringify(data)
  if (json.length <= MAX_RESPONSE_BYTES) return data
  return {
    _truncated: true,
    _size_bytes: json.length,
    _preview: json.slice(0, 500),
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — admin-only, restrict to same origin in production
  const appUrl = process.env.VITE_APP_URL
  if (!appUrl) {
    return res.status(500).json({ success: false, status: 500, duration_ms: 0, error: 'Server misconfiguration: VITE_APP_URL not set' })
  }
  res.setHeader('Access-Control-Allow-Origin', appUrl)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, status: 405, duration_ms: 0, error: 'Method not allowed' })
  }

  const start = Date.now()

  // ── Step 1: Extract + validate JWT ──────────────────────────────────────────

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, status: 401, duration_ms: 0, error: 'Missing Authorization header' })
  }
  const token = authHeader.slice(7)

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return res.status(500).json({ success: false, status: 500, duration_ms: 0, error: 'Server misconfiguration' })
  }

  // Validate token by getting user via supabase-js
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (authError || !user) {
    return res.status(401).json({ success: false, status: 401, duration_ms: Date.now() - start, error: 'Invalid or expired token' })
  }

  // ── Step 2: Verify admin role ────────────────────────────────────────────────

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Call is_admin() with the user's JWT so auth.uid() resolves correctly inside the function
  const { data: isAdmin } = await authClient.rpc('is_admin')

  // Fallback: always check user_roles table directly with service role as a safety net
  let adminVerified = isAdmin === true
  if (!adminVerified) {
    const { data: roleRow } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    adminVerified = roleRow?.role === 'admin'
  }

  if (!adminVerified) {
    return res.status(403).json({ success: false, status: 403, duration_ms: Date.now() - start, error: 'Admin access required' })
  }

  // ── Step 3: Parse + validate request body ────────────────────────────────────

  const { operation_id, transport, target, method, query, headers: reqHeaders, body, rpc_args, run_mode } = req.body as {
    operation_id: string
    transport: 'http' | 'rpc'
    target: string
    method?: string
    query?: Record<string, string>
    headers?: Record<string, string>
    body?: unknown
    rpc_args?: Record<string, unknown>
    run_mode: string
  }

  if (!operation_id || !transport || !target) {
    return res.status(400).json({ success: false, status: 400, duration_ms: Date.now() - start, error: 'Missing required fields: operation_id, transport, target' })
  }

  // ── Step 4: Allowlist operation_id ───────────────────────────────────────────
  const VALID_ID_PATTERN = /^[a-z][a-z0-9-]*$/
  if (!VALID_ID_PATTERN.test(operation_id) || operation_id.length > 100) {
    return res.status(400).json({ success: false, status: 400, duration_ms: Date.now() - start, error: 'Invalid operation_id' })
  }

  const allowedEntry = OPERATION_BY_ID.get(operation_id)
  if (!allowedEntry || BLOCKED_OPERATION_IDS.has(operation_id)) {
    return res.status(403).json({ success: false, status: 403, duration_ms: Date.now() - start, error: 'operation_id is not allowlisted' })
  }

  if (allowedEntry.callability === 'disabled') {
    return res.status(403).json({ success: false, status: 403, duration_ms: Date.now() - start, error: 'Operation is disabled in the API console' })
  }

  if (allowedEntry.kind !== transport) {
    return res.status(400).json({ success: false, status: 400, duration_ms: Date.now() - start, error: 'transport does not match allowlisted operation' })
  }

  const expectedTarget = transport === 'http' ? allowedEntry.path : allowedEntry.function_name
  if (!expectedTarget || expectedTarget !== target) {
    return res.status(400).json({ success: false, status: 400, duration_ms: Date.now() - start, error: 'target does not match allowlisted operation' })
  }

  const requestMethod = (method ?? allowedEntry.method ?? 'GET').toUpperCase()
  if (transport === 'http' && allowedEntry.method && requestMethod !== allowedEntry.method.toUpperCase()) {
    return res.status(400).json({ success: false, status: 400, duration_ms: Date.now() - start, error: 'method does not match allowlisted operation' })
  }

  // ── Step 5: Host restriction (SSRF protection) ───────────────────────────────

  const resolvedTargetUrl = transport === 'http'
    ? resolveHttpTargetUrl(req, target, supabaseUrl)
    : null

  if (transport === 'http') {
    if (!resolvedTargetUrl || !isAllowedHost(resolvedTargetUrl)) {
      return res.status(403).json({ success: false, status: 403, duration_ms: Date.now() - start, error: `Target host not in allowlist` })
    }
  }

  // ── Step 6: Execute ──────────────────────────────────────────────────────────

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let responseData: unknown
  let responseStatus = 200

  try {
    if (transport === 'rpc') {
      const execClient = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await execClient.rpc(target as any, rpc_args ?? {})
      if (error) {
        responseStatus = 500
        responseData = { error: error.message }
      } else {
        responseData = data
      }
    } else {
      const urlObj = new URL(resolvedTargetUrl!)
      if (query) {
        Object.entries(query).forEach(([k, v]) => urlObj.searchParams.set(k, v))
      }

      const forwardedHeaders = sanitizeForwardHeaders(reqHeaders ?? {})
      const isInternalApiCall = !isAbsoluteUrl(target) && target.startsWith('/api/')
      const defaultAuthorization = isInternalApiCall ? `Bearer ${token}` : `Bearer ${serviceKey}`

      const resp = await fetch(urlObj.toString(), {
        method: requestMethod,
        headers: {
          'Content-Type': 'application/json',
          Authorization: defaultAuthorization,
          ...forwardedHeaders,
        },
        body: body != null ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      responseStatus = resp.status
      const ct = resp.headers.get('content-type') ?? ''
      if (ct.includes('application/json')) {
        responseData = await resp.json()
      } else {
        responseData = await resp.text()
      }
    }
  } catch (err) {
    const isAbort = (err as Error).name === 'AbortError'
    return res.status(504).json({
      success: false,
      status: 504,
      duration_ms: Date.now() - start,
      error: isAbort ? 'Execution timed out' : (err as Error).message,
    })
  } finally {
    clearTimeout(timeoutId)
  }

  // ── Step 7: Audit log ────────────────────────────────────────────────────────

  // Fire-and-forget audit event (non-blocking)
  adminClient.from('audit_logs').insert({
    actor_id: user.id,
    action_type: 'admin_api_console_execute',
    entity_type: 'api_operation',
    entity_id: operation_id,
    metadata: {
      transport,
      target,
      method: transport === 'http' ? requestMethod : method ?? null,
      run_mode,
      status: responseStatus,
      duration_ms: Date.now() - start,
    },
  }).then(() => void 0).catch(() => void 0)

  // ── Step 8: Respond ──────────────────────────────────────────────────────────

  const duration_ms = Date.now() - start
  return res.status(200).json({
    success: responseStatus >= 200 && responseStatus < 300,
    status: responseStatus,
    duration_ms,
    data: truncate(responseData),
    request_echo: {
      operation_id,
      transport,
      target,
      method: transport === 'http' ? requestMethod : method ?? null,
      query: query ?? null,
      headers: reqHeaders ? redactHeaders(reqHeaders) : null,
      run_mode,
    },
  })
}
