import { next } from '@vercel/functions'

const BOT_PATTERNS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'Googlebot',
  'bingbot',
  'Applebot',
  'iMessageLinkPreview',
  'Viber',
  'Zalo',
  'Line',
  'KakaoTalk',
  'Skype',
  'redditbot',
  'Embedly',
  'Quora Link Preview',
  'Showyoubot',
  'outbrain',
  'pinterest',
  'vkShare',
  'W3C_Validator',
]

const EXPENSE_SHOW_REGEX = /^\/expenses\/show\/([a-f0-9-]{36})$/i
const DEBT_SHOW_REGEX = /^\/debts\/([a-f0-9-]{36})$/i

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return BOT_PATTERNS.some((bot) => ua.includes(bot.toLowerCase()))
}

export default function middleware(request: Request): Response {
  const url = new URL(request.url)
  const userAgent = request.headers.get('user-agent') ?? ''

  if (!isBot(userAgent)) return next()

  const siteUrl = `${url.protocol}//${url.host}`
  const canonicalUrl = `${siteUrl}${url.pathname}${url.search}`

  const expenseMatch = url.pathname.match(EXPENSE_SHOW_REGEX)
  if (expenseMatch) {
    const expenseId = expenseMatch[1]
    const ogImageUrl = `${siteUrl}/api/og/expense?id=${expenseId}`

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>FairPay — Expense Detail</title>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="FairPay" />
  <meta property="og:title" content="FairPay — Expense Detail" />
  <meta property="og:description" content="View expense details and split information on FairPay" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="FairPay — Expense Detail" />
  <meta name="twitter:description" content="View expense details and split information on FairPay" />
  <meta name="twitter:image" content="${ogImageUrl}" />
</head>
<body></body>
</html>`

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    })
  }

  const debtMatch = url.pathname.match(DEBT_SHOW_REGEX)
  if (debtMatch) {
    const counterpartyId = debtMatch[1]
    const viewerId = url.searchParams.get('viewer_id') || url.searchParams.get('user_id')
    const ogImageUrl = viewerId
      ? `${siteUrl}/api/og/debt?viewer_id=${encodeURIComponent(viewerId)}&counterparty_id=${encodeURIComponent(counterpartyId)}`
      : `${siteUrl}/api/og/debt?counterparty_id=${encodeURIComponent(counterpartyId)}`

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>FairPay — Debt Detail</title>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="FairPay" />
  <meta property="og:title" content="FairPay — Debt Detail" />
  <meta property="og:description" content="View open debt details on FairPay" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="FairPay — Debt Detail" />
  <meta name="twitter:description" content="View open debt details on FairPay" />
  <meta name="twitter:image" content="${ogImageUrl}" />
</head>
<body></body>
</html>`

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    })
  }

  return next()
}

export const config = {
  matcher: ['/expenses/show/:path*', '/debts/:path*'],
}
