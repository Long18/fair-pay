import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts'

/**
 * Lifecycle Emails Edge Function
 *
 * Called daily (via pg_cron or manually). Sends lifecycle emails to users based
 * on days since signup and their activity in user_tracking_events.
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

interface UserRow {
  id: string
  full_name: string | null
  email: string
  created_at: string
  email_notifications: boolean | null
}

interface DebtRow {
  creditor_id: string
  debtor_id: string
  amount: number
  currency: string
}

type LifecycleStage =
  | 'day1_welcome'
  | 'day3_no_expense'
  | 'day7_no_group'
  | 'day14_debt_summary'
  | 'day30_winback'

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

function buildEmailWrapper(title: string, previewText: string, bodyHtml: string, ctaHref: string, ctaLabel: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${escapeHtml(previewText)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:26px;font-weight:700;color:#fff;letter-spacing:-0.5px;">FairPay</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;">Chia sẻ chi phí thông minh &bull; Smart expense splitting</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
              <div style="text-align:center;margin-top:32px;">
                <a href="${escapeHtml(ctaHref)}"
                   style="display:inline-block;background:#6366f1;color:#fff;padding:13px 36px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
                  ${escapeHtml(ctaLabel)}
                </a>
              </div>
              <p style="margin:28px 0 0;font-size:11px;color:#aaa;text-align:center;border-top:1px solid #f0f0f0;padding-top:20px;line-height:1.8;">
                Để tắt email, vào <strong>Cài đặt &rarr; Thông báo</strong>.<br>
                To unsubscribe, go to <strong>Settings &rarr; Notifications</strong>.<br>
                &copy; 2026 FairPay
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildWelcomeEmail(userName: string, appUrl: string): { subject: string; text: string; html: string } {
  const subject = '[FairPay] Chào mừng bạn đến với FairPay! / Welcome to FairPay!'
  const safeName = escapeHtml(userName)
  const ctaHref = joinAppUrl(appUrl, '/dashboard')
  const text = `Xin chào ${userName},\n\nChào mừng bạn đến với FairPay!\n\nFairPay giúp bạn chia tiền nhóm, theo dõi ai nợ ai, và settle up minh bạch.\n\nBắt đầu bằng cách thêm chi phí đầu tiên của bạn.\n\nMở FairPay: ${ctaHref}\n\nFairPay Team`
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">Xin chào / Hello, <strong>${safeName}</strong>!</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">Chào mừng bạn đến với <strong>FairPay</strong> — ứng dụng chia tiền nhóm thông minh giúp bạn theo dõi chi phí chung và settle up rõ ràng.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #eef2ff;border-radius:12px;background:#f8fafc;">
      <tr>
        <td style="padding:16px 20px;font-size:14px;line-height:1.8;color:#374151;">
          <strong>Bạn có thể làm gì với FairPay:</strong><br>
          ✓ Ghi lại chi phí chung với bạn bè<br>
          ✓ Biết chính xác ai đang nợ ai<br>
          ✓ Nhắc bạn bè thanh toán qua email
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;color:#6b7280;">Hãy bắt đầu bằng cách thêm chi phí đầu tiên của bạn!</p>`
  return {
    subject,
    text,
    html: buildEmailWrapper(
      'Chào mừng đến FairPay',
      'Bắt đầu chia tiền nhóm thông minh với FairPay!',
      bodyHtml,
      ctaHref,
      'Bắt đầu ngay / Get Started'
    ),
  }
}

function buildNoExpenseNudge(userName: string, appUrl: string): { subject: string; text: string; html: string } {
  const subject = '[FairPay] Thêm chi phí đầu tiên của bạn / Add your first expense'
  const safeName = escapeHtml(userName)
  const ctaHref = joinAppUrl(appUrl, '/expenses/create')
  const text = `Xin chào ${userName},\n\nBạn đã đăng ký FairPay nhưng chưa thêm chi phí nào.\n\nHãy thử ghi lại một chi phí gần đây với bạn bè để bắt đầu!\n\nThêm chi phí: ${ctaHref}\n\nFairPay Team`
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">Xin chào / Hello, <strong>${safeName}</strong>!</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">Bạn đã đăng ký FairPay nhưng chưa thêm chi phí nào cả. Hãy thử ghi lại một chi phí gần đây — chỉ mất vài giây!</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #fef3c7;border-radius:12px;background:#fffbeb;">
      <tr>
        <td style="padding:16px 20px;font-size:14px;line-height:1.8;color:#92400e;">
          <strong>💡 Gợi ý:</strong><br>
          Ghi lại bữa ăn chung, tiền điện nước, hoặc bất kỳ chi phí nào bạn chia sẻ với bạn bè.
        </td>
      </tr>
    </table>`
  return {
    subject,
    text,
    html: buildEmailWrapper(
      'Thêm chi phí đầu tiên',
      'Hãy ghi lại chi phí đầu tiên của bạn trên FairPay!',
      bodyHtml,
      ctaHref,
      'Thêm chi phí / Add Expense'
    ),
  }
}

function buildNoGroupNudge(userName: string, appUrl: string): { subject: string; text: string; html: string } {
  const subject = '[FairPay] Tạo nhóm với bạn bè / Create a group with friends'
  const safeName = escapeHtml(userName)
  const ctaHref = joinAppUrl(appUrl, '/groups/create')
  const text = `Xin chào ${userName},\n\nBạn đã sử dụng FairPay được một tuần. Hãy thử tạo một nhóm với bạn bè để quản lý chi phí chung tốt hơn!\n\nTạo nhóm: ${ctaHref}\n\nFairPay Team`
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">Xin chào / Hello, <strong>${safeName}</strong>!</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">Bạn đã dùng FairPay được một tuần rồi! Hãy tạo một nhóm để quản lý chi phí chung với bạn bè, gia đình hoặc đồng nghiệp.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #d1fae5;border-radius:12px;background:#f0fdf4;">
      <tr>
        <td style="padding:16px 20px;font-size:14px;line-height:1.8;color:#065f46;">
          <strong>👥 Nhóm giúp bạn:</strong><br>
          ✓ Theo dõi chi phí chung trong các chuyến đi, bữa ăn<br>
          ✓ Thấy tổng kết ai nợ ai trong nhóm<br>
          ✓ Settle up nhanh chóng khi kết thúc
        </td>
      </tr>
    </table>`
  return {
    subject,
    text,
    html: buildEmailWrapper(
      'Tạo nhóm với bạn bè',
      'Quản lý chi phí chung dễ dàng hơn với tính năng nhóm!',
      bodyHtml,
      ctaHref,
      'Tạo nhóm / Create Group'
    ),
  }
}

function buildWeeklySummary(userName: string, debts: DebtRow[], appUrl: string): { subject: string; text: string; html: string } {
  const subject = '[FairPay] Tóm tắt công nợ tuần này / Your weekly debt summary'
  const safeName = escapeHtml(userName)
  const ctaHref = joinAppUrl(appUrl, '/balances')
  const totalOwed = debts.reduce((sum, d) => sum + d.amount, 0)
  const text = `Xin chào ${userName},\n\nTóm tắt công nợ của bạn tuần này:\nTổng cần trả: ${totalOwed.toLocaleString('vi-VN')} VND\n\nXem chi tiết: ${ctaHref}\n\nFairPay Team`
  const debtRows = debts.slice(0, 5).map(d =>
    `<tr><td style="padding:8px 0;border-top:1px solid #e2e8f0;font-size:13px;color:#374151;">${d.creditor_id}</td><td align="right" style="padding:8px 0;border-top:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#dc2626;">${d.amount.toLocaleString('vi-VN')} ${d.currency}</td></tr>`
  ).join('')
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">Xin chào / Hello, <strong>${safeName}</strong>!</p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">Đây là tóm tắt công nợ của bạn trong tuần này.</p>
    ${debts.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #dbeafe;border-radius:12px;background:#f8fafc;padding:0 16px;">
      <tr><td colspan="2" style="padding:14px 0 10px;font-size:12px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:0.08em;">Chi tiết công nợ / Debt details</td></tr>
      ${debtRows}
      <tr><td style="padding:12px 0 14px;font-size:14px;font-weight:700;color:#0f172a;border-top:2px solid #e2e8f0;">Tổng / Total</td><td align="right" style="padding:12px 0 14px;font-size:16px;font-weight:800;color:#dc2626;border-top:2px solid #e2e8f0;">${totalOwed.toLocaleString('vi-VN')} VND</td></tr>
    </table>` : `<p style="margin:16px 0;font-size:14px;color:#059669;font-weight:600;">Bạn không có công nợ nào! / You have no outstanding debts!</p>`}`
  return {
    subject,
    text,
    html: buildEmailWrapper(
      'Tóm tắt công nợ tuần này',
      'Xem tóm tắt công nợ của bạn trong tuần này.',
      bodyHtml,
      ctaHref,
      'Xem số dư / View Balances'
    ),
  }
}

function buildWinbackEmail(userName: string, appUrl: string): { subject: string; text: string; html: string } {
  const subject = '[FairPay] Chúng tôi nhớ bạn! / We miss you!'
  const safeName = escapeHtml(userName)
  const ctaHref = joinAppUrl(appUrl, '/dashboard')
  const text = `Xin chào ${userName},\n\nBạn chưa dùng FairPay trong 2 tuần qua. Quay lại xem bạn bè của bạn có cần bạn thanh toán gì không nhé!\n\nMở FairPay: ${ctaHref}\n\nFairPay Team`
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">Xin chào / Hello, <strong>${safeName}</strong>!</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">Bạn chưa mở FairPay trong 2 tuần qua. Bạn bè của bạn có thể đang chờ bạn settle up!</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #fecaca;border-radius:12px;background:#fef2f2;">
      <tr>
        <td style="padding:16px 20px;font-size:14px;line-height:1.8;color:#991b1b;">
          <strong>💸 Đừng để nợ tồn đọng:</strong><br>
          Quay lại FairPay để kiểm tra xem bạn còn nợ ai không, và thanh toán ngay hôm nay.
        </td>
      </tr>
    </table>`
  return {
    subject,
    text,
    html: buildEmailWrapper(
      'Chúng tôi nhớ bạn!',
      'Quay lại FairPay — bạn bè đang chờ bạn settle up!',
      bodyHtml,
      ctaHref,
      'Quay lại FairPay / Come Back'
    ),
  }
}

function determineLifecycleStage(
  daysSinceSignup: number,
  hasExpense: boolean,
  hasGroup: boolean,
  daysSinceLastActivity: number | null,
): LifecycleStage | null {
  if (daysSinceSignup < 1) return null
  if (daysSinceSignup >= 1 && daysSinceSignup < 2) return 'day1_welcome'
  if (daysSinceSignup >= 3 && daysSinceSignup < 4 && !hasExpense) return 'day3_no_expense'
  if (daysSinceSignup >= 7 && daysSinceSignup < 8 && !hasGroup) return 'day7_no_group'
  if (daysSinceSignup >= 14 && daysSinceSignup < 15) return 'day14_debt_summary'
  if (daysSinceSignup >= 30 && daysSinceLastActivity !== null && daysSinceLastActivity >= 14) return 'day30_winback'
  return null
}

serve(async (req) => {
  const preflight = handleCorsPreflightIfNeeded(req)
  if (preflight) return preflight

  try {
    const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
    const supabaseKey     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const smtpHost        = Deno.env.get('SMTP_HOST')
    const smtpPort        = parseInt(Deno.env.get('SMTP_PORT') || '587')
    const smtpUser        = Deno.env.get('SMTP_USER')
    const smtpPass        = Deno.env.get('SMTP_PASS')
    const smtpFromName    = Deno.env.get('SMTP_FROM_NAME') || 'FairPay'
    const appUrl          = Deno.env.get('APP_URL') || 'https://long-pay.vercel.app'

    // Require service-role key for cron/manual calls
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

    // Fetch all users with their email settings
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .not('email', 'is', null)

    if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`)
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), { headers: getCorsHeaders() })
    }

    // Fetch email_notifications settings (user_settings table)
    const userIds = users.map((u: { id: string }) => u.id)
    const { data: settings } = await supabase
      .from('user_settings')
      .select('user_id, email_notifications')
      .in('user_id', userIds)

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

    const now = new Date()
    let sent = 0
    let skipped = 0
    const errors: string[] = []

    for (const user of users as UserRow[]) {
      // Skip users with email notifications disabled
      if (settingsMap.get(user.id) === false) {
        skipped++
        continue
      }

      const signupDate = new Date(user.created_at)
      const daysSinceSignup = Math.floor((now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24))

      // Check if user has created an expense
      const { count: expenseCount } = await supabase
        .from('user_tracking_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('event_name', 'expense_created')

      const hasExpense = (expenseCount || 0) > 0

      // Check if user has created a group
      const { count: groupCount } = await supabase
        .from('user_tracking_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('event_name', 'group_created')

      const hasGroup = (groupCount || 0) > 0

      // Check last activity date for win-back
      let daysSinceLastActivity: number | null = null
      if (daysSinceSignup >= 30) {
        const { data: lastEvent } = await supabase
          .from('user_tracking_events')
          .select('occurred_at')
          .eq('user_id', user.id)
          .order('occurred_at', { ascending: false })
          .limit(1)
          .single()

        if (lastEvent) {
          const lastDate = new Date(lastEvent.occurred_at)
          daysSinceLastActivity = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        }
      }

      const stage = determineLifecycleStage(daysSinceSignup, hasExpense, hasGroup, daysSinceLastActivity)
      if (!stage) {
        skipped++
        continue
      }

      const userName = user.full_name || 'there'

      try {
        let emailParts: { subject: string; text: string; html: string }

        if (stage === 'day1_welcome') {
          emailParts = buildWelcomeEmail(userName, appUrl)
        } else if (stage === 'day3_no_expense') {
          emailParts = buildNoExpenseNudge(userName, appUrl)
        } else if (stage === 'day7_no_group') {
          emailParts = buildNoGroupNudge(userName, appUrl)
        } else if (stage === 'day14_debt_summary') {
          // Fetch user's current debts
          const { data: balances } = await supabase
            .rpc('get_user_balances', { p_user_id: user.id })
          const debts: DebtRow[] = (balances || [])
            .filter((b: { net_balance: number }) => b.net_balance < 0)
            .map((b: { counterparty_id: string; net_balance: number; currency: string }) => ({
              creditor_id: b.counterparty_id,
              debtor_id: user.id,
              amount: Math.abs(b.net_balance),
              currency: b.currency || 'VND',
            }))
          emailParts = buildWeeklySummary(userName, debts, appUrl)
        } else {
          emailParts = buildWinbackEmail(userName, appUrl)
        }

        await sendHtmlEmail(smtp, {
          fromName: smtpFromName,
          fromEmail: smtpUser,
          to: user.email,
          subject: emailParts.subject,
          text: emailParts.text,
          html: emailParts.html,
          tag: `lifecycle-${stage}`,
        })

        sent++
        console.log(`✓ lifecycle-${stage} -> ${user.email}`)
      } catch (err) {
        const msg = `Failed for ${user.email} (${stage}): ${(err as Error).message}`
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
