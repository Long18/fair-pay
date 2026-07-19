import { isBot } from '../_lib/bots'
import {
  INVITE_OG_DESCRIPTION,
  INVITE_OG_TITLE,
} from '../_lib/entity-og-data'
import {
  defaultOgImageUrl,
  getBaseUrl,
  shareLandingPage,
  simplePage,
} from '../_lib/share-html'
import { appendTrackingParams } from '../_lib/share-shared'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  try {
    return await handleInviteShare(req)
  } catch (err) {
    console.error('[share/invite] unhandled error:', err)
    return simplePage('FairPay', 'Open FairPay to join with this invite.')
  }
}

async function handleInviteShare(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(req.url)
  const code = (url.searchParams.get('code') || '').trim()
  const base = getBaseUrl(req)

  if (!code) {
    return simplePage('FairPay', 'Missing invite code')
  }

  // Referral destination uses `ref` for the invite code (existing register flow).
  // Share attribution `ref` from the share URL is also forwarded via appendTrackingParams
  // only when destination does not already have `ref` — so pass referral code first.
  const redirectUrl = appendTrackingParams(
    `${base}/register?ref=${encodeURIComponent(code)}`,
    url,
  )
  const shareUrl = appendTrackingParams(
    `${base}/share/invite?code=${encodeURIComponent(code)}`,
    url,
  )

  return shareLandingPage(
    {
      title: INVITE_OG_TITLE,
      description: INVITE_OG_DESCRIPTION,
      shareUrl,
      redirectUrl,
      ogImageUrl: defaultOgImageUrl(base),
      bodyText: 'Redirecting to FairPay signup...',
      linkText: 'Join FairPay',
    },
    req.headers.get('user-agent'),
    isBot,
  )
}
