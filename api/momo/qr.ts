import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthenticatedUser } from '../_lib/auth'
import { handleCorsPreflightIfNeeded } from '../_lib/cors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCorsPreflightIfNeeded(req, res)) return

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
