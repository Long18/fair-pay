import type { VercelRequest, VercelResponse } from '@vercel/node'

const FALLBACK_SUPABASE_URL = 'https://nowtovakbozjjkdsjmtd.supabase.co'
const TARGET_PATH = '/functions/v1/fairpay-external-agent-api/v1/external-agent-submissions'

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  res.setHeader('Cache-Control', 'no-store')
}

function getBody(req: VercelRequest): string {
  if (typeof req.body === 'string') {
    return req.body
  }

  if (req.body && typeof req.body === 'object') {
    return JSON.stringify(req.body)
  }

  return '{}'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed',
      },
    })
    return
  }

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || FALLBACK_SUPABASE_URL).replace(
    /\/$/,
    '',
  )
  const targetUrl = `${supabaseUrl}${TARGET_PATH}`

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': String(req.headers['user-agent'] || 'fairpay-vercel-proxy'),
        'x-forwarded-for': String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''),
      },
      body: getBody(req),
    })

    const contentType = upstreamResponse.headers.get('content-type') || 'application/json'
    const responseText = await upstreamResponse.text()

    res.status(upstreamResponse.status)
    res.setHeader('Content-Type', contentType)
    res.send(responseText)
  } catch (error) {
    res.status(502).json({
      error: {
        code: 'EXTERNAL_AGENT_PROXY_FAILED',
        message: error instanceof Error ? error.message : 'Unable to submit external agent proposal',
      },
    })
  }
}
