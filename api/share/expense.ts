import { createClient } from '@supabase/supabase-js'

import { formatOgAmount, formatOgDate } from '../_lib/og-format'
import {
  escapeHtml,
  toVersionToken,
} from '../_lib/share-shared'

export const config = { runtime: 'edge' }

// ── Helpers (edge-compatible) ───────────────────────────────────────────

const NO_CACHE = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': NO_CACHE,
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  })
}

function simplePage(title: string, body: string): Response {
  const safeTitle = escapeHtml(title)
  const safeBody = escapeHtml(body)
  return htmlResponse(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${safeTitle}</title><meta name="robots" content="noindex,nofollow,noarchive"/></head>
<body><p>${safeBody}</p></body></html>`)
}

interface RedirectPageOpts {
  title: string
  description: string
  shareUrl: string
  redirectUrl: string
  ogImageUrl: string
  bodyText: string
  linkText: string
}

function redirectPage(opts: RedirectPageOpts): Response {
  const t = escapeHtml(opts.title)
  const d = escapeHtml(opts.description)
  const s = escapeHtml(opts.shareUrl)
  const r = escapeHtml(opts.redirectUrl)
  const o = escapeHtml(opts.ogImageUrl)
  const b = escapeHtml(opts.bodyText)
  const l = escapeHtml(opts.linkText)

  return htmlResponse(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${t} | FairPay</title>
<meta name="description" content="${d}"/>
<meta name="robots" content="noindex,nofollow,noarchive"/>
<link rel="canonical" href="${s}"/>
<meta http-equiv="refresh" content="0;url=${r}"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="FairPay"/>
<meta property="og:title" content="${t}"/>
<meta property="og:description" content="${d}"/>
<meta property="og:url" content="${s}"/>
<meta property="og:image" content="${o}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${t}"/>
<meta name="twitter:description" content="${d}"/>
<meta name="twitter:image" content="${o}"/>
<script>window.location.replace(${JSON.stringify(opts.redirectUrl)});</script>
</head><body><p>${b}</p><p><a href="${r}">${l}</a></p></body></html>`)
}

function getBaseUrl(req: Request): string {
  const appUrl = process.env.VITE_APP_URL
  if (appUrl) return appUrl.replace(/\/+$/, '')
  return new URL(req.url).origin
}

// ── Data fetching ───────────────────────────────────────────────────────

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

// ── Handler ─────────────────────────────────────────────────────────────

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

  const redirectUrl = `${base}/expenses/show/${encodeURIComponent(id)}?v=${encodeURIComponent(version)}`
  const shareUrl = `${base}/api/share/expense?id=${encodeURIComponent(id)}&v=${encodeURIComponent(version)}`
  const ogImageUrl = `${base}/api/og/expense?id=${encodeURIComponent(id)}&v=${encodeURIComponent(version)}`

  const title = expense
    ? `${expense.description} • ${formatOgAmount(expense.amount, expense.currency)}`
    : 'FairPay Expense'
  const description = expense
    ? `${formatOgDate(expense.expense_date)}${expense.payer_name ? ` • paid by ${expense.payer_name}` : ''}`
    : 'Open expense details in FairPay.'

  return redirectPage({
    title,
    description,
    shareUrl,
    redirectUrl,
    ogImageUrl,
    bodyText: 'Redirecting to FairPay expense page...',
    linkText: 'Open expense',
  })
}
