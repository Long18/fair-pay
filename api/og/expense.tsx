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

// FairPay brand teal (matches oklch primary)
const BRAND_TEAL = '#0d9488'

function fmt(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency || 'VND',
      maximumFractionDigits: 0,
    }).format(amount)
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
    const prof = e.profiles as { full_name: string } | null
    let receiptUrl: string | null = null
    if (att.data?.length) {
      receiptUrl = sb.storage.from('receipts').getPublicUrl(att.data[0].storage_path).data.publicUrl
    }
    return {
      id: e.id, description: e.description, amount: e.amount,
      currency: e.currency, category: e.category, expense_date: e.expense_date,
      payer_name: prof?.full_name ?? null, receipt_url: receiptUrl,
      paid_by_user_id: '',
    }
  } catch { return null }
}

/* ── Shared layout pieces ── */

function BrandHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Teal dot as mini logo */}
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
          <span style={{ color: '#475569', marginRight: 8 }}>·</span>
          Paid by {payer}
        </span>
      ) : null}
    </div>
  )
}

export default async function handler(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')

    if (!id) {
      return new ImageResponse(
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
          <BrandHeader />
        </div>,
        { width: 1200, height: 630 },
      )
    }

    const expense = await fetchExpense(id)
    if (!expense) {
      return new ImageResponse(
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: 16 }}>
          <BrandHeader />
          <span style={{ fontSize: 18, color: '#94a3b8' }}>Expense not found</span>
        </div>,
        { width: 1200, height: 630 },
      )
    }

    const cat = CATEGORY_META[expense.category ?? 'other'] ?? CATEGORY_META.other
    const amount = fmt(expense.amount, expense.currency)
    const date = fmtDate(expense.expense_date)
    const desc = expense.description.length > 70
      ? expense.description.slice(0, 67) + '...'
      : expense.description

    // ── With receipt: receipt left + card right ──
    if (expense.receipt_url) {
      return new ImageResponse(
        <div style={{
          width: '100%', height: '100%', display: 'flex',
          background: '#f8fafc', padding: 40, gap: 40,
        }}>
          {/* Receipt image */}
          <div style={{
            width: 440, height: 550, display: 'flex',
            borderRadius: 16, overflow: 'hidden',
            border: '1px solid #e2e8f0', background: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}>
            <img src={expense.receipt_url} width={440} height={550}
              style={{ objectFit: 'cover' }} />
          </div>
          {/* Info card */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            justifyContent: 'center', gap: 0,
          }}>
            <div style={{ display: 'flex', marginBottom: 24 }}>
              <BrandHeader />
            </div>
            <div style={{ display: 'flex', marginBottom: 16 }}>
              <CategoryBadge label={cat.label} color={cat.color} />
            </div>
            <div style={{
              display: 'flex', fontSize: 30, fontWeight: 700,
              color: '#0f172a', marginBottom: 20, lineHeight: 1.3,
            }}>
              {desc}
            </div>
            <div style={{
              display: 'flex', fontSize: 52, fontWeight: 800,
              color: BRAND_TEAL, marginBottom: 24, letterSpacing: -2,
            }}>
              {amount}
            </div>
            <MetaLine date={date} payer={expense.payer_name} />
          </div>
        </div>,
        { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
      )
    }

    // ── No receipt: receipt-style card centered ──
    return new ImageResponse(
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#f8fafc', padding: 40,
      }}>
        {/* Receipt card */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          width: 680, background: 'white',
          borderRadius: 20, padding: '48px 52px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          {/* Top: brand + category */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <BrandHeader />
            <CategoryBadge label={cat.label} color={cat.color} />
          </div>
          {/* Dashed separator */}
          <div style={{
            display: 'flex', width: '100%', height: 1,
            borderBottom: '2px dashed #e2e8f0', marginBottom: 32,
          }} />
          {/* Description */}
          <div style={{
            display: 'flex', fontSize: 32, fontWeight: 700,
            color: '#0f172a', marginBottom: 20, lineHeight: 1.3,
          }}>
            {desc}
          </div>
          {/* Amount */}
          <div style={{
            display: 'flex', fontSize: 60, fontWeight: 800,
            color: BRAND_TEAL, marginBottom: 28, letterSpacing: -2,
          }}>
            {amount}
          </div>
          {/* Dashed separator */}
          <div style={{
            display: 'flex', width: '100%', height: 1,
            borderBottom: '2px dashed #e2e8f0', marginBottom: 24,
          }} />
          {/* Meta */}
          <MetaLine date={date} payer={expense.payer_name} />
        </div>
      </div>,
      { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
    )
  } catch (err) {
    console.error('OG error:', err)
    return new ImageResponse(
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <BrandHeader />
      </div>,
      { width: 1200, height: 630 },
    )
  }
}
