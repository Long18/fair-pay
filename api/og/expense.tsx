import { ImageResponse } from '@vercel/og'
import { createClient } from '@supabase/supabase-js'

export const config = {
  runtime: 'edge',
}

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!

interface ExpenseData {
  id: string
  description: string
  amount: number
  currency: string
  category: string | null
  expense_date: string
  payer_name: string | null
  receipt_url: string | null
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

const BRAND_TEAL = '#0d9488'

/**
 * Load Google Font dynamically — fetches only the glyphs needed for the given text.
 * This ensures Vietnamese diacritics (ễ, ó, đ, ư, etc.) render correctly in Satori.
 * Uses the official Vercel-recommended pattern.
 */
async function loadGoogleFont(font: string, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${font}:wght@400;700;800&text=${encodeURIComponent(text)}`
  const css = await (await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  })).text()
  // Match woff2 first, then fall back to opentype/truetype
  const resource = css.match(/src: url\((.+?)\) format\('woff2'\)/)
    || css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)
  if (resource) {
    const response = await fetch(resource[1])
    if (response.status === 200) {
      return await response.arrayBuffer()
    }
  }
  throw new Error('Failed to load font data')
}

function fmt(amount: number, currency: string): string {
  try {
    const num = new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0,
    }).format(amount)
    const c = (currency || 'VND').toUpperCase()
    if (c === 'VND') return `${num} VND`
    return `${num} ${c}`
  } catch {
    return `${amount.toLocaleString()} ${currency}`
  }
}

function fmtDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(y, m - 1, d))
  } catch {
    return dateStr
  }
}

async function fetchExpense(id: string): Promise<ExpenseData | null> {
  try {
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const [exp, att] = await Promise.all([
      sb.from('expenses').select(`
        id, description, amount, currency, category, expense_date,
        profiles!expenses_paid_by_user_id_fkey ( full_name )
      `).eq('id', id).single(),
      sb.from('attachments').select('storage_path, mime_type')
        .eq('expense_id', id).like('mime_type', 'image/%')
        .order('created_at', { ascending: true }).limit(1),
    ])
    if (exp.error || !exp.data) return null
    const e = exp.data
    // profiles is returned as an array from Supabase join
    const profArr = e.profiles as unknown as { full_name: string }[] | null
    const payerName = profArr?.[0]?.full_name ?? null
    let receiptUrl: string | null = null
    if (att.data?.length) {
      receiptUrl = sb.storage.from('receipts').getPublicUrl(att.data[0].storage_path).data.publicUrl
    }
    return {
      id: e.id, description: e.description, amount: e.amount,
      currency: e.currency, category: e.category, expense_date: e.expense_date,
      payer_name: payerName, receipt_url: receiptUrl,
    }
  } catch { return null }
}

/* ── Shared layout pieces ── */

function BrandHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', width: 28, height: 28, borderRadius: 8, background: BRAND_TEAL }} />
      <span style={{ fontSize: 22, fontWeight: 700, color: BRAND_TEAL, letterSpacing: -0.5 }}>
        FairPay
      </span>
    </div>
  )
}

function CategoryBadge({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      display: 'flex', fontSize: 14, fontWeight: 600,
      color, background: `${color}15`, border: `1.5px solid ${color}30`,
      padding: '5px 14px', borderRadius: 20,
    }}>
      {label}
    </div>
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

/** Build font options for ImageResponse — fetches Inter with only the glyphs needed */
async function buildFonts(text: string) {
  const fontData = await loadGoogleFont('Inter', text)
  return [
    { name: 'Inter', data: fontData, style: 'normal' as const, weight: 400 as const },
    { name: 'Inter', data: fontData, style: 'normal' as const, weight: 700 as const },
  ]
}

export default async function handler(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')

    if (!id) {
      const fonts = await buildFonts('FairPay')
      return new ImageResponse(
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter' }}>
          <BrandHeader />
        </div>,
        { width: 1200, height: 630, fonts },
      )
    }

    const expense = await fetchExpense(id)
    if (!expense) {
      const fonts = await buildFonts('FairPay Expense not found')
      return new ImageResponse(
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: 16, fontFamily: 'Inter' }}>
          <BrandHeader />
          <span style={{ fontSize: 18, color: '#94a3b8' }}>Expense not found</span>
        </div>,
        { width: 1200, height: 630, fonts },
      )
    }

    const cat = CATEGORY_META[expense.category ?? 'other'] ?? CATEGORY_META.other
    const amount = fmt(expense.amount, expense.currency)
    const date = fmtDate(expense.expense_date)
    const desc = expense.description.length > 70
      ? expense.description.slice(0, 67) + '...'
      : expense.description

    // Collect all text that will be rendered so the font includes every glyph
    const allText = [
      'FairPay', cat.label, desc, amount, date,
      expense.payer_name ? `paid by ${expense.payer_name}` : '',
      'Expense not found',
    ].join(' ')
    const fonts = await buildFonts(allText)

    // ── With receipt: receipt left + card right ──
    if (expense.receipt_url) {
      return new ImageResponse(
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
          }}>
            <div style={{ display: 'flex', marginBottom: 24 }}><BrandHeader /></div>
            <div style={{ display: 'flex', marginBottom: 16 }}>
              <CategoryBadge label={cat.label} color={cat.color} />
            </div>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: '#0f172a', marginBottom: 20, lineHeight: 1.3 }}>
              {desc}
            </div>
            <div style={{ display: 'flex', fontSize: 52, fontWeight: 800, color: BRAND_TEAL, marginBottom: 24, letterSpacing: -2 }}>
              {amount}
            </div>
            <MetaLine date={date} payer={expense.payer_name} />
          </div>
        </div>,
        { width: 1200, height: 630, fonts, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
      )
    }

    // ── No receipt: receipt-style card centered ──
    return new ImageResponse(
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
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <BrandHeader />
            <CategoryBadge label={cat.label} color={cat.color} />
          </div>
          <div style={{ display: 'flex', width: '100%', height: 1, borderBottom: '2px dashed #e2e8f0', marginBottom: 32 }} />
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: '#0f172a', marginBottom: 20, lineHeight: 1.3 }}>
            {desc}
          </div>
          <div style={{ display: 'flex', fontSize: 60, fontWeight: 800, color: BRAND_TEAL, marginBottom: 28, letterSpacing: -2 }}>
            {amount}
          </div>
          <div style={{ display: 'flex', width: '100%', height: 1, borderBottom: '2px dashed #e2e8f0', marginBottom: 24 }} />
          <MetaLine date={date} payer={expense.payer_name} />
        </div>
      </div>,
      { width: 1200, height: 630, fonts, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
    )
  } catch (err) {
    console.error('OG error:', err)
    const fallbackFonts = await buildFonts('FairPay').catch(() => undefined)
    return new ImageResponse(
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter' }}>
        <BrandHeader />
      </div>,
      { width: 1200, height: 630, ...(fallbackFonts ? { fonts: fallbackFonts } : {}) },
    )
  }
}
