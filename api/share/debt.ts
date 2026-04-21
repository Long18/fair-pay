import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  buildDebtOgDescription,
  buildDebtOgTitle,
  fetchDebtOgData,
} from '../_lib/debt-og-data'
import {
  applyShareHeaders,
  getBaseUrl,
  renderRedirectPage,
  renderSimplePage,
  toVersionToken,
} from './shared'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed')
    return
  }

  const counterpartyParam = req.query.counterparty_id || req.query.id
  const viewerParam = req.query.viewer_id || req.query.user_id
  const counterpartyId = Array.isArray(counterpartyParam) ? counterpartyParam[0] : counterpartyParam
  const viewerId = Array.isArray(viewerParam) ? viewerParam[0] : viewerParam

  applyShareHeaders(res)

  if (!viewerId || !counterpartyId) {
    res.status(200).send(renderSimplePage({
      title: 'FairPay',
      body: 'Missing debt identifiers',
    }))
    return
  }

  const base = getBaseUrl(req)
  const debt = await fetchDebtOgData(viewerId, counterpartyId)
  const queryVersion = Array.isArray(req.query.v) ? req.query.v[0] : req.query.v
  const version = queryVersion || toVersionToken(
    debt?.latest_activity_at || `${viewerId}-${counterpartyId}`,
  )

  const redirectUrl = `${base}/debts/${encodeURIComponent(counterpartyId)}?v=${encodeURIComponent(version)}`
  const shareUrl = `${base}/api/share/debt?viewer_id=${encodeURIComponent(viewerId)}&counterparty_id=${encodeURIComponent(counterpartyId)}&v=${encodeURIComponent(version)}`
  const ogImageUrl = `${base}/api/og/debt?viewer_id=${encodeURIComponent(viewerId)}&counterparty_id=${encodeURIComponent(counterpartyId)}&v=${encodeURIComponent(version)}`

  res.status(200).send(renderRedirectPage({
    title: buildDebtOgTitle(debt),
    description: buildDebtOgDescription(debt),
    shareUrl,
    redirectUrl,
    ogImageUrl,
    bodyText: 'Redirecting to FairPay debt page...',
    linkText: 'Open debt summary',
  }))
}
