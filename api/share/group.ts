import { isBot } from '../_lib/bots'
import {
  buildGroupOgDescription,
  buildGroupOgTitle,
  fetchGroupOgData,
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
    return await handleGroupShare(req)
  } catch (err) {
    console.error('[share/group] unhandled error:', err)
    return simplePage('FairPay', 'Open FairPay to view this group.')
  }
}

async function handleGroupShare(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const base = getBaseUrl(req)

  if (!id) {
    return simplePage('FairPay', 'Missing group id')
  }

  const group = await fetchGroupOgData(id)
  const redirectUrl = appendTrackingParams(
    `${base}/groups/show/${encodeURIComponent(id)}`,
    url,
  )
  const shareUrl = appendTrackingParams(
    `${base}/share/groups/${encodeURIComponent(id)}`,
    url,
  )

  return shareLandingPage(
    {
      title: buildGroupOgTitle(group),
      description: buildGroupOgDescription(group),
      shareUrl,
      redirectUrl,
      ogImageUrl: resolveEntityOgImage(base, group?.avatar_url),
      bodyText: 'Redirecting to FairPay group page...',
      linkText: 'Open group',
    },
    req.headers.get('user-agent'),
    isBot,
  )
}
