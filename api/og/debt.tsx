import { ImageResponse } from '@vercel/og'

import {
  buildDebtOgTitle,
  buildDebtRelationshipLabel,
  fetchDebtOgData,
} from '../_lib/debt-og-data'
import {
  AvatarChip,
  BORDER_SLATE,
  BrandHeader,
  BRAND_TEAL,
  buildFonts,
  formatOgAmount,
  formatOgDate,
  MUTED_SLATE,
  NEGATIVE_RED,
  PillBadge,
  sanitizeOgText,
  SETTLED_GREEN,
  SummaryStat,
  withNoCacheHeaders,
} from './shared'

export const config = {
  runtime: 'edge',
}

function DebtStatusBadge({ allSettled }: { allSettled: boolean }) {
  if (allSettled) {
    return (
      <PillBadge
        label="All settled"
        color={SETTLED_GREEN}
        background={`${SETTLED_GREEN}15`}
        borderColor={`${SETTLED_GREEN}30`}
      />
    )
  }

  return (
    <PillBadge
      label="Balance summary"
      color={BRAND_TEAL}
      background={`${BRAND_TEAL}15`}
      borderColor={`${BRAND_TEAL}30`}
    />
  )
}

function buildMetaLine(transactionCount: number, latestActivityAt: string | null): string {
  const transactionLabel = transactionCount === 1
    ? '1 shared expense'
    : `${transactionCount} shared expenses`

  if (!latestActivityAt) {
    return transactionLabel
  }

  return `${transactionLabel} - ${formatOgDate(latestActivityAt)}`
}

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url)
    const viewerId = url.searchParams.get('viewer_id') || url.searchParams.get('user_id')
    const counterpartyId = url.searchParams.get('counterparty_id') || url.searchParams.get('id')

    if (!viewerId || !counterpartyId) {
      const fonts = await buildFonts('FairPay Missing debt identifiers')
      return withNoCacheHeaders(new ImageResponse(
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: '#f8fafc',
          fontFamily: 'Inter',
        }}>
          <BrandHeader />
          <span style={{ fontSize: 18, color: '#94a3b8' }}>Missing debt identifiers</span>
        </div>,
        { width: 1200, height: 630, ...(fonts ? { fonts } : {}) },
      ))
    }

    const debt = await fetchDebtOgData(viewerId, counterpartyId)
    if (!debt) {
      const fonts = await buildFonts('FairPay Debt not found')
      return withNoCacheHeaders(new ImageResponse(
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: '#f8fafc',
          fontFamily: 'Inter',
        }}>
          <BrandHeader />
          <span style={{ fontSize: 18, color: '#94a3b8' }}>Debt not found</span>
        </div>,
        { width: 1200, height: 630, ...(fonts ? { fonts } : {}) },
      ))
    }

    const relationshipLabel = buildDebtRelationshipLabel(debt)
    const title = debt.counterparty_name
    const highlightedAmount = debt.all_settled
      ? formatOgAmount(0, debt.currency)
      : formatOgAmount(debt.net_amount, debt.currency)
    const amountColor = debt.all_settled
      ? BRAND_TEAL
      : debt.i_owe_them
        ? NEGATIVE_RED
        : SETTLED_GREEN
    const metaLine = buildMetaLine(debt.transaction_count, debt.latest_activity_at)
    const allText = sanitizeOgText([
      'FairPay',
      buildDebtOgTitle(debt),
      relationshipLabel,
      title,
      highlightedAmount,
      formatOgAmount(debt.total_i_owe, debt.currency),
      formatOgAmount(debt.total_they_owe, debt.currency),
      metaLine,
      debt.viewer_name,
      debt.counterparty_name,
      debt.all_settled ? 'All settled' : 'Balance summary',
    ].join(' '))
    const fonts = await buildFonts(allText)

    return withNoCacheHeaders(new ImageResponse(
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: 40,
        fontFamily: 'Inter',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: 680,
          background: 'white',
          borderRadius: 20,
          padding: '48px 52px',
          border: `1px solid ${BORDER_SLATE}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          borderLeft: `6px solid ${amountColor}`,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 32,
          }}>
            <BrandHeader />
            <DebtStatusBadge allSettled={debt.all_settled} />
          </div>

          <div style={{
            display: 'flex',
            width: '100%',
            height: 1,
            borderBottom: `2px dashed ${BORDER_SLATE}`,
            marginBottom: 28,
          }} />

          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <AvatarChip
              name={debt.counterparty_name}
              avatarUrl={debt.counterparty_avatar_url}
              colorIndex={0}
            />
            <AvatarChip
              name={debt.viewer_name}
              avatarUrl={debt.viewer_avatar_url}
              colorIndex={1}
            />
          </div>

          <div style={{
            display: 'flex',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: MUTED_SLATE,
            marginBottom: 12,
          }}>
            {relationshipLabel}
          </div>

          <div style={{
            display: 'flex',
            fontSize: 36,
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: 18,
            lineHeight: 1.2,
            letterSpacing: -1,
          }}>
            {title}
          </div>

          <div style={{
            display: 'flex',
            fontSize: 60,
            fontWeight: 800,
            color: amountColor,
            marginBottom: 26,
            letterSpacing: -2,
          }}>
            {highlightedAmount}
          </div>

          <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
            <SummaryStat
              label="You owe"
              value={formatOgAmount(debt.total_i_owe, debt.currency)}
              valueColor={NEGATIVE_RED}
            />
            <SummaryStat
              label="Owes you"
              value={formatOgAmount(debt.total_they_owe, debt.currency)}
              valueColor={SETTLED_GREEN}
            />
          </div>

          <div style={{
            display: 'flex',
            width: '100%',
            height: 1,
            borderBottom: `2px dashed ${BORDER_SLATE}`,
            marginBottom: 20,
          }} />

          <div style={{ display: 'flex', fontSize: 16, color: '#94a3b8' }}>
            {metaLine}
          </div>
        </div>
      </div>,
      { width: 1200, height: 630, ...(fonts ? { fonts } : {}) },
    ))
  } catch (error) {
    console.error('Debt OG error:', error)
    const fonts = await buildFonts('FairPay')
    return withNoCacheHeaders(new ImageResponse(
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        fontFamily: 'Inter',
      }}>
        <BrandHeader />
      </div>,
      { width: 1200, height: 630, ...(fonts ? { fonts } : {}) },
    ))
  }
}
