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
  paid_by_user_id: string
  payer_name: string | null
  receipt_url: string | null
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
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
  other: { label: 'Other', color: '#64748b' },
}

function formatCurrency(amount: number, currency: string): string {
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

function formatDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(year, month - 1, day))
  } catch {
    return dateStr
  }
}

async function fetchExpenseData(expenseId: string): Promise<ExpenseData | null> {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const [expenseResult, attachmentResult] = await Promise.all([
      supabase
        .from('expenses')
        .select(`
          id, description, amount, currency, category, expense_date, paid_by_user_id,
          profiles!expenses_paid_by_user_id_fkey ( full_name )
        `)
        .eq('id', expenseId)
        .single(),
      supabase
        .from('attachments')
        .select('storage_path, mime_type')
        .eq('expense_id', expenseId)
        .like('mime_type', 'image/%')
        .order('created_at', { ascending: true })
        .limit(1),
    ])

    if (expenseResult.error || !expenseResult.data) return null

    const expense = expenseResult.data
    const profiles = expense.profiles as { full_name: string } | null

    let receiptUrl: string | null = null
    if (attachmentResult.data && attachmentResult.data.length > 0) {
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(attachmentResult.data[0].storage_path)
      receiptUrl = urlData.publicUrl
    }

    return {
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      category: expense.category,
      expense_date: expense.expense_date,
      paid_by_user_id: expense.paid_by_user_id,
      payer_name: profiles?.full_name ?? null,
      receipt_url: receiptUrl,
    }
  } catch (err) {
    console.error('Failed to fetch expense:', err)
    return null
  }
}

function FallbackImage({ text }: { text: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: 'white',
        fontSize: 44,
        fontWeight: 700,
        letterSpacing: -1,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', fontSize: 24, color: '#60a5fa', fontWeight: 600 }}>
          FairPay
        </div>
        <div style={{ display: 'flex' }}>{text}</div>
      </div>
    </div>
  )
}

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url)
    const expenseId = url.searchParams.get('id')

    if (!expenseId) {
      return new ImageResponse(<FallbackImage text="Split Expenses Fairly" />, {
        width: 1200,
        height: 630,
      })
    }

    const expense = await fetchExpenseData(expenseId)

    if (!expense) {
      return new ImageResponse(<FallbackImage text="Expense Not Found" />, {
        width: 1200,
        height: 630,
      })
    }

    const cat = CATEGORY_LABELS[expense.category ?? 'other'] ?? CATEGORY_LABELS.other
    const formattedAmount = formatCurrency(expense.amount, expense.currency)
    const formattedDate = formatDate(expense.expense_date)

    // With receipt: receipt left, info right
    if (expense.receipt_url) {
      return new ImageResponse(
        (
          <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0f172a' }}>
            {/* Receipt side */}
            <div
              style={{
                width: '45%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
                background: '#1e293b',
              }}
            >
              <img
                src={expense.receipt_url}
                width={480}
                height={560}
                style={{ objectFit: 'contain', borderRadius: 12 }}
              />
            </div>
            {/* Info side */}
            <div
              style={{
                width: '55%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '48px 48px 48px 36px',
                color: 'white',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ display: 'flex', fontSize: 22, color: '#60a5fa', fontWeight: 700 }}>
                  FairPay
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 13,
                    color: cat.color,
                    background: `${cat.color}20`,
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontWeight: 600,
                  }}
                >
                  {cat.label}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 30,
                  fontWeight: 700,
                  marginBottom: 24,
                  lineHeight: 1.3,
                  color: '#f1f5f9',
                }}
              >
                {expense.description.length > 60
                  ? expense.description.slice(0, 57) + '...'
                  : expense.description}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 56,
                  fontWeight: 800,
                  color: '#60a5fa',
                  marginBottom: 28,
                  letterSpacing: -2,
                }}
              >
                {formattedAmount}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: 18,
                  color: '#94a3b8',
                }}
              >
                <div style={{ display: 'flex' }}>{formattedDate}</div>
                {expense.payer_name ? (
                  <div style={{ display: 'flex' }}>Paid by {expense.payer_name}</div>
                ) : null}
              </div>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
          headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
        },
      )
    }

    // No receipt: styled card design
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            background: '#0f172a',
            padding: 0,
          }}
        >
          {/* Left accent bar */}
          <div style={{ width: 8, height: '100%', background: cat.color, display: 'flex' }} />
          {/* Content */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '60px 72px',
              color: 'white',
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
              <div style={{ display: 'flex', fontSize: 24, color: '#60a5fa', fontWeight: 700 }}>
                FairPay
              </div>
              <div
                style={{
                  display: 'flex',
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  background: '#475569',
                }}
              />
              <div style={{ display: 'flex', fontSize: 18, color: '#64748b' }}>Expense Detail</div>
            </div>
            {/* Category badge */}
            <div style={{ display: 'flex', marginBottom: 20 }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: 15,
                  color: cat.color,
                  background: `${cat.color}18`,
                  border: `1px solid ${cat.color}40`,
                  padding: '6px 16px',
                  borderRadius: 24,
                  fontWeight: 600,
                }}
              >
                {cat.label}
              </div>
            </div>
            {/* Description */}
            <div
              style={{
                display: 'flex',
                fontSize: 40,
                fontWeight: 700,
                marginBottom: 28,
                lineHeight: 1.25,
                color: '#f1f5f9',
                maxWidth: 900,
              }}
            >
              {expense.description.length > 80
                ? expense.description.slice(0, 77) + '...'
                : expense.description}
            </div>
            {/* Amount */}
            <div
              style={{
                display: 'flex',
                fontSize: 72,
                fontWeight: 800,
                color: '#60a5fa',
                marginBottom: 36,
                letterSpacing: -3,
              }}
            >
              {formattedAmount}
            </div>
            {/* Meta row */}
            <div
              style={{
                display: 'flex',
                gap: 32,
                fontSize: 20,
                color: '#94a3b8',
              }}
            >
              <div style={{ display: 'flex' }}>{formattedDate}</div>
              {expense.payer_name ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#475569' }}>|</span>
                  <span>Paid by {expense.payer_name}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
      },
    )
  } catch (err) {
    console.error('OG image generation error:', err)
    return new ImageResponse(<FallbackImage text="Split Expenses Fairly" />, {
      width: 1200,
      height: 630,
    })
  }
}
