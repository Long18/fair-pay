import { createClient } from '@supabase/supabase-js'

import { isBot } from '../_lib/bots'
import { formatOgAmount, formatOgDate } from '../_lib/og-format'
import {
  getBaseUrl,
  shareLandingPage,
  simplePage,
} from '../_lib/share-html'
import {
  appendTrackingParams,
  toVersionToken,
} from '../_lib/share-shared'

export const config = { runtime: 'edge' }

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
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null

  try {
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
  } catch {
    return null
  }
}

export default async function handler(req: Request): Promise<Response> {
  try {
    return await handleExpenseShare(req)
  } catch (err) {
    console.error('[share/expense] unhandled error:', err)
    return simplePage('FairPay', 'Open FairPay to view this expense.')
  }
}

async function handleExpenseShare(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id') || url.searchParams.get('expense_id')
  const base = getBaseUrl(req)

  if (!id) {
    return simplePage('FairPay', 'Missing expense id')
  }

  const expense = await fetchShareExpense(id)
  const queryVersion = url.searchParams.get('v')
  const latestTimestamp = [expense?.updated_at, expense?.created_at, expense?.latest_settled_at]
    .filter(Boolean)
    .sort()
    .pop()
  const version = queryVersion || toVersionToken(
    latestTimestamp || expense?.expense_date || expense?.id || id,
  )

  const redirectUrl = appendTrackingParams(
    `${base}/expenses/show/${encodeURIComponent(id)}?v=${encodeURIComponent(version)}`,
    url,
  )
  const shareUrl = appendTrackingParams(
    `${base}/share/expenses/${encodeURIComponent(id)}`,
    url,
  )
  const ogImageUrl = `${base}/api/og/expense?id=${encodeURIComponent(id)}&v=${encodeURIComponent(version)}`

  const title = expense
    ? `${expense.description} • ${formatOgAmount(expense.amount, expense.currency)}`
    : 'FairPay Expense'
  const description = expense
    ? `${formatOgDate(expense.expense_date)}${expense.payer_name ? ` • paid by ${expense.payer_name}` : ''}`
    : 'Open expense details in FairPay.'

  return shareLandingPage(
    {
      title,
      description,
      shareUrl,
      redirectUrl,
      ogImageUrl,
      bodyText: 'Redirecting to FairPay expense page...',
      linkText: 'Open expense',
    },
    req.headers.get('user-agent'),
    isBot,
  )
}
