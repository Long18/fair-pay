import { ImageResponse } from '@vercel/og'
import { createClient } from '@supabase/supabase-js'

import {
  BRAND_TEAL,
  buildFonts,
  formatOgAmount,
  formatOgDate,
  OgAvatar,
  PillBadge,
  sanitizeOgText,
  SETTLED_GREEN,
  withNoCacheHeaders,
  BrandHeader,
} from './shared'

export const config = {
  runtime: 'edge',
}

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!

interface Participant {
  name: string
  avatar_url: string | null
  is_settled: boolean
}

interface ExpenseData {
  id: string
  description: string
  amount: number
  currency: string
  category: string | null
  expense_date: string
  payer_name: string | null
  receipt_url: string | null
  participants: Participant[]
  split_count: number
  per_person: number
  all_settled: boolean
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  food: { label: 'Food & Drink', color: '#f97316' },
  transport: { label: 'Transport', color: '#3b82f6' },
  entertainment: { label: 'Entertainment', color: '#a855f7' },
  shopping: { label: 'Shopping', color: '#ec4899' },
  utilities: { label: 'Utilities', color: '#eab308' },
  rent: { label: 'Rent', color: '#14b8a6' },
  health: { label: 'Health', color: '#ef4444' },
  education: { label: 'Education', color: '#6366f1' },
  travel: { label: 'Travel', color: '#06b6d4' },
  groceries: { label: 'Groceries', color: '#22c55e' },
  other: { label: 'Expense', color: '#64748b' },
}

async function fetchExpense(id: string): Promise<ExpenseData | null> {
  try {
    // Keep anon client as primary path for SECURITY DEFINER RPC.
    // Use service_role only as fallback for environments where RPC isn't deployed.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const sbAnon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const sbService = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) : null

    const [ogResult, splits] = await Promise.all([
      sbAnon.rpc('get_expense_og_data', { p_expense_id: id }).then(
        (res) => res,
        () => ({ data: null, error: null }),
      ),
      sbAnon.rpc('get_expense_splits_public', { p_expense_id: id }).then(
        (res) => res,
        () => ({ data: null, error: null }),
      ),
    ])

    let e: {
      id: string
      description: string
      amount: number
      currency: string
      category: string | null
      expense_date: string
      payer_name: string | null
    } | null = null
    let receiptStoragePath: string | null = null
    let allSettled = false

    if (!ogResult.error && ogResult.data && ogResult.data.length > 0) {
      const og = ogResult.data[0] as Record<string, unknown>
      e = {
        id: String(og.id),
        description: String(og.description ?? ''),
        amount: Number(og.amount ?? 0),
        currency: String(og.currency ?? 'VND'),
        category: og.category ? String(og.category) : null,
        expense_date: String(og.expense_date ?? ''),
        payer_name: og.payer_name ? String(og.payer_name) : null,
      }
      receiptStoragePath = og.receipt_storage_path ? String(og.receipt_storage_path) : null
      allSettled = Boolean(og.all_settled)
    } else if (sbService) {
      const [exp, att] = await Promise.all([
        sbService.from('expenses').select(`
          id, description, amount, currency, category, expense_date,
          profiles!expenses_paid_by_user_id_fkey ( full_name )
        `).eq('id', id).single(),
        sbService.from('attachments').select('storage_path, mime_type')
          .eq('expense_id', id).like('mime_type', 'image/%')
          .order('created_at', { ascending: true }).limit(1),
      ])
      if (exp.error || !exp.data) return null

      const base = exp.data
      const profArr = base.profiles as unknown as { full_name: string }[] | null
      e = {
        id: base.id,
        description: base.description,
        amount: Number(base.amount),
        currency: base.currency,
        category: base.category,
        expense_date: base.expense_date,
        payer_name: profArr?.[0]?.full_name ?? null,
      }
      receiptStoragePath = att.data?.[0]?.storage_path ?? null
    } else {
      return null
    }

    let receiptUrl: string | null = null
    if (receiptStoragePath) {
      const sbForSigned = sbService ?? sbAnon
      const { data: signedData, error: signedError } = await sbForSigned.storage
        .from('receipts')
        .createSignedUrl(receiptStoragePath, 3600) // 1 hour expiry
      if (!signedError && signedData?.signedUrl) {
        receiptUrl = signedData.signedUrl
      }
    }

    // Extract participants from splits — rpc returns full_name/avatar_url directly
    const participants: Participant[] = (splits.data ?? []).map((s: Record<string, unknown>) => ({
      name: (s.full_name as string) ?? (s.user_full_name as string) ?? 'Unknown',
      avatar_url: (s.avatar_url as string) ?? (s.user_avatar_url as string) ?? null,
      is_settled: Boolean(s.is_settled),
    }))
    const splitCount = participants.length || 1
    const perPerson = Math.round(e.amount / splitCount)

    return {
      id: e.id, description: e.description, amount: e.amount,
      currency: e.currency, category: e.category, expense_date: e.expense_date,
      payer_name: e.payer_name, receipt_url: receiptUrl,
      participants, split_count: splitCount, per_person: perPerson,
      all_settled: allSettled,
    }
  } catch { return null }
}

