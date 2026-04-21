import { ImageResponse } from '@vercel/og'

import {
  buildDebtDirectOgTitle,
  buildDebtOgTitle,
  buildDebtRelationshipLabel,
  fetchDebtOgCounterparty,
  fetchDebtOgData,
} from '../_lib/debt-og-data'
import {
  BORDER_SLATE,
  BrandHeader,
  BRAND_TEAL,
  buildFonts,
  formatOgAmount,
  formatOgDate,
  MUTED_SLATE,
  NEGATIVE_RED,
  OgAvatar,
  PillBadge,
  sanitizeOgText,
  SETTLED_GREEN,
  withNoCacheHeaders,
} from '../_lib/og-shared'

export const config = {
  runtime: 'edge',
}

// ── Shared helpers ──────────────────────────────────────────────────────

function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

function buildMetaLine(
  openCount: number,
  totalCount: number,
  latestActivityAt: string | null,
): string {
  const label = openCount > 0
    ? openCount === 1 ? '1 open item' : `${openCount} open items`
    : totalCount === 1 ? '1 shared expense' : `${totalCount} shared expenses`
  if (!latestActivityAt) return label
  return `${label} · ${formatOgDate(latestActivityAt)}`
}

// ── Reusable components ─────────────────────────────────────────────────

function RelationshipIcon({ color, size = 72 }: { color: string; size?: number }) {
  const r = size / 2
  const s = Math.round(size * 0.47)
  return (
    <div style={{
      display: 'flex',
      width: size,
      height: size,
      borderRadius: r,
      alignItems: 'center',
      justifyContent: 'center',
      background: `${color}10`,
      border: `1.5px solid ${color}24`,
    }}>
      <svg width={s} height={s} viewBox="0 0 34 34" fill="none">
        <path d="M7 12H25.5M25.5 12L21 7.5M25.5 12L21 16.5" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M27 22H8.5M8.5 22L13 17.5M8.5 22L13 26.5" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function PersonNode({
  name, subtitle, avatarUrl, colorIndex, avatarSize = 78,
}: {
  name: string; subtitle: string; avatarUrl?: string | null; colorIndex: number; avatarSize?: number
}) {
  const ring = avatarSize + 8
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
      <div style={{
        display: 'flex', width: ring, height: ring, borderRadius: ring / 2, padding: 4,
        alignItems: 'center', justifyContent: 'center', background: 'white', border: `1.5px solid ${BORDER_SLATE}`,
      }}>
        <OgAvatar name={name} avatarUrl={avatarUrl} size={avatarSize} colorIndex={colorIndex} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <span style={{ display: 'flex', fontSize: 18, fontWeight: 700, color: '#0f172a', textAlign: 'center', lineHeight: 1.2 }}>{name}</span>
        <span style={{ display: 'flex', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED_SLATE }}>{subtitle}</span>
      </div>
    </div>
  )
}

function RecentActivityRow({
  description, dateLabel, groupName, amountLabel, iOweThem, isSettled,
}: {
  description: string; dateLabel: string; groupName: string | null; amountLabel: string; iOweThem: boolean; isSettled: boolean
}) {
  const baseDotColor = iOweThem ? NEGATIVE_RED : SETTLED_GREEN
  const dotColor = isSettled ? MUTED_SLATE : baseDotColor
  const amountColor = isSettled ? MUTED_SLATE : baseDotColor
  const meta = groupName ? `${dateLabel} · ${groupName}` : dateLabel
  const desc = description.length > 32 ? `${description.slice(0, 31)}…` : description

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', opacity: isSettled ? 0.5 : 1 }}>
      <div style={{ display: 'flex', width: 10, height: 10, borderRadius: 5, background: dotColor, flexShrink: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{
          display: 'flex', fontSize: 15, fontWeight: 600, color: '#0f172a', lineHeight: 1.2,
          textDecoration: isSettled ? 'line-through' : 'none',
        }}>{desc}</span>
        <span style={{ display: 'flex', fontSize: 12, fontWeight: 500, color: MUTED_SLATE, lineHeight: 1.2 }}>{meta}</span>
      </div>
      <span style={{
        display: 'flex', fontSize: 16, fontWeight: 700, color: amountColor, letterSpacing: -0.4,
        textDecoration: isSettled ? 'line-through' : 'none',
      }}>{amountLabel}</span>
    </div>
  )
}

