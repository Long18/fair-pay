import { escapeHtml } from './share-shared'

const NO_CACHE = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'

export function htmlResponse(
  body: string,
  status = 200,
  extra?: Record<string, string>,
): Response {
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

export function simplePage(title: string, body: string): Response {
  const safeTitle = escapeHtml(title)
  const safeBody = escapeHtml(body)
  return htmlResponse(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${safeTitle}</title><meta name="robots" content="noindex,nofollow,noarchive"/></head>
<body><p>${safeBody}</p></body></html>`)
}

export interface ShareOgPageOpts {
  title: string
  description: string
  shareUrl: string
  redirectUrl: string
  ogImageUrl: string
  bodyText: string
  linkText: string
  /** When true, include meta-refresh + JS redirect (humans). Bots should pass false. */
  redirect?: boolean
}

function buildOgHead(opts: ShareOgPageOpts, withRedirect: boolean): string {
  const t = escapeHtml(opts.title)
  const d = escapeHtml(opts.description)
  const s = escapeHtml(opts.shareUrl)
  const r = escapeHtml(opts.redirectUrl)
  const o = escapeHtml(opts.ogImageUrl)
  const b = escapeHtml(opts.bodyText)
  const l = escapeHtml(opts.linkText)

  const refresh = withRedirect
    ? `<meta http-equiv="refresh" content="0;url=${r}"/>`
    : ''
  const script = withRedirect
    ? `<script>window.location.replace(${JSON.stringify(opts.redirectUrl)});</script>`
    : ''

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${t} | FairPay</title>
<meta name="description" content="${d}"/>
<meta name="robots" content="noindex,nofollow,noarchive"/>
<link rel="canonical" href="${s}"/>
${refresh}
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
${script}
</head><body><p>${b}</p><p><a href="${r}">${l}</a></p></body></html>`
}

/** Rich OG HTML without redirect — for crawlers / link previews. */
export function ogPage(opts: ShareOgPageOpts): Response {
  return htmlResponse(buildOgHead({ ...opts, redirect: false }, false))
}

/** Rich OG HTML + instant redirect — for human browsers. */
export function redirectPage(opts: ShareOgPageOpts): Response {
  return htmlResponse(buildOgHead({ ...opts, redirect: true }, true))
}

/** Bot → ogPage; human → redirectPage. */
export function shareLandingPage(
  opts: ShareOgPageOpts,
  userAgent: string | null,
  isBotFn: (ua: string) => boolean,
): Response {
  if (isBotFn(userAgent ?? '')) return ogPage(opts)
  return redirectPage(opts)
}

export function getBaseUrl(req: Request): string {
  const appUrl = process.env.VITE_APP_URL
  if (appUrl) return appUrl.replace(/\/+$/, '')
  return new URL(req.url).origin
}

/** Default marketing banner used when entity has no avatar. */
export function defaultOgImageUrl(base: string): string {
  return `${base.replace(/\/+$/, '')}/banner.png`
}
