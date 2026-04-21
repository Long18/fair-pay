import type { VercelRequest, VercelResponse } from '@vercel/node'

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
  applyShareHeaders,
  getBaseUrl,
  renderRedirectPage,
  renderSimplePage,
  toVersionToken,
} from '../_lib/share-shared'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return await handleDebtShare(req, res)
  } catch (err) {
    console.error('[share/debt] unhandled error:', err)
    try {
      res.status(200).send(renderSimplePage({ title: 'FairPay', body: 'Open FairPay to view this debt.' }))
    } catch {
      // Last-resort fallback if even renderSimplePage fails
      res.status(200).send('<html><body><p>Open FairPay to view this debt.</p></body></html>')
    }
  }
}

async function handleDebtShare(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed')
    return
  }

  // ── Resolve IDs: short token (`t`) or legacy query params ──
  let viewerId: string | undefined
  let counterpartyId: string | undefined
  let usedToken = false

  const tokenParam = Array.isArray(req.query.t) ? req.query.t[0] : req.query.t
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
    const counterpartyParam = req.query.counterparty_id || req.query.id
    counterpartyId = Array.isArray(counterpartyParam) ? counterpartyParam[0] : counterpartyParam
  }
  if (!viewerId) {
    const viewerParam = req.query.viewer_id || req.query.user_id
    viewerId = Array.isArray(viewerParam) ? viewerParam[0] : viewerParam
  }

  // ── Redirect legacy long URLs → compact token URL ──
  // When both viewer + counterparty came from old-style query params (not token),
  // 301 redirect to the short format so crawlers and users always see the canonical URL.
  if (viewerId && counterpartyId && !usedToken) {
    const base = getBaseUrl(req)
    const queryVersion = Array.isArray(req.query.v) ? req.query.v[0] : req.query.v
    const token = encodeDebtToken(viewerId, counterpartyId)
    const shortUrl = `${base}/api/share/debt?t=${encodeURIComponent(token)}${queryVersion ? `&v=${encodeURIComponent(queryVersion)}` : ''}`
    res.setHeader('Location', shortUrl)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.status(301).end()
    return
  }

  applyShareHeaders(res)

  if (!counterpartyId) {
    res.status(200).send(renderSimplePage({
      title: 'FairPay',
      body: 'Missing debt counterparty id',
    }))
    return
  }

  const base = getBaseUrl(req)
  const queryVersion = Array.isArray(req.query.v) ? req.query.v[0] : req.query.v

  // ── Counterparty-only link (no viewer) ──
  if (!viewerId) {
    const counterparty = await fetchDebtOgCounterparty(counterpartyId)
    const version = queryVersion || toVersionToken(counterpartyId)
    const directUrl = `${base}/debts/${encodeURIComponent(counterpartyId)}?v=${encodeURIComponent(version)}`
    const ogImageUrl = `${base}/api/og/debt?counterparty_id=${encodeURIComponent(counterpartyId)}&v=${encodeURIComponent(version)}`

    res.status(200).send(renderRedirectPage({
      title: buildDebtDirectOgTitle(counterparty),
      description: buildDebtDirectOgDescription(counterparty),
      shareUrl: directUrl,
      redirectUrl: directUrl,
      ogImageUrl,
      bodyText: 'Redirecting to FairPay debt page...',
      linkText: 'Open debt detail',
    }))
    return
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
