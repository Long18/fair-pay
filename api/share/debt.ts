import {
  buildDebtDirectOgDescription,
  buildDebtDirectOgTitle,
  buildDebtOgDescription,
  buildDebtOgTitle,
  fetchDebtOgCounterparty,
  fetchDebtOgData,
} from '../_lib/debt-og-data'
import { decodeDebtToken, encodeDebtToken } from '../_lib/share-token'
import {
  escapeHtml,
  toVersionToken,
} from '../_lib/share-shared'

export const config = { runtime: 'edge' }

// ── Helpers (edge-compatible, no VercelResponse) ────────────────────────

const NO_CACHE = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'

function html(body: string, status = 200, extra?: Record<string, string>): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': NO_CACHE,
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      ...extra,
    },
  })
}

function simplePage(title: string, body: string): Response {
  const safeTitle = escapeHtml(title)
  const safeBody = escapeHtml(body)
  return html(`<!doctype html>
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

  return html(`<!doctype html>
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

  const url = new URL(req.url)
  return url.origin
}

// ── Handler ─────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  try {
    return await handleDebtShare(req)
  } catch (err) {
    console.error('[share/debt] unhandled error:', err)
    return simplePage('FairPay', 'Open FairPay to view this debt.')
  }
}

async function handleDebtShare(req: Request): Promise<Response> {
  if (new URL(req.url).pathname && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(req.url)

  // ── Resolve IDs: short token (`t`) or legacy query params ──
  let viewerId: string | null = null
  let counterpartyId: string | null = null
  let usedToken = false

  const tokenParam = url.searchParams.get('t')
  if (tokenParam) {
    const decoded = decodeDebtToken(tokenParam)
    if (decoded) {
      viewerId = decoded.viewerId
      counterpartyId = decoded.counterpartyId
      usedToken = true
    }
  }

  // Fall back to explicit query params (backward compatible)
  if (!counterpartyId) {
    counterpartyId = url.searchParams.get('counterparty_id') || url.searchParams.get('id')
  }
  if (!viewerId) {
    viewerId = url.searchParams.get('viewer_id') || url.searchParams.get('user_id')
  }

  // ── Redirect legacy long URLs → compact token URL ──
  if (viewerId && counterpartyId && !usedToken) {
    const base = getBaseUrl(req)
    const queryVersion = url.searchParams.get('v')
    const token = encodeDebtToken(viewerId, counterpartyId)
    const shortUrl = `${base}/api/share/debt?t=${encodeURIComponent(token)}${queryVersion ? `&v=${encodeURIComponent(queryVersion)}` : ''}`
    return new Response(null, {
      status: 301,
      headers: {
        Location: shortUrl,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }

  if (!counterpartyId) {
    return simplePage('FairPay', 'Missing debt counterparty id')
  }

  const base = getBaseUrl(req)
  const queryVersion = url.searchParams.get('v')

  // ── Counterparty-only link (no viewer) ──
  if (!viewerId) {
    const counterparty = await fetchDebtOgCounterparty(counterpartyId)
    const version = queryVersion || toVersionToken(counterpartyId)
    const directUrl = `${base}/debts/${encodeURIComponent(counterpartyId)}?v=${encodeURIComponent(version)}`
    const ogImageUrl = `${base}/api/og/debt?counterparty_id=${encodeURIComponent(counterpartyId)}&v=${encodeURIComponent(version)}`

    return redirectPage({
      title: buildDebtDirectOgTitle(counterparty),
      description: buildDebtDirectOgDescription(counterparty),
      shareUrl: directUrl,
      redirectUrl: directUrl,
      ogImageUrl,
      bodyText: 'Redirecting to FairPay debt page...',
      linkText: 'Open debt detail',
    })
  }

  // ── Full debt share (viewer + counterparty) ──
  const debt = await fetchDebtOgData(viewerId, counterpartyId)
  const version = queryVersion || toVersionToken(
    debt?.latest_activity_at || `${viewerId}-${counterpartyId}`,
  )

  const token = encodeDebtToken(viewerId, counterpartyId)
  const redirectUrl = `${base}/debts/${encodeURIComponent(counterpartyId)}?v=${encodeURIComponent(version)}`
  const shareUrl = `${base}/api/share/debt?t=${encodeURIComponent(token)}&v=${encodeURIComponent(version)}`
  const ogImageUrl = `${base}/api/og/debt?viewer_id=${encodeURIComponent(viewerId)}&counterparty_id=${encodeURIComponent(counterpartyId)}&v=${encodeURIComponent(version)}`

  return redirectPage({
    title: buildDebtOgTitle(debt),
    description: buildDebtOgDescription(debt),
    shareUrl,
    redirectUrl,
    ogImageUrl,
    bodyText: 'Redirecting to FairPay debt page...',
    linkText: 'Open debt summary',
  })
}
