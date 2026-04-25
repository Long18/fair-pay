import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthenticatedUser } from '../../_lib/auth'
import { handleCorsPreflightIfNeeded, setCorsHeaders } from '../../_lib/cors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res)
  if (handleCorsPreflightIfNeeded(req, res)) return

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { user, error: authError, supabase } = await getAuthenticatedUser(req.headers.authorization)
  if (!user || !supabase) {
    return res.status(401).json({ success: false, error: authError || 'Unauthorized' })
  }

  const { data, error } = await supabase.rpc('admin_get_email_devtool_summary', {
    p_limit: 100,
  })

  if (error) {
    return res.status(500).json({
      success: false,
      error: `Failed to load email devtool summary: ${error.message}`,
    })
  }

  const summary = (data || {}) as {
    pending_queue_count?: number
    debtors?: unknown[]
  }

  return res.status(200).json({
    success: true,
    pending_queue_count: summary.pending_queue_count ?? 0,
    debtors: summary.debtors ?? [],
  })
}