// ── Direct path: minimal fallback (no viewer_id) ────────────────────────

async function renderDirectPath(counterpartyId: string) {
  const counterparty = await fetchDebtOgCounterparty(counterpartyId)
  if (!counterparty) return renderFallback('Debt not found')

  const name = counterparty.counterparty_name
  const allText = sanitizeOgText(`FairPay Debt details ${name}`)
  const fonts = await buildFonts(allText)

  return withNoCacheHeaders(new ImageResponse(
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f8fafc', padding: 40, fontFamily: 'Inter',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', width: 640, background: 'white', borderRadius: 20,
        padding: '48px 52px', border: `1px solid ${BORDER_SLATE}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        borderLeft: `6px solid ${BRAND_TEAL}`,
      }}>
        <BrandHeader />

        <div style={{ display: 'flex', width: '100%', height: 1, borderBottom: `2px dashed ${BORDER_SLATE}`, margin: '28px 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <OgAvatar name={name} avatarUrl={counterparty.counterparty_avatar_url} size={64} colorIndex={0} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#0f172a', letterSpacing: -0.8, lineHeight: 1.2 }}>
              {name}
            </span>
            <span style={{ display: 'flex', fontSize: 15, color: MUTED_SLATE }}>
              Debt details on FairPay
            </span>
          </div>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630, ...(fonts ? { fonts } : {}) },
  ))
}

// ── Full enriched path (viewer_id present) ──────────────────────────────

async function renderFullPath(viewerId: string, counterpartyId: string) {
  const debt = await fetchDebtOgData(viewerId, counterpartyId)
  if (!debt) return renderFallback('Debt not found')

  const amountColor = debt.all_settled ? BRAND_TEAL : debt.i_owe_them ? NEGATIVE_RED : SETTLED_GREEN
  const openCount = debt.unpaid_count + debt.partial_count
  const counterpartyFirst = getFirstName(debt.counterparty_name)
  const metaLine = buildMetaLine(openCount, debt.transaction_count, debt.latest_activity_at)

  const netSign = debt.all_settled ? '' : debt.i_owe_them ? '−' : '+'
  const highlightedAmount = debt.all_settled ? formatOgAmount(0, debt.currency) : formatOgAmount(debt.net_amount, debt.currency)
  const signedHeadline = `${netSign}${highlightedAmount}`

  const headlineLabel = debt.all_settled
    ? `All settled with ${counterpartyFirst}`
    : debt.i_owe_them
      ? `You owe ${counterpartyFirst}`
      : `${counterpartyFirst} owes you`

  const txs = debt.recent_transactions

  // Build font subset
  const allText = sanitizeOgText([
    'FairPay', buildDebtOgTitle(debt), buildDebtRelationshipLabel(debt),
    debt.counterparty_name, debt.viewer_name, signedHeadline, headlineLabel,
    formatOgAmount(debt.total_i_owe, debt.currency), formatOgAmount(debt.total_they_owe, debt.currency),
    metaLine, 'Recent activity', 'You owe', 'Owes you', 'Balance summary', 'All settled',
    ...txs.flatMap((tx) => [tx.description, formatOgDate(tx.expense_date), tx.group_name ?? '',
      formatOgAmount(tx.is_settled ? tx.split_amount : tx.remaining_amount, debt.currency)]),
  ].join(' '))
  const fonts = await buildFonts(allText)

  return withNoCacheHeaders(new ImageResponse(
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f8fafc', padding: 40, fontFamily: 'Inter',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', width: 720, background: 'white', borderRadius: 20,
        padding: '40px 48px', border: `1px solid ${BORDER_SLATE}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        borderLeft: `6px solid ${amountColor}`,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <BrandHeader />
          {debt.all_settled
            ? <PillBadge label="All settled" color={SETTLED_GREEN} background={`${SETTLED_GREEN}15`} borderColor={`${SETTLED_GREEN}30`} />
            : <PillBadge label="Balance summary" color={BRAND_TEAL} background={`${BRAND_TEAL}15`} borderColor={`${BRAND_TEAL}30`} />}
        </div>

        <div style={{ display: 'flex', width: '100%', height: 1, borderBottom: `2px dashed ${BORDER_SLATE}`, marginBottom: 18 }} />

        {/* People */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
          <PersonNode name={debt.viewer_name} subtitle="You" avatarUrl={debt.viewer_avatar_url} colorIndex={1} />
          <RelationshipIcon color={amountColor} />
          <PersonNode name={debt.counterparty_name} subtitle="Counterparty" avatarUrl={debt.counterparty_avatar_url} colorIndex={0} />
        </div>

        {/* Headline: relationship label + signed net amount */}
        <div style={{ display: 'flex', fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: MUTED_SLATE, marginBottom: 4 }}>
          {headlineLabel}
        </div>
        <div style={{ display: 'flex', fontSize: 56, fontWeight: 800, color: amountColor, letterSpacing: -2, lineHeight: 1.1, marginBottom: 14 }}>
          {signedHeadline}
        </div>

        {/* Secondary: You owe / Owes you split */}
        {!debt.all_settled && (
          <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ display: 'flex', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED_SLATE }}>You owe</span>
              <span style={{ display: 'flex', fontSize: 16, fontWeight: 600, color: '#334155', letterSpacing: -0.3 }}>{formatOgAmount(debt.total_i_owe, debt.currency)}</span>
            </div>
            <div style={{ display: 'flex', width: 1, background: BORDER_SLATE }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ display: 'flex', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED_SLATE }}>Owes you</span>
              <span style={{ display: 'flex', fontSize: 16, fontWeight: 600, color: '#334155', letterSpacing: -0.3 }}>{formatOgAmount(debt.total_they_owe, debt.currency)}</span>
            </div>
          </div>
        )}

        {/* Recent transactions (up to 3, open first, settled muted+strikethrough) */}
        {txs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <span style={{ display: 'flex', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED_SLATE }}>
              Recent activity
            </span>
            {txs.map((tx) => (
              <RecentActivityRow
                key={tx.expense_id}
                description={tx.description}
                dateLabel={formatOgDate(tx.expense_date)}
                groupName={tx.group_name}
                amountLabel={formatOgAmount(tx.is_settled ? tx.split_amount : tx.remaining_amount, debt.currency)}
                iOweThem={tx.i_owe_them}
                isSettled={tx.is_settled}
              />
            ))}
          </div>
        )}

        {/* Footer meta */}
        <div style={{ display: 'flex', width: '100%', height: 1, borderBottom: `2px dashed ${BORDER_SLATE}`, marginBottom: 12 }} />
        <div style={{ display: 'flex', fontSize: 14, color: '#94a3b8' }}>{metaLine}</div>
      </div>
    </div>,
    { width: 1200, height: 630, ...(fonts ? { fonts } : {}) },
  ))
}

// ── Fallback ────────────────────────────────────────────────────────────

async function renderFallback(message: string) {
  const fonts = await buildFonts(`FairPay ${message}`)
  return withNoCacheHeaders(new ImageResponse(
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16, background: '#f8fafc', fontFamily: 'Inter',
    }}>
      <BrandHeader />
      <span style={{ fontSize: 18, color: '#94a3b8' }}>{message}</span>
    </div>,
    { width: 1200, height: 630, ...(fonts ? { fonts } : {}) },
  ))
}

// ── Main handler ────────────────────────────────────────────────────────

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url)
    const viewerId = url.searchParams.get('viewer_id') || url.searchParams.get('user_id')
    const counterpartyId = url.searchParams.get('counterparty_id') || url.searchParams.get('id')

    // No counterparty at all → generic fallback
    if (!counterpartyId) {
      return renderFallback('Missing debt identifiers')
    }

    // Direct path (no viewer): minimal lightweight card
    if (!viewerId) {
      return renderDirectPath(counterpartyId)
    }

    // Full enriched path: both people, net amount, split, transactions
    return renderFullPath(viewerId, counterpartyId)
  } catch (error) {
    console.error('Debt OG error:', error)
    return renderFallback('FairPay')
  }
}
