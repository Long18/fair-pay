import { ImageResponse } from '@vercel/og'

import {
  buildDebtDirectOgDescription,
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

function getFirstName(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts[0] || name
}

function buildMetaLine(
  openCount: number,
  totalCount: number,
  latestActivityAt: string | null,
): string {
  const transactionLabel = openCount > 0
    ? openCount === 1
      ? '1 open item'
      : `${openCount} open items`
    : totalCount === 1
      ? '1 shared expense'
      : `${totalCount} shared expenses`

  if (!latestActivityAt) {
    return transactionLabel
  }

  return `${transactionLabel} - ${formatOgDate(latestActivityAt)}`
}

function RelationshipIcon({
  color,
}: {
  color: string
}) {
  return (
    <div style={{
      display: 'flex',
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      background: `${color}10`,
      border: `1.5px solid ${color}24`,
      boxShadow: `0 10px 30px ${color}12`,
    }}>
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
        <path
          d="M7 12H25.5M25.5 12L21 7.5M25.5 12L21 16.5"
          stroke={color}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M27 22H8.5M8.5 22L13 17.5M8.5 22L13 26.5"
          stroke={color}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function PersonNode({
  name,
  subtitle,
  avatarUrl,
  colorIndex,
}: {
  name: string
  subtitle: string
  avatarUrl?: string | null
  colorIndex: number
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      minWidth: 0,
      flex: 1,
    }}>
      <div style={{
        display: 'flex',
        width: 86,
        height: 86,
        borderRadius: 43,
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
        background: 'white',
        border: `1.5px solid ${BORDER_SLATE}`,
      }}>
        <OgAvatar
          name={name}
          avatarUrl={avatarUrl}
          size={78}
          colorIndex={colorIndex}
        />
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        minWidth: 0,
      }}>
        <span style={{
          display: 'flex',
          fontSize: 18,
          fontWeight: 700,
          color: '#0f172a',
          textAlign: 'center',
          lineHeight: 1.2,
        }}>
          {name}
        </span>
        <span style={{
          display: 'flex',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: MUTED_SLATE,
        }}>
          {subtitle}
        </span>
      </div>
    </div>
  )
}

