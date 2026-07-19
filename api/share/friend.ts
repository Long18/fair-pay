import { isBot } from '../_lib/bots'
import {
  buildProfileOgDescription,
  buildProfileOgTitle,
  fetchProfileOgData,
  resolveEntityOgImage,
} from '../_lib/entity-og-data'
import {
  getBaseUrl,
  shareLandingPage,
  simplePage,
} from '../_lib/share-html'
import { appendTrackingParams } from '../_lib/share-shared'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  try {
    return await handleFriendShare(req)
  } catch (err) {
    console.error('[share/friend] unhandled error:', err)
    return simplePage('FairPay', 'Open FairPay to view this friend.')
  }
}

async function handleFriendShare(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const base = getBaseUrl(req)

  if (!id) {
    return simplePage('FairPay', 'Missing friend id')
  }

  const profile = await fetchProfileOgData(id)
  const redirectUrl = appendTrackingParams(
    `${base}/friends/${encodeURIComponent(id)}`,
    url,
  )
  const shareUrl = appendTrackingParams(
    `${base}/share/friends/${encodeURIComponent(id)}`,
    url,
  )

  return shareLandingPage(
    {
      title: buildProfileOgTitle(profile),
      description: buildProfileOgDescription(profile),
      shareUrl,
      redirectUrl,
      ogImageUrl: resolveEntityOgImage(base, profile?.avatar_url),
      bodyText: 'Redirecting to FairPay friend page...',
      linkText: 'Open friend',
    },
    req.headers.get('user-agent'),
    isBot,
  )
}