/* ── Shared layout pieces ── */

function CategoryBadge({ label, color }: { label: string; color: string }) {
  return (
    <PillBadge
      label={label}
      color={color}
      background={`${color}15`}
      borderColor={`${color}30`}
    />
  )
}

function SettledBadge() {
  return (
    <PillBadge
      label="Settled"
      color={SETTLED_GREEN}
      background={`${SETTLED_GREEN}15`}
      borderColor={`${SETTLED_GREEN}30`}
    />
  )
}

function MetaLine({ date, payer }: { date: string; payer: string | null }) {
  return (
    <div style={{ display: 'flex', gap: 20, fontSize: 17, color: '#94a3b8' }}>
      <span style={{ display: 'flex' }}>{date}</span>
      {payer ? (
        <span style={{ display: 'flex' }}>
          <span style={{ color: '#475569', marginRight: 8 }}>paid by</span>
          {payer}
        </span>
      ) : null}
    </div>
  )
}

function ParticipantChips({ participants, perPerson, currency }: {
  participants: Participant[]; perPerson: number; currency: string
}) {
  const MAX_SHOW = 4
  const shown = participants.slice(0, MAX_SHOW)
  const overflow = participants.length - MAX_SHOW
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {shown.map((p, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: p.is_settled ? '#f0fdf4' : '#f1f5f9',
            borderRadius: 20, padding: '4px 12px 4px 4px',
          }}>
            <div style={{ display: 'flex', position: 'relative', width: 26, height: 26 }}>
              <OgAvatar
                name={p.name}
                avatarUrl={p.avatar_url}
                colorIndex={i}
              />
              {p.is_settled && (
                <div style={{
                  display: 'flex', position: 'absolute', bottom: -1, right: -2,
                  width: 13, height: 13, borderRadius: 7, background: SETTLED_GREEN,
                  border: '1.5px solid white', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                    <path d="M1 3.5L2.8 5.5L6 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
            <span style={{
              display: 'flex', fontSize: 13, fontWeight: 500,
              color: p.is_settled ? SETTLED_GREEN : '#334155',
            }}>
              {p.name.split(' ').pop()}
            </span>
          </div>
        ))}
        {overflow > 0 && (
          <div style={{ display: 'flex', fontSize: 13, fontWeight: 600, color: '#64748b', background: '#f1f5f9', borderRadius: 20, padding: '4px 12px' }}>
            +{overflow}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', fontSize: 14, color: '#94a3b8' }}>
        {participants.length} people - {formatOgAmount(perPerson, currency)}/person
      </div>
    </div>
  )
}

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id') || url.searchParams.get('expense_id')

    if (!id) {
      const fonts = await buildFonts('FairPay')
      return withNoCacheHeaders(new ImageResponse(
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter' }}>
          <BrandHeader />
        </div>,
        { width: 1200, height: 630, ...(fonts ? { fonts } : {}) },
      ))
    }

    const expense = await fetchExpense(id)
    if (!expense) {
      const fonts = await buildFonts('FairPay Expense not found')
      return withNoCacheHeaders(new ImageResponse(
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: 16, fontFamily: 'Inter' }}>
          <BrandHeader />
          <span style={{ fontSize: 18, color: '#94a3b8' }}>Expense not found</span>
        </div>,
        { width: 1200, height: 630, ...(fonts ? { fonts } : {}) },
      ))
    }

    const cat = CATEGORY_META[expense.category ?? 'other'] ?? CATEGORY_META.other
    const amount = formatOgAmount(expense.amount, expense.currency)
    const date = formatOgDate(expense.expense_date)
    // Sanitize description — strip currency symbols Satori can't render
    const rawDesc = sanitizeOgText(expense.description)
    const desc = rawDesc.length > 70
      ? rawDesc.slice(0, 67) + '...'
      : rawDesc

    // Collect all text that will be rendered so the font includes every glyph
    const allText = sanitizeOgText([
      'FairPay', cat.label, desc, amount, date, 'Settled',
      expense.payer_name ? `paid by ${expense.payer_name}` : '',
      ...expense.participants.map((p) => p.name),
      `${expense.split_count} people`, `${formatOgAmount(expense.per_person, expense.currency)}/person`,
    ].join(' '))
    const fonts = await buildFonts(allText)

    // ── With receipt: receipt left + card right ──
    if (expense.receipt_url) {
      return withNoCacheHeaders(new ImageResponse(
        <div style={{
          width: '100%', height: '100%', display: 'flex',
          background: '#f8fafc', padding: 40, gap: 40, fontFamily: 'Inter',
        }}>
          <div style={{
            width: 440, height: 550, display: 'flex',
            borderRadius: 16, overflow: 'hidden',
            border: '1px solid #e2e8f0', background: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}>
            <img src={expense.receipt_url} width={440} height={550}
              style={{ objectFit: 'cover' }} />
          </div>
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            justifyContent: 'center', gap: 0,
            borderLeft: expense.all_settled ? '6px solid ' + SETTLED_GREEN : 'none',
            paddingLeft: expense.all_settled ? 24 : 0,
          }}>
            <div style={{ display: 'flex', marginBottom: 24 }}><BrandHeader /></div>
            <div style={{ display: 'flex', marginBottom: 16 }}>
              <CategoryBadge label={cat.label} color={cat.color} />
            </div>
            {expense.all_settled && (
              <div style={{ display: 'flex', marginBottom: 16 }}>
                <SettledBadge />
              </div>
            )}
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: '#0f172a', marginBottom: 20, lineHeight: 1.3 }}>
              {desc}
            </div>
            <div style={{ display: 'flex', fontSize: 52, fontWeight: 800, color: expense.all_settled ? SETTLED_GREEN : BRAND_TEAL, marginBottom: 24, letterSpacing: -2 }}>
              {amount}
            </div>
            {expense.participants.length > 0 && (
              <div style={{ display: 'flex', marginBottom: 16 }}>
                <ParticipantChips participants={expense.participants} perPerson={expense.per_person} currency={expense.currency} />
              </div>
            )}
            <MetaLine date={date} payer={expense.payer_name} />
          </div>
        </div>,
        { width: 1200, height: 630, ...(fonts ? { fonts } : {}) },
      ))
    }

    // ── No receipt: receipt-style card centered ──
    return withNoCacheHeaders(new ImageResponse(
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#f8fafc', padding: 40, fontFamily: 'Inter',
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column',
          width: 680, background: 'white',
          borderRadius: 20, padding: '48px 52px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          borderLeft: expense.all_settled ? '6px solid ' + SETTLED_GREEN : '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <BrandHeader />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CategoryBadge label={cat.label} color={cat.color} />
              {expense.all_settled && <SettledBadge />}
            </div>
          </div>
          <div style={{ display: 'flex', width: '100%', height: 1, borderBottom: '2px dashed #e2e8f0', marginBottom: 32 }} />
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: '#0f172a', marginBottom: 20, lineHeight: 1.3 }}>
            {desc}
          </div>
          <div style={{ display: 'flex', fontSize: 60, fontWeight: 800, color: expense.all_settled ? SETTLED_GREEN : BRAND_TEAL, marginBottom: 28, letterSpacing: -2 }}>
            {amount}
          </div>
          {expense.participants.length > 0 && (
            <div style={{ display: 'flex', marginBottom: 20 }}>
              <ParticipantChips participants={expense.participants} perPerson={expense.per_person} currency={expense.currency} />
            </div>
          )}
          <div style={{ display: 'flex', width: '100%', height: 1, borderBottom: '2px dashed #e2e8f0', marginBottom: 24 }} />
          <MetaLine date={date} payer={expense.payer_name} />
        </div>
      </div>,
      { width: 1200, height: 630, ...(fonts ? { fonts } : {}) },
    ))
  } catch (err) {
    console.error('OG error:', err)
    const fallbackFonts = await buildFonts('FairPay').catch(() => undefined)
    return withNoCacheHeaders(new ImageResponse(
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter' }}>
        <BrandHeader />
      </div>,
      { width: 1200, height: 630, ...(fallbackFonts ? { fonts: fallbackFonts } : {}) },
    ))
  }
}
