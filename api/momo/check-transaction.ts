import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthenticatedUser } from '../_lib/auth'
import { handleCorsPreflightIfNeeded } from '../_lib/cors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCorsPreflightIfNeeded(req, res)) return

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

  try {
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
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to check transaction' })
  }
}
