import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAdminUser } from '../_lib/admin-auth'
import { getAuthenticatedUser } from '../_lib/auth'
import { handleCorsPreflightIfNeeded, setCorsHeaders } from '../_lib/cors'

// ── /api/debt/all-users-detailed ──────────────────────────────────────────────

async function handleAllUsersDetailed(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { user, error: authError, supabase, status } = await getAdminUser(req.headers.authorization)
  if (!user || !supabase) {
    return res.status(status ?? 401).json({ success: false, error: authError || 'Unauthorized' })
  }

  const { limit = '50', offset = '0' } = req.query
  const limitNum = Math.min(parseInt(limit as string) || 50, 100)
  const offsetNum = parseInt(offset as string) || 0

  if (limitNum < 1 || offsetNum < 0) {
    return res.status(400).json({ success: false, error: 'Invalid pagination parameters' })
  }

  console.log(`Fetching all users debt detailed: limit=${limitNum}, offset=${offsetNum}`)

  const { data, error } = await supabase.rpc('get_all_users_debt_detailed', {
    p_limit: limitNum,
    p_offset: offsetNum,
  })

  if (error) {
    console.error('RPC Error:', error)
    if (error.message.includes('Only admins can view')) {
      return res.status(403).json({ success: false, error: error.message })
    }
    return res.status(500).json({ success: false, error: `Database error: ${error.message}` })
  }

  if (!data || data.length === 0) {
    return res.status(200).json({
      success: true,
      pagination: { limit: limitNum, offset: offsetNum, total_count: 0 },
      data: [],
    })
  }

  interface DetailedDebtRow {
    user_id: string
    full_name: string
    email: string
    total_owed_to_me: string | number
    total_i_owe: string | number
    net_balance: string | number
    active_debt_relationships: unknown
    debts_by_person: unknown
    debts_by_group: unknown
    total_count: number
  }

  const rows = data as DetailedDebtRow[]
  const totalCount = rows[0].total_count

  console.log(`Successfully retrieved detailed debts for ${data.length} users (total: ${totalCount})`)

  return res.status(200).json({
    success: true,
    pagination: { limit: limitNum, offset: offsetNum, total_count: totalCount },
    data: rows.map((row) => ({
      user_id: row.user_id,
      full_name: row.full_name,
      email: row.email,
      total_owed_to_me: parseFloat(String(row.total_owed_to_me)),
      total_i_owe: parseFloat(String(row.total_i_owe)),
      net_balance: parseFloat(String(row.net_balance)),
      active_debt_relationships: row.active_debt_relationships,
      debts_by_person: row.debts_by_person,
      debts_by_group: row.debts_by_group,
    })),
  })
}

// ── /api/debt/all-users-summary ───────────────────────────────────────────────

async function handleAllUsersSummary(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { user, error: authError, supabase, status } = await getAdminUser(req.headers.authorization)
  if (!user || !supabase) {
    return res.status(status ?? 401).json({ success: false, error: authError || 'Unauthorized' })
  }

  const { limit = '50', offset = '0' } = req.query
  const limitNum = Math.min(parseInt(limit as string) || 50, 100)
  const offsetNum = parseInt(offset as string) || 0

  if (limitNum < 1 || offsetNum < 0) {
    return res.status(400).json({ success: false, error: 'Invalid pagination parameters' })
  }

  console.log(`Fetching all users debt summary: limit=${limitNum}, offset=${offsetNum}`)

  const { data, error } = await supabase.rpc('get_all_users_debt_summary', {
    p_limit: limitNum,
    p_offset: offsetNum,
  })

  if (error) {
    console.error('RPC Error:', error)
    return res.status(500).json({ success: false, error: `Database error: ${error.message}` })
  }

  if (!data || data.length === 0) {
    return res.status(200).json({
      success: true,
      pagination: { limit: limitNum, offset: offsetNum, total_count: 0 },
      data: [],
    })
  }

  interface SummaryDebtRow {
    user_id: string
    full_name: string
    net_balance: string | number
    total_count: number
  }

  const rows = data as SummaryDebtRow[]
  const totalCount = rows[0].total_count

  console.log(`Successfully retrieved ${data.length} users (total: ${totalCount})`)

  return res.status(200).json({
    success: true,
    pagination: { limit: limitNum, offset: offsetNum, total_count: totalCount },
    data: rows.map((row) => ({
      user_id: row.user_id,
      full_name: row.full_name,
      net_balance: parseFloat(String(row.net_balance)),
    })),
  })
}

// ── /api/debt/who-owes-who ────────────────────────────────────────────────────

async function handleWhoOwesWho(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { user, error: authError, supabase } = await getAuthenticatedUser(req.headers.authorization)
  if (!user || !supabase) {
    return res.status(401).json({ success: false, error: authError || 'Unauthorized' })
  }

  const { limit = '50', offset = '0' } = req.query
  const limitNum = Math.min(parseInt(limit as string) || 50, 100)
  const offsetNum = parseInt(offset as string) || 0

  if (limitNum < 1 || offsetNum < 0) {
    return res.status(400).json({ success: false, error: 'Invalid pagination parameters' })
  }

  const { data, error } = await supabase.rpc('get_who_owes_who', {
    p_limit: limitNum,
    p_offset: offsetNum,
  })

  if (error) {
    console.error('RPC Error:', error)
    return res.status(500).json({ success: false, error: `Database error: ${error.message}` })
  }

  if (!data || data.length === 0) {
    return res.status(200).json({
      success: true,
      pagination: { limit: limitNum, offset: offsetNum, total_count: 0 },
      data: [],
    })
  }

  interface WhoOwesWhoRow {
    from_user_id: string
    from_user_name: string
    to_user_id: string
    to_user_name: string
    amount: string | number
    total_count: number
  }

  const rows = data as WhoOwesWhoRow[]
  const totalCount = rows[0].total_count

  return res.status(200).json({
    success: true,
    pagination: { limit: limitNum, offset: offsetNum, total_count: totalCount },
    data: rows.map((row) => ({
      from_user_id: row.from_user_id,
      from_user_name: row.from_user_name,
      to_user_id: row.to_user_id,
      to_user_name: row.to_user_name,
      amount: parseFloat(String(row.amount)),
    })),
  })
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>

const HANDLERS: Record<string, Handler> = {
  'all-users-detailed': handleAllUsersDetailed,
  'all-users-summary': handleAllUsersSummary,
  'who-owes-who': handleWhoOwesWho,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res)
  if (handleCorsPreflightIfNeeded(req, res)) return

  const action = req.query.action as string
  const fn = HANDLERS[action]

  if (!fn) {
    return res.status(404).json({ success: false, error: `Unknown debt action: ${action}` })
  }

  try {
    return await fn(req, res)
  } catch (err) {
    console.error(`[debt/${action}]`, err)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
