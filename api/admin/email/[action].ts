import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { getAdminUser } from '../../_lib/admin-auth.js'
import { handleCorsPreflightIfNeeded, setCorsHeaders } from '../../_lib/cors.js'

// ── Shared helpers ────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getBearerToken(authHeader: string | undefined): string {
  return authHeader?.replace(/^Bearer\s+/i, '').trim() || ''
}

function parseBody<T>(req: VercelRequest): T {
  if (!req.body) return {} as T
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) as T } catch { return {} as T }
  }
  return req.body as T
}

function normalizeInviteEmails(value: string | string[] | undefined): string[] {
  if (!value) return []
  const rawItems = Array.isArray(value) ? value : value.split(/[\s,;]+/)
  const emails = rawItems
    .map((e) => e.trim().toLowerCase())
    .filter((e) => EMAIL_RE.test(e))
  return Array.from(new Set(emails))
}

function normalizeRecipientEmails(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const emails = Array.from(new Set(
    value
      .map((item) => typeof item === 'string' ? item.trim().toLowerCase() : '')
      .filter((item) => item && EMAIL_RE.test(item))
  ))
  return emails.length ? emails : null
}

// ── /api/admin/email/overview ─────────────────────────────────────────────────

async function handleOverview(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { user, error: authError, supabase, status } = await getAdminUser(req.headers.authorization)
  if (!user || !supabase) {
    return res.status(status ?? 401).json({ success: false, error: authError || 'Unauthorized' })
  }

  const { data, error } = await supabase.rpc('admin_get_email_devtool_summary', { p_limit: 100 })

  if (error) {
    return res.status(500).json({
      success: false,
      error: `Failed to load email devtool summary: ${error.message}`,
    })
  }

  const summary = (data || {}) as { pending_queue_count?: number; debtors?: unknown[] }
  return res.status(200).json({
    success: true,
    pending_queue_count: summary.pending_queue_count ?? 0,
    debtors: summary.debtors ?? [],
  })
}

// ── /api/admin/email/run-worker ───────────────────────────────────────────────

async function handleRunWorker(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  const { user, error: authError, supabase, status } = await getAdminUser(authHeader)
  if (!user || !supabase) {
    return res.status(status ?? 401).json({ success: false, error: authError || 'Unauthorized' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const adminUserToken = getBearerToken(authHeader)
  const invokeAuthToken = serviceRoleKey || adminUserToken
  const invokeApiKey = serviceRoleKey || supabaseAnonKey

  if (!supabaseUrl || !invokeAuthToken || !invokeApiKey) {
    return res.status(500).json({ success: false, error: 'Server misconfiguration' })
  }

  const invokeWorker = (authToken: string, apiKey: string) =>
    fetch(`${supabaseUrl}/functions/v1/send-email-notifications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        apikey: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parseBody(req)),
    })

  let edgeResponse = await invokeWorker(invokeAuthToken, invokeApiKey)
  if (edgeResponse.status === 401 && serviceRoleKey && adminUserToken && supabaseAnonKey) {
    edgeResponse = await invokeWorker(adminUserToken, supabaseAnonKey)
  }

  const text = await edgeResponse.text()
  let payload: Record<string, unknown>
  try {
    payload = text ? JSON.parse(text) as Record<string, unknown> : { success: edgeResponse.ok }
  } catch {
    payload = { success: false, error: text || edgeResponse.statusText }
  }

  return res.status(edgeResponse.status).json(payload)
}

// ── /api/admin/email/send-invite ──────────────────────────────────────────────

interface InviteRequest {
  emails?: string[] | string
  inviter_name?: string
}

async function handleSendInvite(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  const { user, error: authError, supabase, status } = await getAdminUser(authHeader)
  if (!user || !supabase) {
    return res.status(status ?? 401).json({ success: false, error: authError || 'Unauthorized' })
  }

  const body = parseBody<InviteRequest>(req)
  const emails = normalizeInviteEmails(body.emails).slice(0, 25)
  if (!emails.length) {
    return res.status(400).json({ success: false, error: 'No valid invite emails provided' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const adminUserToken = getBearerToken(authHeader)
  const invokeAuthToken = serviceRoleKey || adminUserToken
  const invokeApiKey = serviceRoleKey || supabaseAnonKey

  if (!supabaseUrl || !invokeAuthToken || !invokeApiKey) {
    return res.status(500).json({ success: false, error: 'Server misconfiguration' })
  }

  const invokeWorker = (authToken: string, apiKey: string) =>
    fetch(`${supabaseUrl}/functions/v1/send-email-notifications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        apikey: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invite: {
          emails,
          inviter_name: body.inviter_name || user.email || 'Một người bạn',
        },
      }),
    })

  let edgeResponse = await invokeWorker(invokeAuthToken, invokeApiKey)
  if (edgeResponse.status === 401 && serviceRoleKey && adminUserToken && supabaseAnonKey) {
    edgeResponse = await invokeWorker(adminUserToken, supabaseAnonKey)
  }

  const text = await edgeResponse.text()
  let payload: Record<string, unknown>
  try {
    payload = text ? JSON.parse(text) as Record<string, unknown> : { success: edgeResponse.ok }
  } catch {
    payload = { success: false, error: text || edgeResponse.statusText }
  }

  if (edgeResponse.status === 401 && !payload.error) {
    payload.error = 'Email worker rejected authorization'
  }

  return res.status(edgeResponse.status).json(payload)
}

// ── /api/admin/email/send-reminder ────────────────────────────────────────────

interface ReminderRequest {
  reminders?: Array<{
    user_id?: string
    title?: string
    message?: string
    link?: string
    recipient_emails?: unknown
    email_context?: unknown
  }>
}

async function handleSendReminder(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { user, error: authError, supabase, status } = await getAdminUser(req.headers.authorization)
  if (!user || !supabase) {
    return res.status(status ?? 401).json({ success: false, error: authError || 'Unauthorized' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ success: false, error: 'Server misconfiguration' })
  }

  const reminders = (parseBody<ReminderRequest>(req).reminders || [])
    .filter((r) => r.user_id && r.title && r.message)
    .slice(0, 100)

  if (!reminders.length) {
    return res.status(400).json({ success: false, error: 'No valid reminders provided' })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await adminClient
    .from('notifications')
    .insert(
      reminders.map((r) => ({
        user_id: r.user_id,
        type: 'settlement_reminder',
        title: r.title,
        message: r.message,
        link: r.link || '/dashboard',
        recipient_emails: normalizeRecipientEmails(r.recipient_emails),
        email_context: r.email_context || null,
        is_read: false,
      }))
    )
    .select('id')

  if (error) {
    return res.status(500).json({ success: false, error: error.message })
  }

  return res.status(200).json({
    success: true,
    notification_ids: (data || []).map((row) => row.id),
  })
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>

const HANDLERS: Record<string, Handler> = {
  overview: handleOverview,
  'run-worker': handleRunWorker,
  'send-invite': handleSendInvite,
  'send-reminder': handleSendReminder,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res)
  if (handleCorsPreflightIfNeeded(req, res)) return

  const action = req.query.action as string
  const fn = HANDLERS[action]

  if (!fn) {
    return res.status(404).json({ success: false, error: `Unknown email action: ${action}` })
  }

  try {
    return await fn(req, res)
  } catch (error) {
    console.error(`[admin/email/${action}]`, error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
