import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const appUrl = process.env.VITE_APP_URL

type ShareExpense = {
  id: string
  description: string
  amount: number
  currency: string
  expense_date: string
  payer_name: string | null
  updated_at?: string | null
  created_at?: string | null
}

const NO_CACHE = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function toVersionToken(raw: string): string {
  const value = raw.trim()
  const parsed = Date.parse(value)
  if (!Number.isNaN(parsed)) {
    return String(Math.floor(parsed / 1000))
  }
  const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, '')
  return sanitized || '0'
}

function fmtAmount(amount: number, currency: string): string {
  const c = (currency || 'VND').toUpperCase()
  const withDots = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${withDots} ${c}`
}

function fmtDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(y, m - 1, d))
  } catch {
    return dateStr
  }
}

function getBaseUrl(req: VercelRequest): string {
  if (appUrl) return appUrl.replace(/\/+$/, '')
  const forwardedHost = typeof req.headers['x-forwarded-host'] === 'string'
    ? req.headers['x-forwarded-host'].split(',')[0]?.trim()
    : undefined
  const host = forwardedHost || req.headers.host || 'long-pay.vercel.app'
  const forwardedProto = typeof req.headers['x-forwarded-proto'] === 'string'
    ? req.headers['x-forwarded-proto'].split(',')[0]?.trim()
    : undefined
  const proto = forwardedProto || (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
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
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed')
    return
  }

  const idParam = req.query.id || req.query.expense_id
  const id = Array.isArray(idParam) ? idParam[0] : idParam
  const base = getBaseUrl(req)

  if (!id) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', NO_CACHE)
    res.setHeader('CDN-Cache-Control', 'no-store')
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store')
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
    res.status(200).send(`<!doctype html><html><head><meta charset="utf-8"/><meta name="robots" content="noindex,nofollow,noarchive"/><title>FairPay</title></head><body>Missing expense id</body></html>`)
    return
  }

  const expense = await fetchShareExpense(id)
  const queryVersion = Array.isArray(req.query.v) ? req.query.v[0] : req.query.v
  const version = queryVersion || toVersionToken(
    expense?.updated_at || expense?.created_at || expense?.expense_date || expense?.id || id,
  )

  const redirectUrl = `${base}/expenses/show/${encodeURIComponent(id)}?v=${encodeURIComponent(version)}`
  const shareUrl = `${base}/api/share/expense?id=${encodeURIComponent(id)}&v=${encodeURIComponent(version)}`
  const ogImageUrl = `${base}/api/og/expense?id=${encodeURIComponent(id)}&v=${encodeURIComponent(version)}`

  const title = expense
    ? `${expense.description} • ${fmtAmount(expense.amount, expense.currency)}`
    : 'FairPay Expense'
  const description = expense
    ? `${fmtDate(expense.expense_date)}${expense.payer_name ? ` • paid by ${expense.payer_name}` : ''}`
    : 'Open expense details in FairPay.'

  const safeTitle = escapeHtml(title)
  const safeDescription = escapeHtml(description)
  const safeRedirect = escapeHtml(redirectUrl)
  const safeShare = escapeHtml(shareUrl)
  const safeOgImage = escapeHtml(ogImageUrl)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', NO_CACHE)
  res.setHeader('CDN-Cache-Control', 'no-store')
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')

  res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle} | FairPay</title>
  <meta name="description" content="${safeDescription}" />
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <link rel="canonical" href="${safeShare}" />
  <meta http-equiv="refresh" content="0;url=${safeRedirect}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="FairPay" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:url" content="${safeShare}" />
  <meta property="og:image" content="${safeOgImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeOgImage}" />

  <script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
</head>
<body>
  <p>Redirecting to FairPay expense page...</p>
  <p><a href="${safeRedirect}">Open expense</a></p>
</body>
</html>`)
}
