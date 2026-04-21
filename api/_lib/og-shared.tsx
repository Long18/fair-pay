import { ImageResponse } from '@vercel/og'

import { formatOgAmount, formatOgDate, sanitizeOgText } from '../_lib/og-format'

export { formatOgAmount, formatOgDate, sanitizeOgText }

export const BRAND_TEAL = '#0d9488'
export const SETTLED_GREEN = '#16a34a'
export const NEGATIVE_RED = '#dc2626'
export const MUTED_SLATE = '#64748b'
export const BORDER_SLATE = '#e2e8f0'
export const AVATAR_COLORS = [
  '#0d9488',
  '#3b82f6',
  '#f97316',
  '#a855f7',
  '#ec4899',
  '#22c55e',
  '#eab308',
  '#ef4444',
]

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
}

export function withNoCacheHeaders(response: ImageResponse): ImageResponse {
  Object.entries(NO_CACHE_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

async function loadGoogleFont(font: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${font}:wght@400;600;700;800&text=${encodeURIComponent(text)}`
    const css = await (await fetch(url)).text()
    const resource = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)

    if (!resource) {
      return null
    }

    const response = await fetch(resource[1])
    if (response.status !== 200) {
      return null
    }

    return await response.arrayBuffer()
  } catch {
    return null
  }
}

export async function buildFonts(text: string) {
  const fontData = await loadGoogleFont('Inter', text)
  if (!fontData) return undefined

  return [
    { name: 'Inter', data: fontData, style: 'normal' as const, weight: 400 as const },
    { name: 'Inter', data: fontData, style: 'normal' as const, weight: 600 as const },
    { name: 'Inter', data: fontData, style: 'normal' as const, weight: 700 as const },
    { name: 'Inter', data: fontData, style: 'normal' as const, weight: 800 as const },
  ]
}

export function BrandHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', width: 28, height: 28, borderRadius: 8, background: BRAND_TEAL }} />
      <span style={{ fontSize: 22, fontWeight: 700, color: BRAND_TEAL, letterSpacing: -0.5 }}>
        FairPay
      </span>
    </div>
  )
}

interface PillBadgeProps {
  label: string
  color: string
  background: string
  borderColor: string
}

export function PillBadge({ label, color, background, borderColor }: PillBadgeProps) {
  return (
    <div style={{
      display: 'flex',
      fontSize: 14,
      fontWeight: 600,
      color,
      background,
      border: `1.5px solid ${borderColor}`,
      padding: '5px 14px',
      borderRadius: 20,
      alignItems: 'center',
      gap: 4,
    }}>
      {label}
    </div>
  )
}

interface OgAvatarProps {
  name: string
  avatarUrl?: string | null
  size?: number
  colorIndex?: number
}

export function OgAvatar({
  name,
  avatarUrl,
  size = 26,
  colorIndex = 0,
}: OgAvatarProps) {
  const borderRadius = size / 2

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        width={size}
        height={size}
        style={{ borderRadius, objectFit: 'cover' }}
      />
    )
  }

  return (
    <div style={{
      display: 'flex',
      width: size,
      height: size,
      borderRadius,
      background: AVATAR_COLORS[colorIndex % AVATAR_COLORS.length],
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: Math.max(12, Math.round(size * 0.46)),
      fontWeight: 700,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

interface AvatarChipProps {
  name: string
  avatarUrl?: string | null
  colorIndex?: number
}

export function AvatarChip({ name, avatarUrl, colorIndex = 0 }: AvatarChipProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 12px 6px 6px',
      borderRadius: 20,
      background: '#f1f5f9',
    }}>
      <OgAvatar name={name} avatarUrl={avatarUrl} colorIndex={colorIndex} />
      <span style={{ display: 'flex', fontSize: 13, fontWeight: 600, color: '#334155' }}>
        {name}
      </span>
    </div>
  )
}

interface SummaryStatProps {
  label: string
  value: string
  valueColor: string
}

export function SummaryStat({ label, value, valueColor }: SummaryStatProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 0,
      flex: 1,
      padding: '14px 16px',
      borderRadius: 16,
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
    }}>
      <span style={{
        display: 'flex',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: MUTED_SLATE,
      }}>
        {label}
      </span>
      <span style={{
        display: 'flex',
        fontSize: 24,
        fontWeight: 700,
        color: valueColor,
        letterSpacing: -0.8,
      }}>
        {value}
      </span>
    </div>
  )
}
