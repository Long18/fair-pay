import type { VercelRequest, VercelResponse } from '@vercel/node'

const NO_CACHE = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
const TRACKING_QUERY_PARAMS = new Set([
  'ref',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
])

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function toVersionToken(raw: string): string {
  const value = raw.trim()
  const parsed = Date.parse(value)
  if (!Number.isNaN(parsed)) {
    return String(Math.floor(parsed / 1000))
  }

  const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, '')
  return sanitized || '0'
}

export function appendTrackingParams(targetUrl: string, sourceUrl: URL): string {
  const url = new URL(targetUrl)

  for (const key of TRACKING_QUERY_PARAMS) {
    const value = sourceUrl.searchParams.get(key)
    if (value && !url.searchParams.has(key)) {
      url.searchParams.set(key, value.slice(0, 255))
    }
  }

  return url.toString()
}

