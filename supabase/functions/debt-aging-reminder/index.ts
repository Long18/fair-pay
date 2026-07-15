import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts'
import { buildEmailPanel, buildEmailShell } from '../_shared/email-design-system.ts'

/**
 * Debt Aging Reminder Edge Function
 *
 * Called daily. Queries unsettled expense splits older than 7 days and sends
 * reminder emails to debtors.
 *
 * Required secrets:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME, APP_URL
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const textEncoder = new TextEncoder()

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function encodeBase64Mime(content: string): string {
  const bytes = textEncoder.encode(content)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/.{1,76}/g, '$&\r\n').trim()
}

function joinAppUrl(appUrl: string, link: string): string {
  return `${appUrl.replace(/\/$/, '')}/${link.replace(/^\//, '')}`
}

const currencyFormatterCache = new Map<string, Intl.NumberFormat>()
function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  let formatter = currencyFormatterCache.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    })
    currencyFormatterCache.set(currency, formatter)
  }
  return formatter
}

function formatCurrency(value: number, currency = 'VND'): string {
  return getCurrencyFormatter(currency).format(Math.abs(value))
}

interface AgingDebtRow {
  debtor_id: string
  debtor_email: string
  debtor_name: string
  creditor_name: string
  amount: number
  currency: string
  expense_description: string
  expense_date: string
  days_old: number
}

async function sendHtmlEmail(
  smtp: SMTPClient,
  options: {
    fromName: string
    fromEmail: string
    to: string
    subject: string
    text: string
    html: string
    tag: string
  }
): Promise<void> {
  await smtp.send({
    from: `${options.fromName} <${options.fromEmail}>`,
    to: options.to,
    subject: options.subject,
    mimeContent: [
      {
        mimeType: 'text/plain; charset="utf-8"',
        content: encodeBase64Mime(options.text),
        transferEncoding: 'base64',
      },
      {
        mimeType: 'text/html; charset="utf-8"',
        content: encodeBase64Mime(options.html),
        transferEncoding: 'base64',
      },
    ],
    headers: {
      'X-FairPay-Email-Type': options.tag,
    },
  })
}

interface DebtEntry {
  creditor_name: string
  amount: number
  currency: string
  description: string
  days_old: number
}

function buildAgingReminderEmail(
  userName: string,
  debts: DebtEntry[],
  appUrl: string
): { subject: string; text: string; html: string } {
  const subject = '[FairPay] Bạn có khoản nợ quá 7 ngày / You have debts older than 7 days'
  const ctaHref = joinAppUrl(appUrl, '/balances')
  const safeName = escapeHtml(userName)

  const debtLines = debts.map(
    d => `- Nợ ${d.creditor_name}: ${formatCurrency(d.amount, d.currency)} (${d.description}, ${d.days_old} ngày)`
  ).join('\n')

  const text = [
    `Xin chào ${userName},`,
    '',
    `Bạn có ${debts.length} khoản nợ chưa thanh toán quá 7 ngày:`,
    '',
    debtLines,
    '',
    `Xem và thanh toán tại: ${ctaHref}`,
    '',
    'FairPay Team',
  ].join('\n')

  const debtRows = debts.map(d => `
    <tr>
      <td style="padding:10px 0;border-top:1px solid #e2e8f0;">
        <div style="font-size:14px;font-weight:600;color:#0f172a;">${escapeHtml(d.description)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;">Nợ ${escapeHtml(d.creditor_name)} &bull; ${d.days_old} ngày / days overdue</div>
      </td>
      <td align="right" style="padding:10px 0;border-top:1px solid #e2e8f0;white-space:nowrap;">
        <div style="font-size:15px;font-weight:800;color:#dc2626;">${escapeHtml(formatCurrency(d.amount, d.currency))}</div>
      </td>
    </tr>`).join('')

  const bodyHtml = `
    <p style="margin:0 0 6px;font-size:16px;line-height:1.7;color:#0f172a;">Xin chào / Hello, <strong>${safeName}</strong></p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#64748b;">Bạn có <strong>${debts.length} khoản nợ</strong> chưa thanh toán quá <strong>7 ngày</strong>.</p>
    ${buildEmailPanel({
      label: 'Chi tiết / Details',
      title: `${debts.length} khoản cần xử lý`,
      description: 'Các khoản dưới đây đã quá hạn hơn 7 ngày. Mở FairPay để xem và settle up.',
      tone: 'reminder',
      marker: 'aging-debt-summary',
      bodyHtml: `<table data-email-block="aging-debt-list" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;padding:0 14px;">
        ${debtRows}
      </table>`,
    })}`

  const html = buildEmailShell({
    title: 'Nhắc nhở công nợ / Debt Reminder',
    previewText: 'Bạn có khoản nợ quá 7 ngày cần xử lý trên FairPay.',
    eyebrow: 'FairPay Reminder',
    heading: 'Nhắc công nợ quá hạn',
    subheading: 'Kiểm tra các khoản đã quá 7 ngày và thanh toán khi có thể.',
    bodyHtml,
    ctaHref,
    ctaLabel: 'Thanh toán ngay / Pay Now',
    tone: 'reminder',
    footerHtml: `
      <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.8;">
        Để tắt email, vào <strong>Cài đặt &rarr; Thông báo</strong>.<br>
        To unsubscribe, go to <strong>Settings &rarr; Notifications</strong>.<br>
        &copy; 2026 FairPay
      </p>`,
  })

  return { subject, text, html }
}

serve(async (req) => {
  const preflight = handleCorsPreflightIfNeeded(req)
  if (preflight) return preflight

  try {
    const supabaseUrl   = Deno.env.get('SUPABASE_URL')!
    const supabaseKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const smtpHost      = Deno.env.get('SMTP_HOST')
    const smtpPort      = parseInt(Deno.env.get('SMTP_PORT') || '587')
    const smtpUser      = Deno.env.get('SMTP_USER')
    const smtpPass      = Deno.env.get('SMTP_PASS')
    const smtpFromName  = Deno.env.get('SMTP_FROM_NAME') || 'FairPay'
    const appUrl        = Deno.env.get('APP_URL') || 'https://long-pay.vercel.app'

    // Require service-role key
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (token !== supabaseKey) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: getCorsHeaders(),
      })
    }

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error('SMTP configuration missing.')
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Query unsettled expense_splits older than 7 days, joining with profiles for names/emails
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: agingDebts, error: debtsError } = await supabase
      .from('expense_splits')
      .select(`
        id,
        user_id,
        amount,
        expenses!inner(
          id,
          description,
          expense_date,
          paid_by_user_id,
          currency
        )
      `)
      .eq('is_settled', false)
      .lt('created_at', sevenDaysAgo)
      .limit(500)

    if (debtsError) throw new Error(`Failed to fetch aging debts: ${debtsError.message}`)
    if (!agingDebts || agingDebts.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No aging debts found' }), {
        headers: getCorsHeaders(),
      })
    }

    // Group by debtor user_id
    const byDebtor = new Map<string, AgingDebtRow[]>()
    const now = new Date()

    for (const split of agingDebts as Array<{
      id: string
      user_id: string
      amount: number
      expenses: {
        id: string
        description: string
        expense_date: string | null
        paid_by_user_id: string
        currency: string | null
      }
    }>) {
      const expense = split.expenses
      // Skip if the debtor IS the payer (paid_by owes no one)
      if (split.user_id === expense.paid_by_user_id) continue

      const daysOld = Math.floor((now.getTime() - new Date(expense.expense_date || now).getTime()) / (1000 * 60 * 60 * 24))

      if (!byDebtor.has(split.user_id)) byDebtor.set(split.user_id, [])
      byDebtor.get(split.user_id)!.push({
        debtor_id: split.user_id,
        debtor_email: '',
        debtor_name: '',
        creditor_name: expense.paid_by_user_id, // resolved below
        amount: split.amount,
        currency: expense.currency || 'VND',
        expense_description: expense.description || 'Chi phí',
        expense_date: expense.expense_date || '',
        days_old: daysOld,
      })
    }

    if (byDebtor.size === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No actionable aging debts' }), {
        headers: getCorsHeaders(),
      })
    }

    // Fetch profile info for all involved users
    const allUserIds = Array.from(byDebtor.keys())
    const creditorIds = Array.from(byDebtor.values())
      .flat()
      .map(d => d.creditor_name) // creditor_name holds paid_by_user_id at this point
    const uniqueIds = Array.from(new Set([...allUserIds, ...creditorIds]))

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', uniqueIds)

    const profileMap = new Map<string, { full_name: string; email: string }>()
    for (const p of (profiles || [])) {
      profileMap.set(p.id, { full_name: p.full_name || 'Unknown', email: p.email || '' })
    }

    // Fetch email notification settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('user_id, email_notifications')
      .in('user_id', allUserIds)

    const settingsMap = new Map<string, boolean>()
    for (const s of (settings || [])) {
      settingsMap.set(s.user_id, s.email_notifications !== false)
    }

    const smtp = new SMTPClient({
      debug: { encodeLB: true },
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpPort === 465,
        auth: { username: smtpUser, password: smtpPass },
      },
    })

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    for (const [debtorId, debts] of byDebtor) {
      if (settingsMap.get(debtorId) === false) {
        skipped++
        continue
      }

      const debtorProfile = profileMap.get(debtorId)
      if (!debtorProfile?.email) {
        skipped++
        continue
      }

      const debtEntries: DebtEntry[] = debts.map(d => ({
        creditor_name: profileMap.get(d.creditor_name)?.full_name || 'Someone',
        amount: d.amount,
        currency: d.currency,
        description: d.expense_description,
        days_old: d.days_old,
      }))

      const emailParts = buildAgingReminderEmail(
        debtorProfile.full_name || 'there',
        debtEntries,
        appUrl
      )

      try {
        await sendHtmlEmail(smtp, {
          fromName: smtpFromName,
          fromEmail: smtpUser,
          to: debtorProfile.email,
          subject: emailParts.subject,
          text: emailParts.text,
          html: emailParts.html,
          tag: 'debt-aging-reminder',
        })
        sent++
        console.log(`✓ debt-aging-reminder -> ${debtorProfile.email}`)
      } catch (err) {
        const msg = `Send failed for ${debtorProfile.email}: ${(err as Error).message}`
        console.error(msg)
        errors.push(msg)
      }
    }

    await smtp.close()

    return new Response(
      JSON.stringify({ success: true, sent, skipped, errors }),
      { headers: getCorsHeaders() }
    )

  } catch (error) {
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: getCorsHeaders() }
    )
  }
})
