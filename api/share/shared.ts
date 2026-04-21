import type { VercelRequest, VercelResponse } from '@vercel/node'

const NO_CACHE = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function toVersionToken(raw: string): string {
  const value = raw.trim()
  const parsed = Date.parse(value)
  if (!Number.isNaN(parsed)) {
    return String(Math.floor(parsed / 1000))
  }

  const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, '')
  return sanitized || '0'
}

export function getBaseUrl(req: VercelRequest): string {
  const appUrl = process.env.VITE_APP_URL
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

export function applyShareHeaders(res: VercelResponse): void {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', NO_CACHE)
  res.setHeader('CDN-Cache-Control', 'no-store')
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
}

interface SimplePageOptions {
  title: string
  body: string
}

export function renderSimplePage({ title, body }: SimplePageOptions): string {
  const safeTitle = escapeHtml(title)
  const safeBody = escapeHtml(body)

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <meta name="robots" content="noindex,nofollow,noarchive" />
</head>
<body>
  <p>${safeBody}</p>
</body>
</html>`
}

interface RedirectPageOptions {
  title: string
  description: string
  shareUrl: string
  redirectUrl: string
  ogImageUrl: string
  bodyText: string
  linkText: string
}

export function renderRedirectPage({
  title,
  description,
  shareUrl,
  redirectUrl,
  ogImageUrl,
  bodyText,
  linkText,
}: RedirectPageOptions): string {
  const safeTitle = escapeHtml(title)
  const safeDescription = escapeHtml(description)
  const safeShare = escapeHtml(shareUrl)
  const safeRedirect = escapeHtml(redirectUrl)
  const safeOgImage = escapeHtml(ogImageUrl)
  const safeBodyText = escapeHtml(bodyText)
  const safeLinkText = escapeHtml(linkText)

  return `<!doctype html>
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
  <p>${safeBodyText}</p>
  <p><a href="${safeRedirect}">${safeLinkText}</a></p>
</body>
</html>`
}
