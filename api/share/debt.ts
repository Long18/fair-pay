import {
  buildDebtDirectOgDescription,
  buildDebtDirectOgTitle,
  buildDebtOgDescription,
  buildDebtOgTitle,
  fetchDebtOgCounterparty,
  fetchDebtOgData,
} from '../_lib/debt-og-data'
import { isBot } from '../_lib/bots'
import {
  getBaseUrl,
  shareLandingPage,
  simplePage,
} from '../_lib/share-html'
import { decodeDebtToken, encodeDebtToken } from '../_lib/share-token'
import {
  appendTrackingParams,
  toVersionToken,
} from '../_lib/share-shared'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  try {
    return await handleDebtShare(req)
  } catch (err) {
    console.error('[share/debt] unhandled error:', err)
    return simplePage('FairPay', 'Open FairPay to view this debt.')
  }
}

async function handleDebtShare(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(req.url)

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

  if (!counterpartyId) {
    counterpartyId = url.searchParams.get('counterparty_id') || url.searchParams.get('id')
  }
  if (!viewerId) {
    viewerId = url.searchParams.get('viewer_id') || url.searchParams.get('user_id')
  }

  if (viewerId && counterpartyId && !usedToken) {
    const base = getBaseUrl(req)
    const queryVersion = url.searchParams.get('v')
    const token = encodeDebtToken(viewerId, counterpartyId)
    const shortUrl = appendTrackingParams(
      `${base}/share/debts/${encodeURIComponent(token)}${queryVersion ? `?v=${encodeURIComponent(queryVersion)}` : ''}`,
      url,
    )
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
  const ua = req.headers.get('user-agent')

  if (!viewerId) {
    const counterparty = await fetchDebtOgCounterparty(counterpartyId)
    const version = queryVersion || toVersionToken(counterpartyId)
    const directUrl = appendTrackingParams(
      `${base}/debts/${encodeURIComponent(counterpartyId)}?v=${encodeURIComponent(version)}`,
      url,
    )
    const ogImageUrl = `${base}/api/og/debt?counterparty_id=${encodeURIComponent(counterpartyId)}&v=${encodeURIComponent(version)}`

    return shareLandingPage(
      {
        title: buildDebtDirectOgTitle(counterparty),
        description: buildDebtDirectOgDescription(counterparty),
        shareUrl: directUrl,
        redirectUrl: directUrl,
        ogImageUrl,
        bodyText: 'Redirecting to FairPay debt page...',
        linkText: 'Open debt detail',
      },
      ua,
      isBot,
    )
  }

  const debt = await fetchDebtOgData(viewerId, counterpartyId)
  const version = queryVersion || toVersionToken(
    debt?.latest_activity_at || `${viewerId}-${counterpartyId}`,
  )

  const token = encodeDebtToken(viewerId, counterpartyId)
  const redirectUrl = appendTrackingParams(
    `${base}/debts/${encodeURIComponent(counterpartyId)}?v=${encodeURIComponent(version)}`,
    url,
  )
  const shareUrl = appendTrackingParams(
    `${base}/share/debts/${encodeURIComponent(token)}`,
    url,
  )
  const ogImageUrl = `${base}/api/og/debt?viewer_id=${encodeURIComponent(viewerId)}&counterparty_id=${encodeURIComponent(counterpartyId)}&v=${encodeURIComponent(version)}`

  return shareLandingPage(
    {
      title: buildDebtOgTitle(debt),
      description: buildDebtOgDescription(debt),
      shareUrl,
      redirectUrl,
      ogImageUrl,
      bodyText: 'Redirecting to FairPay debt page...',
      linkText: 'Open debt summary',
    },
    ua,
    isBot,
  )
}
