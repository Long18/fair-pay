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

  const accessToken = process.env.MOMO_ACCESS_TOKEN
  const apiUrl = process.env.MOMO_API_URL || 'https://momosv3.apimienphi.com'
  const receiverPhone = process.env.VITE_MOMO_RECEIVER_PHONE || ''

  if (!accessToken) {
    return res.status(500).json({ error: 'MoMo API not configured' })
  }

  const { limit = '10', offset = '0', phone } = req.query

  try {
    const response = await fetch(`${apiUrl}/api/getTransHistory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        phone: (phone as string) || receiverPhone,
        limit: Math.min(parseInt(limit as string) || 10, 100),
        offset: parseInt(offset as string) || 0,
      }),
    })

    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch history' })
  }
}
