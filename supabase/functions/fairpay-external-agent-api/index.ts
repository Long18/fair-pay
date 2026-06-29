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
import { buildAgentContext } from './agent-context.ts'
import { okJson, errJson, parseBody, newTraceId } from '../_shared/agent-response.ts'

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
// INTENTIONAL: This endpoint uses wildcard CORS (Access-Control-Allow-Origin: *)
// because it is a PUBLIC discovery + intake API designed for unauthenticated
// external AI agents (LLMs, bots) that can originate from any host.
// No authenticated user data is returned without proper authorization.
// All submissions are queued for human approval before any expense is created.
// Security review: 2026-06-28 — wildcard confirmed intentional for this endpoint.

// content-type is injected by okJson/errJson from _shared/agent-response.ts
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

// isProbe returns true when the body signals "tell me what you do" rather than
// a real submission — empty string, whitespace-only, or bare {}.
function isProbe(rawText: string): boolean {
  const trimmed = rawText.trim()
  return !trimmed || trimmed === '{}'
}

// -- Route handlers --------------------------------------------------------

function handleAgentContext(traceId: string): Response {
  return okJson({ trace_id: traceId, ...buildAgentContext() }, CORS_HEADERS)
}

async function handleSubmission(rawText: string, req: Request, traceId: string): Promise<Response> {
  if (!supabaseUrlValid) {
    return errJson(503, 'FAIRPAY_HOST_UNRESOLVED', supabaseUrlError, CORS_HEADERS, undefined, traceId)
  }

  // Size-check and parse the already-read text (body was pre-read for isProbe check)
  if (new TextEncoder().encode(rawText).byteLength > MAX_REQUEST_BYTES) {
    return errJson(413, 'REQUEST_TOO_LARGE', 'Submission payload is too large', CORS_HEADERS, undefined, traceId)
  }
  let value: unknown
  try {
    value = JSON.parse(rawText)
  } catch {
    return errJson(400, 'INVALID_JSON', 'Request body is not valid JSON', CORS_HEADERS, undefined, traceId)
  }

  const parsed = ExternalAgentSubmissionRequest.safeParse(value)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues.find((item) => typeof item.code === 'string')
    const code = firstIssue?.code === 'NEEDS_CLARIFICATION' || firstIssue?.code === 'UNSUPPORTED_PERSONAL_TRANSACTION'
      ? firstIssue.code
      : 'VALIDATION_ERROR'
    const message = code === 'NEEDS_CLARIFICATION'
      ? 'Clarification required before submitting the proposal'
      : code === 'UNSUPPORTED_PERSONAL_TRANSACTION'
        ? 'Personal/1-on-1 agent-created transactions are not supported yet'
        : 'Invalid request body'
    return errJson(422, code, message, CORS_HEADERS, parsed.error.issues, traceId)
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
      return errJson(
        503,
        'FAIRPAY_HOST_UNRESOLVED',
        `Unable to resolve FairPay host: ${new URL(SUPABASE_URL).hostname}. ` +
        `Verify DNS/network access, base URL configuration, and deployment status. ` +
        `This is a network/base URL issue, not a FairPay transaction validation error.`,
        CORS_HEADERS,
        undefined,
        traceId,
      )
    }
    if (message.includes('RATE_LIMIT_EXCEEDED')) {
      return errJson(429, 'RATE_LIMIT_EXCEEDED', 'Too many submissions; retry later', CORS_HEADERS, undefined, traceId)
    }
    if (message.includes('PENDING_LIMIT_EXCEEDED')) {
      return errJson(409, 'PENDING_LIMIT_EXCEEDED', 'Too many pending submissions for this target', CORS_HEADERS, undefined, traceId)
    }
    return errJson(422, 'SUBMISSION_FAILED', message, CORS_HEADERS, undefined, traceId)
  }

  return okJson({ trace_id: traceId, ...data, message: 'Submission queued for FairPay approval' }, CORS_HEADERS, 201)
}

// -- Entry point -----------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })

  const traceId = newTraceId()

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

  return errJson(404, 'NOT_FOUND', `No route: ${req.method} ${url.pathname}`, CORS_HEADERS, undefined, traceId)
})
