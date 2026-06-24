// fairpay-external-agent-api — unauthenticated external agent intake.
//
// Routes:
//   GET  /v1/agent-context               → machine-readable capability document
//   POST /v1/external-agent-submissions  → store a no-key expense proposal
//
// Proposals are queued only. Authenticated FairPay users approve them in the UI
// before any real expense is created. Commit/confirm are never exposed here.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ExternalAgentSubmissionRequest } from './contracts.ts'
import { AgentContextService } from './agent-context.ts'

// -- Environment validation ------------------------------------------------
// Validate SUPABASE_URL at startup so mis-configuration surfaces early with a
// clear diagnostic rather than a cryptic DNS/network error later.

const RAW_SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const HASH_SALT = Deno.env.get('EXTERNAL_AGENT_IP_HASH_SALT') ?? 'fairpay-external-agent'
const MAX_REQUEST_BYTES = 32_768

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '')
  if (!trimmed) return ''
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
}

const SUPABASE_URL = normalizeBaseUrl(RAW_SUPABASE_URL)

// Validate host reachability at startup; surface as a clear diagnostic rather
// than mapping DNS failures to business-logic errors.
let supabaseUrlValid = false
let supabaseUrlError = ''
try {
  const parsed = new URL(SUPABASE_URL)
  if (!parsed.hostname) throw new Error('Empty hostname')
  supabaseUrlValid = true
} catch (e) {
  supabaseUrlError =
    `Unable to resolve FairPay Supabase host from SUPABASE_URL: "${RAW_SUPABASE_URL}". ` +
    `Verify DNS/network access, base URL configuration, and deployment status. ` +
    `This is a network/base URL issue, not a FairPay transaction validation error. ` +
    `Original error: ${e instanceof Error ? e.message : String(e)}`
  console.error('[fairpay-external-agent-api] BASE_URL_INVALID:', supabaseUrlError)
}

// -- CORS ------------------------------------------------------------------

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
}

// -- Helpers ---------------------------------------------------------------

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS })
}

function err(status: number, code: string, message: string, details?: unknown): Response {
  return json({ error: { code, message, ...(details === undefined ? {} : { details }) } }, status)
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return (
    req.headers.get('cf-connecting-ip')?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    forwarded ||
    'unknown'
  )
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function readJson(req: Request): Promise<{ value: unknown; response?: Response }> {
  const text = await req.text()
  if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
    return { value: null, response: err(413, 'REQUEST_TOO_LARGE', 'Submission payload is too large') }
  }
  if (!text.trim()) {
    return { value: null, response: err(400, 'INVALID_JSON', 'Request body is required') }
  }
  try {
    return { value: JSON.parse(text) }
  } catch {
    return { value: null, response: err(400, 'INVALID_JSON', 'Request body is not valid JSON') }
  }
}

// -- Route handlers --------------------------------------------------------

function handleAgentContext(): Response {
  return json(AgentContextService.build())
}

async function handleSubmission(req: Request): Promise<Response> {
  // Surface base-URL/DNS misconfiguration as a clear diagnostic before
  // attempting any network call — prevents DNS failures from appearing as
  // validation errors.
  if (!supabaseUrlValid) {
    return err(503, 'FAIRPAY_HOST_UNRESOLVED', supabaseUrlError)
  }

  const body = await readJson(req)
  if (body.response) return body.response

  const parsed = ExternalAgentSubmissionRequest.safeParse(body.value)
  if (!parsed.success) {
    return err(422, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.issues)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { apikey: SUPABASE_ANON_KEY } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const ipHash = await sha256Hex(`${HASH_SALT}:${clientIp(req)}`)
  const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null

  const { data, error: rpcErr } = await supabase.rpc('create_external_agent_submission', {
    p_payload: parsed.data,
    p_ip_hash: ipHash,
    p_user_agent: userAgent,
  })

  if (rpcErr) {
    const message = rpcErr.message ?? 'Submission failed'
    // Classify well-known network/host errors separately from business errors
    if (
      message.includes('ENOTFOUND') ||
      message.includes('EAI_AGAIN') ||
      message.includes('ECONNREFUSED') ||
      message.includes('Could not resolve host')
    ) {
      return err(503, 'FAIRPAY_HOST_UNRESOLVED',
        `Unable to resolve FairPay host: ${new URL(SUPABASE_URL).hostname}. ` +
        `Verify DNS/network access, base URL configuration, and deployment status. ` +
        `This is a network/base URL issue, not a FairPay transaction validation error.`
      )
    }
    if (message.includes('RATE_LIMIT_EXCEEDED')) {
      return err(429, 'RATE_LIMIT_EXCEEDED', 'Too many submissions; retry later')
    }
    if (message.includes('PENDING_LIMIT_EXCEEDED')) {
      return err(409, 'PENDING_LIMIT_EXCEEDED', 'Too many pending submissions for this target')
    }
    return err(422, 'SUBMISSION_FAILED', message)
  }

  return json({ ...data, message: 'Submission queued for FairPay approval' }, 201)
}

// -- Entry point -----------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/fairpay-external-agent-api/, '')

  // GET /v1/agent-context — capability discovery (no auth, no body)
  if (req.method === 'GET' && path === '/v1/agent-context') {
    return handleAgentContext()
  }

  // POST /v1/external-agent-submissions — proposal intake
  if (req.method === 'POST' && path === '/v1/external-agent-submissions') {
    return handleSubmission(req)
  }

  return err(404, 'NOT_FOUND', `No route: ${req.method} ${url.pathname}`)
})
