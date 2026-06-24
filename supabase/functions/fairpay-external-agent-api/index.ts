// fairpay-external-agent-api — unauthenticated external agent intake.
//
// Routes:
//   GET  /v1/agent-context               → capability/discovery document
//   POST /v1/external-agent-submissions  → store a no-key expense proposal
//     - empty body or {} → probe mode: returns capability document
//     - structured payload → stores proposal, returns submission + trace_id
//
// Proposals are queued only. Authenticated FairPay users approve in the UI
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

// -- Response helpers ------------------------------------------------------
// trace_id is threaded into every response envelope for end-to-end debugging.

function jsonRes(data: Record<string, unknown> | unknown, status = 200, traceId?: string): Response {
  const body = traceId
    ? { trace_id: traceId, ...(data !== null && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : { data }) }
    : data
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS })
}

function errRes(status: number, code: string, message: string, details?: unknown, traceId?: string): Response {
  const errBody: Record<string, unknown> = { code, message }
  if (details !== undefined) errBody.details = details
  const body: Record<string, unknown> = { error: errBody }
  if (traceId) body.trace_id = traceId
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS })
}

// -- Utilities -------------------------------------------------------------

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
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// parseText reads, size-checks, and JSON-parses the body.
// Returns { value, rawError } — rawError is a Response ready to return on failure.
function parseText(text: string): { value: unknown; rawError?: Response } {
  if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
    return { value: null, rawError: errRes(413, 'REQUEST_TOO_LARGE', 'Submission payload is too large') }
  }
  try {
    return { value: JSON.parse(text) }
  } catch {
    return { value: null, rawError: errRes(400, 'INVALID_JSON', 'Request body is not valid JSON') }
  }
}

// isProbe returns true when the body signals "tell me what you do" rather than
// a real submission — empty string, whitespace-only, or bare {}.
function isProbe(rawText: string): boolean {
  const trimmed = rawText.trim()
  return !trimmed || trimmed === '{}'
}

// -- Route handlers --------------------------------------------------------

function handleAgentContext(traceId: string): Response {
  return jsonRes(AgentContextService.build() as unknown as Record<string, unknown>, 200, traceId)
}

async function handleSubmission(rawText: string, req: Request, traceId: string): Promise<Response> {
  if (!supabaseUrlValid) {
    return errRes(503, 'FAIRPAY_HOST_UNRESOLVED', supabaseUrlError, undefined, traceId)
  }

  const { value, rawError } = parseText(rawText)
  if (rawError) return rawError

  const parsed = ExternalAgentSubmissionRequest.safeParse(value)
  if (!parsed.success) {
    return errRes(422, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.issues, traceId)
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
    if (
      message.includes('ENOTFOUND') ||
      message.includes('EAI_AGAIN') ||
      message.includes('ECONNREFUSED') ||
      message.includes('Could not resolve host')
    ) {
      return errRes(
        503,
        'FAIRPAY_HOST_UNRESOLVED',
        `Unable to resolve FairPay host: ${new URL(SUPABASE_URL).hostname}. ` +
        `Verify DNS/network access, base URL configuration, and deployment status. ` +
        `This is a network/base URL issue, not a FairPay transaction validation error.`,
        undefined,
        traceId,
      )
    }
    if (message.includes('RATE_LIMIT_EXCEEDED')) {
      return errRes(429, 'RATE_LIMIT_EXCEEDED', 'Too many submissions; retry later', undefined, traceId)
    }
    if (message.includes('PENDING_LIMIT_EXCEEDED')) {
      return errRes(409, 'PENDING_LIMIT_EXCEEDED', 'Too many pending submissions for this target', undefined, traceId)
    }
    return errRes(422, 'SUBMISSION_FAILED', message, undefined, traceId)
  }

  return jsonRes(
    { ...data, message: 'Submission queued for FairPay approval' },
    201,
    traceId,
  )
}

// -- Entry point -----------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })

  const traceId = crypto.randomUUID()

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/fairpay-external-agent-api/, '')

  // GET /v1/agent-context — capability discovery
  if (req.method === 'GET' && path === '/v1/agent-context') {
    return handleAgentContext(traceId)
  }

  // POST /v1/external-agent-submissions — proposal intake
  if (req.method === 'POST' && path === '/v1/external-agent-submissions') {
    const rawText = await req.text()
    // Probe mode: empty body or bare {} → return discovery doc so agents can
    // self-orient without a separate GET /context call.
    if (isProbe(rawText)) return handleAgentContext(traceId)
    return handleSubmission(rawText, req, traceId)
  }

  return errRes(404, 'NOT_FOUND', `No route: ${req.method} ${url.pathname}`, undefined, traceId)
})
