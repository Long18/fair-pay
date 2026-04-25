import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '../../_lib/auth.js'
import { handleCorsPreflightIfNeeded, setCorsHeaders } from '../../_lib/cors.js'

interface ReminderRequest {
  reminders?: Array<{
    user_id?: string
    title?: string
    message?: string
    link?: string
  }>
}

function getRequestBody(req: VercelRequest): ReminderRequest {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as ReminderRequest
    } catch {
      return {}
    }
  }
  return req.body as ReminderRequest
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res)
    if (handleCorsPreflightIfNeeded(req, res)) return

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    const { user, error: authError, supabase } = await getAuthenticatedUser(req.headers.authorization)
    if (!user || !supabase) {
      return res.status(401).json({ success: false, error: authError || 'Unauthorized' })
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin')
    if (adminError || isAdmin !== true) {
      return res.status(403).json({ success: false, error: 'Only administrators can send reminders' })
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ success: false, error: 'Server misconfiguration' })
    }

    const reminders = (getRequestBody(req).reminders || [])
      .filter((reminder) => reminder.user_id && reminder.title && reminder.message)
      .slice(0, 100)

    if (!reminders.length) {
      return res.status(400).json({ success: false, error: 'No valid reminders provided' })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await adminClient
      .from('notifications')
      .insert(reminders.map((reminder) => ({
        user_id: reminder.user_id,
        type: 'settlement_reminder',
        title: reminder.title,
        message: reminder.message,
        link: reminder.link || '/dashboard',
        is_read: false,
      })))
      .select('id')

    if (error) {
      return res.status(500).json({ success: false, error: error.message })
    }

    return res.status(200).json({
      success: true,
      notification_ids: (data || []).map((row) => row.id),
    })
  } catch (error) {
    console.error('[admin/email/send-reminder]', error)
    setCorsHeaders(res)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send reminders',
    })
  }
}
