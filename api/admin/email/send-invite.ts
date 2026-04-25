import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthenticatedUser } from '../../_lib/auth.js'
import { handleCorsPreflightIfNeeded, setCorsHeaders } from '../../_lib/cors.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeInviteEmails(value: string | string[]): string[] {
  const rawItems = Array.isArray(value) ? value : value.split(/[\s,;]+/)
  const emails = rawItems
    .map((email) => email.trim().toLowerCase())
    .filter((email) => EMAIL_RE.test(email))
  return Array.from(new Set(emails))
}

interface InviteRequest {
  emails?: string[] | string
  inviter_name?: string
}

function getRequestBody(req: VercelRequest): InviteRequest {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as InviteRequest
    } catch {
      return {}
    }
  }
  return req.body as InviteRequest
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res)
  if (handleCorsPreflightIfNeeded(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  const { user, error: authError, supabase } = await getAuthenticatedUser(authHeader)
  if (!user || !supabase) {
    return res.status(401).json({ success: false, error: authError || 'Unauthorized' })
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin')
  if (adminError || isAdmin !== true) {
    return res.status(403).json({ success: false, error: 'Only administrators can send invites' })
  }

  const body = getRequestBody(req)
  const emails = normalizeInviteEmails(body.emails || []).slice(0, 25)
  if (!emails.length) {
    return res.status(400).json({ success: false, error: 'No valid invite emails provided' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const invokeKey = serviceRoleKey || supabaseAnonKey

  if (!supabaseUrl || !invokeKey || (!serviceRoleKey && !authHeader)) {
    return res.status(500).json({ success: false, error: 'Server misconfiguration' })
  }

  try {
    const edgeResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-notifications`, {
      method: 'POST',
      headers: {
        Authorization: serviceRoleKey ? `Bearer ${serviceRoleKey}` : authHeader!,
        apikey: invokeKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invite: {
          emails,
          inviter_name: body.inviter_name || user.email || 'Một người bạn',
        },
      }),
    })

    const text = await edgeResponse.text()
    let payload: Record<string, unknown>
    try {
      payload = text ? JSON.parse(text) as Record<string, unknown> : { success: edgeResponse.ok }
    } catch {
      payload = { success: false, error: text || edgeResponse.statusText }
    }

    return res.status(edgeResponse.status).json(payload)
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send invite emails',
    })
  }
}
