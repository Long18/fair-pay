// fairpay-external-agent-api — unauthenticated external agent intake.
// This function stores proposals only. Authenticated FairPay users approve later.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ExternalAgentSubmissionRequest } from './contracts.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const HASH_SALT = Deno.env.get('EXTERNAL_AGENT_IP_HASH_SALT') ?? 'fairpay-external-agent'
const MAX_REQUEST_BYTES = 32_768

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/fairpay-external-agent-api/, '')
  if (req.method !== 'POST' || path !== '/v1/external-agent-submissions') {
    return err(404, 'NOT_FOUND', `No route: ${req.method} ${url.pathname}`)
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

  const { data, error } = await supabase.rpc('create_external_agent_submission', {
    p_payload: parsed.data,
    p_ip_hash: ipHash,
    p_user_agent: userAgent,
  })

  if (error) {
    const message = error.message ?? 'Submission failed'
    if (message.includes('RATE_LIMIT_EXCEEDED')) {
      return err(429, 'RATE_LIMIT_EXCEEDED', 'Too many submissions; retry later')
    }
    if (message.includes('PENDING_LIMIT_EXCEEDED')) {
      return err(409, 'PENDING_LIMIT_EXCEEDED', 'Too many pending submissions for this target')
    }
    return err(422, 'SUBMISSION_FAILED', message)
  }

  return json({ ...data, message: 'Submission queued for FairPay approval' }, 201)
})
