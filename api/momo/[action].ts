import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthenticatedUser } from '../_lib/auth.js'
import { handleCorsPreflightIfNeeded } from '../_lib/cors.js'

// ── /api/momo/check-transaction ───────────────────────────────────────────────

async function handleCheckTransaction(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { user, error } = await getAuthenticatedUser(req.headers.authorization)
  if (!user) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  const accessToken = process.env.MOMO_ACCESS_TOKEN
  const apiUrl = process.env.MOMO_API_URL || 'https://momosv3.apimienphi.com'
  const receiverPhone = process.env.VITE_MOMO_RECEIVER_PHONE || ''

  if (!accessToken) {
    return res.status(500).json({ error: 'MoMo API not configured' })
  }

  const { referenceCode, tranId, phone } = req.body || {}

  let endpoint: string
  let body: Record<string, unknown>

  if (tranId) {
    endpoint = `${apiUrl}/api/checkTranId`
    body = { access_token: accessToken, tranId }
  } else if (referenceCode) {
    endpoint = `${apiUrl}/api/checkTranContent`
    body = { access_token: accessToken, phone: phone || receiverPhone, content: referenceCode }
  } else {
    return res.status(400).json({ error: 'Missing referenceCode or tranId' })
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  return res.status(200).json(data)
}

// ── /api/momo/history ─────────────────────────────────────────────────────────

async function handleHistory(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { user, error } = await getAuthenticatedUser(req.headers.authorization)
  if (!user) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  const accessToken = process.env.MOMO_ACCESS_TOKEN
  const apiUrl = process.env.MOMO_API_URL || 'https://momosv3.apimienphi.com'
  const receiverPhone = process.env.VITE_MOMO_RECEIVER_PHONE || ''

  if (!accessToken) {
    return res.status(500).json({ error: 'MoMo API not configured' })
  }

  const { limit = '10', offset = '0', phone } = req.query

  const response = await fetch(`${apiUrl}/api/getTransHistory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_token: accessToken,
      phone: (phone as string) || receiverPhone,
      limit: Math.min(parseInt(limit as string) || 10, 100),
      offset: parseInt(offset as string) || 0,
    }),
  })

  const data = await response.json()
  return res.status(200).json(data)
}

// ── /api/momo/qr ──────────────────────────────────────────────────────────────

async function handleQr(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { user, error } = await getAuthenticatedUser(req.headers.authorization)
  if (!user) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  const apiUrl = process.env.MOMO_API_URL || 'https://momosv3.apimienphi.com'
  const receiverPhone = process.env.VITE_MOMO_RECEIVER_PHONE || ''

  const { amount, referenceCode } = req.query
  if (!amount || !referenceCode) {
    return res.status(400).json({ error: 'Missing amount or referenceCode' })
  }

  const params = new URLSearchParams({
    phone: receiverPhone,
    amount: String(amount),
    note: String(referenceCode),
  })

  return res.status(200).json({
    success: true,
    qrUrl: `${apiUrl}/api/QRCode?${params.toString()}`,
  })
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>

const HANDLERS: Record<string, Handler> = {
  'check-transaction': handleCheckTransaction,
  history: handleHistory,
  qr: handleQr,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCorsPreflightIfNeeded(req, res)) return

  const action = req.query.action as string
  const fn = HANDLERS[action]

  if (!fn) {
    return res.status(404).json({ error: `Unknown momo action: ${action}` })
  }

  try {
    return await fn(req, res)
  } catch (err) {
    console.error(`[momo/${action}]`, err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
