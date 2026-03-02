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

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🍔',
  transport: '🚗',
  entertainment: '🎬',
  shopping: '🛍️',
  utilities: '💡',
  rent: '🏠',
  health: '💊',
  education: '📚',
  travel: '✈️',
  groceries: '🛒',
  other: '📋',
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

    // Fetch expense + payer name + first image attachment in parallel
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


export default async function handler(req: Request) {
  try {
    const url = new URL(req.url)
    const expenseId = url.searchParams.get('id')

    if (!expenseId) {
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: 'white',
              fontSize: 48,
              fontWeight: 700,
            }}
          >
            FairPay — Split Expenses Fairly
          </div>
        ),
        { width: 1200, height: 630 },
      )
    }

    const expense = await fetchExpenseData(expenseId)

    if (!expense) {
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: 'white',
              fontSize: 40,
              fontWeight: 600,
            }}
          >
            FairPay — Expense Not Found
          </div>
        ),
        { width: 1200, height: 630 },
      )
    }

    const emoji = CATEGORY_EMOJI[expense.category ?? 'other'] ?? '📋'
    const formattedAmount = formatCurrency(expense.amount, expense.currency)
    const formattedDate = formatDate(expense.expense_date)

    // If receipt image exists, show it as the main visual
    if (expense.receipt_url) {
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            }}
          >
            {/* Left: Receipt image */}
            <div
              style={{
                width: '50%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
              }}
            >
              <img
                src={expense.receipt_url}
                alt="Receipt"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: 12,
                }}
              />
            </div>
            {/* Right: Expense info */}
            <div
              style={{
                width: '50%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '40px 40px 40px 20px',
                color: 'white',
              }}
            >
              <div style={{ fontSize: 20, opacity: 0.7, marginBottom: 8, display: 'flex' }}>
                FairPay
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 16, display: 'flex' }}>
                {emoji} {expense.description}
              </div>
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 800,
                  color: '#60a5fa',
                  marginBottom: 20,
                  display: 'flex',
                }}
              >
                {formattedAmount}
              </div>
              <div style={{ fontSize: 18, opacity: 0.8, marginBottom: 8, display: 'flex' }}>
                📅 {formattedDate}
              </div>
              {expense.payer_name ? (
                <div style={{ fontSize: 18, opacity: 0.8, display: 'flex' }}>
                  💳 Paid by {expense.payer_name}
                </div>
              ) : null}
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
          headers: {
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          },
        },
      )
    }

    // No receipt: generate a styled card
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: 'white',
            padding: 60,
          }}
        >
          <div style={{ fontSize: 20, opacity: 0.6, marginBottom: 16, display: 'flex' }}>
            FairPay — Expense Detail
          </div>
          <div style={{ fontSize: 72, marginBottom: 20, display: 'flex' }}>{emoji}</div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              marginBottom: 24,
              textAlign: 'center',
              display: 'flex',
              maxWidth: 900,
            }}
          >
            {expense.description}
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: '#60a5fa',
              marginBottom: 28,
              display: 'flex',
            }}
          >
            {formattedAmount}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 32,
              fontSize: 20,
              opacity: 0.8,
            }}
          >
            <span style={{ display: 'flex' }}>📅 {formattedDate}</span>
            {expense.payer_name ? (
              <span style={{ display: 'flex' }}>💳 Paid by {expense.payer_name}</span>
            ) : null}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      },
    )
  } catch (err) {
    console.error('OG image generation error:', err)
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: 'white',
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          FairPay — Split Expenses Fairly
        </div>
      ),
      { width: 1200, height: 630 },
    )
  }
}
