import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthenticatedUser } from '../../_lib/auth'
import { handleCorsPreflightIfNeeded, setCorsHeaders } from '../../_lib/cors'

function getRequestBody(req: VercelRequest): Record<string, unknown> {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return req.body as Record<string, unknown>
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
    return res.status(403).json({ success: false, error: 'Only administrators can run email worker' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const invokeKey = serviceRoleKey || supabaseAnonKey

  if (!supabaseUrl || !invokeKey) {
    return res.status(500).json({ success: false, error: 'Server misconfiguration' })
  }

  try {
    const edgeResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-notifications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${invokeKey}`,
        apikey: invokeKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(getRequestBody(req)),
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
      error: error instanceof Error ? error.message : 'Failed to invoke email worker',
    })
  }
}
