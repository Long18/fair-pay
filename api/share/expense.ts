import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

import { formatOgAmount, formatOgDate } from '../_lib/og-format'
import {
  applyShareHeaders,
  getBaseUrl,
  renderRedirectPage,
  renderSimplePage,
  toVersionToken,
} from '../_lib/share-shared'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

type ShareExpense = {
  id: string
  description: string
  amount: number
  currency: string
  expense_date: string
  payer_name: string | null
  updated_at?: string | null
  created_at?: string | null
  latest_settled_at?: string | null
}

async function fetchShareExpense(id: string): Promise<ShareExpense | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null
  const sb = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await sb.rpc('get_expense_og_data', { p_expense_id: id })
  if (error || !data || data.length === 0) return null

  const row = data[0] as Record<string, unknown>
  return {
    id: String(row.id ?? id),
    description: String(row.description ?? 'Expense'),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'VND'),
    expense_date: String(row.expense_date ?? ''),
    payer_name: row.payer_name ? String(row.payer_name) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
    created_at: row.created_at ? String(row.created_at) : null,
    latest_settled_at: row.latest_settled_at ? String(row.latest_settled_at) : null,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return await handleExpenseShare(req, res)
  } catch (err) {
    console.error('[share/expense] unhandled error:', err)
    res.status(200).send(renderSimplePage({ title: 'FairPay', body: 'Open FairPay to view this expense.' }))
  }
}

async function handleExpenseShare(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed')
    return
  }

  const idParam = req.query.id || req.query.expense_id
  const id = Array.isArray(idParam) ? idParam[0] : idParam
  const base = getBaseUrl(req)
  applyShareHeaders(res)

  if (!id) {
    res.status(200).send(renderSimplePage({
      title: 'FairPay',
      body: 'Missing expense id',
    }))
    return
  }

  const expense = await fetchShareExpense(id)
  const queryVersion = Array.isArray(req.query.v) ? req.query.v[0] : req.query.v
  // Pick the most recent timestamp to ensure settlement busts the cache
  const latestTimestamp = [expense?.updated_at, expense?.created_at, expense?.latest_settled_at]
    .filter(Boolean)
    .sort()
    .pop()
  const version = queryVersion || toVersionToken(
    latestTimestamp || expense?.expense_date || expense?.id || id,
  )

  const redirectUrl = `${base}/expenses/show/${encodeURIComponent(id)}?v=${encodeURIComponent(version)}`
  const shareUrl = `${base}/api/share/expense?id=${encodeURIComponent(id)}&v=${encodeURIComponent(version)}`
  const ogImageUrl = `${base}/api/og/expense?id=${encodeURIComponent(id)}&v=${encodeURIComponent(version)}`

  const title = expense
    ? `${expense.description} • ${formatOgAmount(expense.amount, expense.currency)}`
    : 'FairPay Expense'
  const description = expense
    ? `${formatOgDate(expense.expense_date)}${expense.payer_name ? ` • paid by ${expense.payer_name}` : ''}`
    : 'Open expense details in FairPay.'

  res.status(200).send(renderRedirectPage({
    title,
    description,
    shareUrl,
    redirectUrl,
    ogImageUrl,
    bodyText: 'Redirecting to FairPay expense page...',
    linkText: 'Open expense',
  }))
}