function RecentActivityRow({
  description,
  dateLabel,
  groupName,
  amountLabel,
  iOweThem,
  isSettled,
}: {
  description: string
  dateLabel: string
  groupName: string | null
  amountLabel: string
  iOweThem: boolean
  isSettled: boolean
}) {
  const baseDotColor = iOweThem ? NEGATIVE_RED : SETTLED_GREEN
  const dotColor = isSettled ? MUTED_SLATE : baseDotColor
  const amountColor = isSettled ? MUTED_SLATE : baseDotColor
  const rowOpacity = isSettled ? 0.55 : 1
  const metaLine = groupName ? `${dateLabel} · ${groupName}` : dateLabel
  const truncatedDescription = description.length > 32
    ? `${description.slice(0, 31)}…`
    : description

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      opacity: rowOpacity,
    }}>
      <div style={{
        display: 'flex',
        width: 10,
        height: 10,
        borderRadius: 5,
        background: dotColor,
        flexShrink: 0,
      }} />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 0,
        flex: 1,
      }}>
        <span style={{
          display: 'flex',
          fontSize: 15,
          fontWeight: 600,
          color: '#0f172a',
          lineHeight: 1.2,
        }}>
          {truncatedDescription}
        </span>
        <span style={{
          display: 'flex',
          fontSize: 12,
          fontWeight: 500,
          color: MUTED_SLATE,
          lineHeight: 1.2,
        }}>
          {metaLine}
        </span>
      </div>
      <span style={{
        display: 'flex',
        fontSize: 16,
        fontWeight: 700,
        color: amountColor,
        letterSpacing: -0.4,
        textDecoration: isSettled ? 'line-through' : 'none',
      }}>
        {amountLabel}
      </span>
    </div>
  )
}

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url)
    const viewerId = url.searchParams.get('viewer_id') || url.searchParams.get('user_id')
    const counterpartyId = url.searchParams.get('counterparty_id') || url.searchParams.get('id')

    if (!viewerId || !counterpartyId) {
      if (counterpartyId) {
        const counterparty = await fetchDebtOgCounterparty(counterpartyId)
        if (counterparty) {
          const fallbackTitle = buildDebtDirectOgTitle(counterparty)
          const fallbackDescription = buildDebtDirectOgDescription(counterparty)
          const fallbackText = sanitizeOgText([
            'FairPay',
            fallbackTitle,
            fallbackDescription,
            counterparty.counterparty_name,
            'Debt detail',
            'You',
          ].join(' '))
          const fonts = await buildFonts(fallbackText)

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
                borderLeft: `6px solid ${BRAND_TEAL}`,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 32,
                }}>
                  <BrandHeader />
                  <PillBadge
                    label="Debt detail"
                    color={BRAND_TEAL}
                    background={`${BRAND_TEAL}15`}
                    borderColor={`${BRAND_TEAL}30`}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  width: '100%',
                  height: 1,
                  borderBottom: `2px dashed ${BORDER_SLATE}`,
                  marginBottom: 28,
                }} />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  marginBottom: 24,
                }}>
                  <PersonNode
                    name="You"
                    subtitle="Viewer"
                    colorIndex={1}
                  />
                  <RelationshipIcon color={BRAND_TEAL} />
                  <PersonNode
                    name={counterparty.counterparty_name}
                    subtitle="Counterparty"
                    avatarUrl={counterparty.counterparty_avatar_url}
                    colorIndex={0}
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
                  Direct debt link
                </div>

                <div style={{
                  display: 'flex',
                  fontSize: 34,
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: 4,
                  lineHeight: 1.2,
                  letterSpacing: -1,
                }}>
                  Open debt details with {getFirstName(counterparty.counterparty_name)}
                </div>
              </div>
            </div>,
            { width: 1200, height: 630, ...(fonts ? { fonts } : {}) },
          ))
        }
      }

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
    const highlightedAmount = debt.all_settled
      ? formatOgAmount(0, debt.currency)
      : formatOgAmount(debt.net_amount, debt.currency)
    const amountColor = debt.all_settled
      ? BRAND_TEAL
      : debt.i_owe_them
        ? NEGATIVE_RED
        : SETTLED_GREEN
    const openCount = debt.unpaid_count + debt.partial_count
    const counterpartyFirstName = getFirstName(debt.counterparty_name)
    const metaLine = buildMetaLine(openCount, debt.transaction_count, debt.latest_activity_at)
    const netSign = debt.all_settled
      ? ''
      : debt.i_owe_them
        ? '−'
        : '+'
    const signedHeadline = `${netSign}${highlightedAmount}`
    const headlineLabel = debt.all_settled
      ? `All settled with ${counterpartyFirstName}`
      : debt.i_owe_them
        ? `You owe ${counterpartyFirstName}`
        : `${counterpartyFirstName} owes you`
    const recentTransactions = debt.recent_transactions
    const allText = sanitizeOgText([
      'FairPay',
      buildDebtOgTitle(debt),
      relationshipLabel,
      debt.counterparty_name,
      signedHeadline,
      headlineLabel,
      formatOgAmount(debt.total_i_owe, debt.currency),
      formatOgAmount(debt.total_they_owe, debt.currency),
      metaLine,
      debt.viewer_name,
      'Recent activity',
      'You owe',
      'Owes you',
      ...recentTransactions.flatMap((tx) => [
        tx.description,
        formatOgDate(tx.expense_date),
        tx.group_name ?? '',
        formatOgAmount(tx.is_settled ? tx.split_amount : tx.remaining_amount, debt.currency),
      ]),
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
          width: 720,
          background: 'white',
          borderRadius: 20,
          padding: '40px 48px',
          border: `1px solid ${BORDER_SLATE}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          borderLeft: `6px solid ${amountColor}`,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <BrandHeader />
            <DebtStatusBadge allSettled={debt.all_settled} />
          </div>

          <div style={{
            display: 'flex',
            width: '100%',
            height: 1,
            borderBottom: `2px dashed ${BORDER_SLATE}`,
            marginBottom: 18,
          }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginBottom: 18,
          }}>
            <PersonNode
              name={debt.viewer_name}
              subtitle="You"
              avatarUrl={debt.viewer_avatar_url}
              colorIndex={1}
            />
            <RelationshipIcon color={amountColor} />
            <PersonNode
              name={debt.counterparty_name}
              subtitle="Counterparty"
              avatarUrl={debt.counterparty_avatar_url}
              colorIndex={0}
            />
          </div>

          <div style={{
            display: 'flex',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: MUTED_SLATE,
            marginBottom: 4,
          }}>
            {headlineLabel}
          </div>

          <div style={{
            display: 'flex',
            fontSize: 60,
            fontWeight: 800,
            color: amountColor,
            marginBottom: 18,
            letterSpacing: -2,
            lineHeight: 1.1,
          }}>
            {signedHeadline}
          </div>

          {!debt.all_settled && (
            <div style={{
              display: 'flex',
              gap: 24,
              marginBottom: 18,
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minWidth: 0,
              }}>
                <span style={{
                  display: 'flex',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: MUTED_SLATE,
                }}>
                  You owe
                </span>
                <span style={{
                  display: 'flex',
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: -0.4,
                }}>
                  {formatOgAmount(debt.total_i_owe, debt.currency)}
                </span>
              </div>
              <div style={{
                display: 'flex',
                width: 1,
                background: BORDER_SLATE,
              }} />
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minWidth: 0,
              }}>
                <span style={{
                  display: 'flex',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: MUTED_SLATE,
                }}>
                  Owes you
                </span>
                <span style={{
                  display: 'flex',
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: -0.4,
                }}>
                  {formatOgAmount(debt.total_they_owe, debt.currency)}
                </span>
              </div>
            </div>
          )}

          {recentTransactions.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginBottom: 18,
            }}>
              <span style={{
                display: 'flex',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: MUTED_SLATE,
              }}>
                Recent activity
              </span>
              {recentTransactions.map((tx) => (
                <RecentActivityRow
                  key={tx.expense_id}
                  description={tx.description}
                  dateLabel={formatOgDate(tx.expense_date)}
                  groupName={tx.group_name}
                  amountLabel={formatOgAmount(
                    tx.is_settled ? tx.split_amount : tx.remaining_amount,
                    debt.currency,
                  )}
                  iOweThem={tx.i_owe_them}
                  isSettled={tx.is_settled}
                />
              ))}
            </div>
          )}

          <div style={{
            display: 'flex',
            width: '100%',
            height: 1,
            borderBottom: `2px dashed ${BORDER_SLATE}`,
            marginBottom: 14,
          }} />

          <div style={{ display: 'flex', fontSize: 15, color: '#94a3b8' }}>
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
