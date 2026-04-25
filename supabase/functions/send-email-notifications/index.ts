import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const textEncoder = new TextEncoder()

function getCorsHeaders(): Record<string, string> {
  const origin = Deno.env.get('APP_URL')
  if (!origin) return { 'Content-Type': 'application/json' }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  }
}

// Bilingual labels for each notification type
const NOTIF_LABELS: Record<string, { vi: string; en: string }> = {
  expense_added:       { vi: 'Chi phí mới',               en: 'New expense' },
  expense_updated:     { vi: 'Chi phí đã cập nhật',        en: 'Expense updated' },
  expense_deleted:     { vi: 'Chi phí đã xóa',             en: 'Expense deleted' },
  payment_recorded:    { vi: 'Thanh toán mới',             en: 'Payment recorded' },
  friend_request:      { vi: 'Lời mời kết bạn',            en: 'Friend request' },
  friend_accepted:     { vi: 'Kết bạn thành công',         en: 'Friend accepted' },
  added_to_group:      { vi: 'Được thêm vào nhóm',         en: 'Added to group' },
  group_join_request:  { vi: 'Yêu cầu tham gia nhóm',      en: 'Join request' },
  group_join_approved: { vi: 'Yêu cầu được chấp thuận',    en: 'Join approved' },
  group_join_rejected: { vi: 'Yêu cầu bị từ chối',         en: 'Join rejected' },
  comment_mention:     { vi: 'Đề cập trong bình luận',     en: 'Mentioned in comment' },
  comment_reply:       { vi: 'Trả lời bình luận',           en: 'Comment reply' },
  comment_reaction:    { vi: 'Phản ứng bình luận',          en: 'Reaction' },
  expense_comment:     { vi: 'Bình luận chi phí',           en: 'Expense comment' },
  settlement_reminder:  { vi: 'Nhắc thanh toán',             en: 'Payment reminder' },
}

interface QueueRow {
  notification_id: string
  user_id: string
  user_email: string
  user_name: string
  notification_type: string
  title: string
  message: string
  link: string | null
  created_at: string
  email_context: unknown | null
}

interface DebtTransaction {
  expense_id: string
  description: string
  amount: number
  currency: string
  expense_date: string | null
}

interface DebtBreakdownItem {
  counterparty_key: string
  counterparty_name: string
  counterparty_email: string | null
  amount: number
  currency: string
  direction: 'user_owes_counterparty'
  transactions: DebtTransaction[]
}

interface ReminderEmailContext {
  total_amount: number
  debt_breakdown: DebtBreakdownItem[]
}

interface ProcessingResult {
  sent: number
  failed: number
  skipped: number
  errors: string[]
}

interface WorkerRequest {
  notification_ids?: string[]
  invite?: {
    emails: string[]
    inviter_name?: string
  }
}

interface EmailParts {
  subject: string
  text: string
  html: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeInviteEmails(value: unknown): string[] {
  const rawItems = Array.isArray(value)
    ? value.map((email) => String(email))
    : typeof value === 'string'
      ? value.split(/[\s,;]+/)
      : []

  const emails = rawItems
    .map((email) => email.trim().toLowerCase())
    .filter((email) => EMAIL_RE.test(email))

  return Array.from(new Set(emails))
}

async function readWorkerRequest(req: Request): Promise<WorkerRequest> {
  const raw = await req.text()
  if (!raw) return {}

  const parsed = JSON.parse(raw) as Record<string, unknown>
  const notificationIds = Array.isArray(parsed.notification_ids)
    ? parsed.notification_ids
        .map((id) => String(id))
        .filter((id) => UUID_RE.test(id))
    : undefined
  const invite = parsed.invite && typeof parsed.invite === 'object'
    ? parsed.invite as Record<string, unknown>
    : null
  const inviteEmails = invite ? normalizeInviteEmails(invite.emails) : []

  return {
    notification_ids: notificationIds?.length ? Array.from(new Set(notificationIds)) : undefined,
    invite: inviteEmails.length
      ? {
          emails: inviteEmails,
          inviter_name: invite?.inviter_name ? String(invite.inviter_name).trim() : undefined,
        }
      : undefined,
  }
}

async function authorizeWorkerRequest(
  req: Request,
  supabaseUrl: string,
  supabaseServiceKey: string,
  supabaseAnonKey: string | null
): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ success: false, error: 'Missing authorization' }), {
      status: 401,
      headers: getCorsHeaders(),
    })
  }

  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid authorization' }), {
      status: 401,
      headers: getCorsHeaders(),
    })
  }

  // Cron uses the service-role key. Browser/admin manual runs use a user JWT.
  if (token === supabaseServiceKey) {
    return null
  }

  if (!supabaseAnonKey) {
    return new Response(JSON.stringify({ success: false, error: 'SUPABASE_ANON_KEY is not configured' }), {
      status: 500,
      headers: getCorsHeaders(),
    })
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid or expired token' }), {
      status: 401,
      headers: getCorsHeaders(),
    })
  }

  const { data: isAdmin, error: adminError } = await userClient.rpc('is_admin')
  if (adminError || isAdmin !== true) {
    return new Response(JSON.stringify({ success: false, error: 'Only administrators can run email worker' }), {
      status: 403,
      headers: getCorsHeaders(),
    })
  }

  return null
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatCurrency(value: number, currency = 'VND'): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(value))
}

function formatDate(value: string | null): string {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function normalizeReminderEmailContext(value: unknown): ReminderEmailContext | null {
  if (!value || typeof value !== 'object') return null

  const raw = value as Record<string, unknown>
  const debtBreakdown = Array.isArray(raw.debt_breakdown)
    ? raw.debt_breakdown.map((item) => {
        const debt = item as Record<string, unknown>
        const currency = String(debt.currency || 'VND')
        const transactions = Array.isArray(debt.transactions)
          ? debt.transactions.map((transaction) => {
              const tx = transaction as Record<string, unknown>
              return {
                expense_id: String(tx.expense_id || ''),
                description: String(tx.description || 'Chi phí'),
                amount: Number(tx.amount || 0),
                currency: String(tx.currency || currency),
                expense_date: tx.expense_date ? String(tx.expense_date) : null,
              }
            }).filter((transaction) => transaction.expense_id && transaction.amount > 0)
          : []

        return {
          counterparty_key: String(debt.counterparty_key || ''),
          counterparty_name: String(debt.counterparty_name || 'Không rõ'),
          counterparty_email: debt.counterparty_email ? String(debt.counterparty_email) : null,
          amount: Number(debt.amount || 0),
          currency,
          direction: 'user_owes_counterparty' as const,
          transactions,
        }
      }).filter((item) => item.counterparty_key && item.amount > 0)
    : []

  if (!debtBreakdown.length) return null

  const totalAmount = Number(raw.total_amount || 0)
  return {
    total_amount: totalAmount > 0
      ? totalAmount
      : debtBreakdown.reduce((sum, item) => sum + item.amount, 0),
    debt_breakdown: debtBreakdown,
  }
}

function buildSubject(count: number, notifications: QueueRow[]): string {
  if (count === 1) {
    const n = notifications[0]
    const label = NOTIF_LABELS[n.notification_type]
    const typeEn = label?.en ?? 'Notification'
    return `[FairPay] ${typeEn}`
  }
  return `[FairPay] ${count} new notifications`
}

function buildEmailText(userName: string, notifications: QueueRow[], appUrl: string): string {
  const lines: string[] = [
    `Xin chào ${userName},`,
    '',
    `Bạn có ${notifications.length} thông báo mới trên FairPay.`,
    '',
  ]
  for (const n of notifications) {
    const label = NOTIF_LABELS[n.notification_type]
    const badge = label ? `${label.vi} / ${label.en}` : n.notification_type
    lines.push(`[${badge}] ${n.title}`)
    lines.push(n.message)
    const reminderContext = n.notification_type === 'settlement_reminder'
      ? normalizeReminderEmailContext(n.email_context)
      : null
    lines.push(...buildDebtTextLines(reminderContext))
    if (n.link) lines.push(`Xem chi tiết / View: ${joinAppUrl(appUrl, n.link)}`)
    lines.push('')
  }
  lines.push(`Mở FairPay / Open FairPay: ${appUrl}`)
  return lines.join('\n')
}

function encodeBase64Mime(content: string): string {
  const bytes = textEncoder.encode(content)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/.{1,76}/g, '$&\r\n').trim()
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

function joinAppUrl(appUrl: string, link: string): string {
  return `${appUrl.replace(/\/$/, '')}/${link.replace(/^\//, '')}`
}

function buildDebtTextLines(context: ReminderEmailContext | null): string[] {
  if (!context) return []

  const lines = [
    `Tổng cần trả / Total due: ${formatCurrency(context.total_amount)}`,
  ]

  for (const debt of context.debt_breakdown) {
    lines.push(`- Bạn cần trả ${debt.counterparty_name}: ${formatCurrency(debt.amount, debt.currency)}`)
    for (const transaction of debt.transactions.slice(0, 6)) {
      lines.push(`  • ${transaction.description}: ${formatCurrency(transaction.amount, transaction.currency)}`)
    }
  }

  return lines
}

function buildDebtTransactionRows(transactions: DebtTransaction[], fallbackCurrency: string): string {
  return transactions.slice(0, 6).map((transaction) => {
    const safeDescription = escapeHtml(transaction.description || 'Chi phí')
    const safeAmount = escapeHtml(formatCurrency(transaction.amount, transaction.currency || fallbackCurrency))
    const safeDate = escapeHtml(formatDate(transaction.expense_date))

    return `
      <tr>
        <td style="padding:9px 0;border-top:1px solid #e2e8f0;">
          <div style="font-size:13px;line-height:1.45;font-weight:650;color:#334155;">${safeDescription}</div>
          ${safeDate ? `<div style="font-size:11px;line-height:1.45;color:#94a3b8;">${safeDate}</div>` : ''}
        </td>
        <td align="right" style="padding:9px 0;border-top:1px solid #e2e8f0;white-space:nowrap;font-size:13px;font-weight:800;color:#0f172a;">
          ${safeAmount}
        </td>
      </tr>`
  }).join('')
}

function buildDebtBreakdownHtml(context: ReminderEmailContext | null): string {
  if (!context) return ''

  const safeTotal = escapeHtml(formatCurrency(context.total_amount))
  const rows = context.debt_breakdown.map((item) => {
    const safeName = escapeHtml(item.counterparty_name || 'Không rõ')
    const safeEmail = item.counterparty_email ? escapeHtml(item.counterparty_email) : ''
    const safeAmount = escapeHtml(formatCurrency(item.amount, item.currency))
    const transactionRows = buildDebtTransactionRows(item.transactions, item.currency)

    return `
      <tr>
        <td style="padding:14px 0 10px;border-top:1px solid #e2e8f0;">
          <div style="font-size:12px;line-height:1.5;color:#64748b;">Bạn cần trả / You owe</div>
          <div style="font-size:16px;line-height:1.45;font-weight:800;color:#0f172a;">${safeName}</div>
          ${safeEmail ? `<div style="font-size:12px;line-height:1.45;color:#94a3b8;">${safeEmail}</div>` : ''}
        </td>
        <td align="right" style="padding:14px 0 10px;border-top:1px solid #e2e8f0;white-space:nowrap;">
          <div style="font-size:17px;line-height:1.45;font-weight:900;color:#dc2626;">${safeAmount}</div>
        </td>
      </tr>
      ${transactionRows ? `<tr>
        <td colspan="2" style="padding:0 0 14px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:12px;background:#ffffff;padding:4px 12px;border:1px solid #eef2f7;">
            ${transactionRows}
          </table>
        </td>
      </tr>` : ''}`
  }).join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:22px;border:1px solid #dbeafe;border-radius:16px;background:#f8fafc;padding:0 18px;">
      <tr>
        <td colspan="2" style="padding:18px 0 14px;">
          <div style="font-size:12px;color:#4f46e5;text-transform:uppercase;letter-spacing:0.08em;font-weight:800;">Chi tiết công nợ / Debt breakdown</div>
          <div style="margin-top:6px;font-size:24px;line-height:1.2;font-weight:900;color:#0f172a;">Tổng cần trả: ${safeTotal}</div>
          <div style="margin-top:6px;font-size:13px;line-height:1.6;color:#64748b;">Các khoản bên dưới được nhóm theo người bạn cần thanh toán.</div>
        </td>
      </tr>
      ${rows}
    </table>`
}

function buildNotifRows(notifications: QueueRow[], appUrl: string): string {
  return notifications.map(n => {
    const label = NOTIF_LABELS[n.notification_type]
    const badge = label ? `${label.vi} / ${label.en}` : n.notification_type
    const href = n.link ? joinAppUrl(appUrl, n.link) : appUrl
    const reminderContext = n.notification_type === 'settlement_reminder'
      ? normalizeReminderEmailContext(n.email_context)
      : null

    return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;">
          <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;">
            ${escapeHtml(badge)}
          </div>
          <div style="font-size:14px;font-weight:600;color:#1a1a1a;margin-bottom:3px;">
            ${escapeHtml(n.title)}
          </div>
          <div style="font-size:13px;color:#555;line-height:1.5;">
            ${escapeHtml(n.message)}
          </div>
          ${n.link ? `
          <a href="${escapeHtml(href)}"
             style="display:inline-block;margin-top:6px;font-size:12px;color:#6366f1;text-decoration:none;">
            Xem chi tiết / View &rarr;
          </a>` : ''}
          ${buildDebtBreakdownHtml(reminderContext)}
        </td>
      </tr>`
  }).join('')
}

function buildEmailHtml(
  userName: string,
  notifications: QueueRow[],
  appUrl: string
): string {
  const count = notifications.length
  const countLabel = count === 1
    ? '1 thông báo mới / 1 new notification'
    : `${count} thông báo mới / ${count} new notifications`

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>FairPay Notifications</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:26px;font-weight:700;color:#fff;letter-spacing:-0.5px;">FairPay</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;">
                Chia sẻ chi phí thông minh &bull; Smart expense splitting
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#fff;padding:32px;">
              <p style="margin:0 0 6px;font-size:16px;color:#1a1a1a;">
                Xin chào / Hello, <strong>${escapeHtml(userName)}</strong>
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#666;">
                Bạn có <strong>${countLabel}</strong>.
              </p>

              <!-- Notification rows -->
              <table width="100%" cellpadding="0" cellspacing="0">
                ${buildNotifRows(notifications, appUrl)}
              </table>

              <!-- CTA -->
              <div style="text-align:center;margin-top:32px;">
                <a href="${escapeHtml(appUrl)}"
                   style="display:inline-block;background:#6366f1;color:#fff;padding:13px 36px;
                          border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
                  Mở FairPay / Open FairPay
                </a>
              </div>

              <!-- Footer -->
              <p style="margin:28px 0 0;font-size:11px;color:#aaa;text-align:center;
                        border-top:1px solid #f0f0f0;padding-top:20px;line-height:1.8;">
                Để tắt email thông báo, vào <strong>Cài đặt &rarr; Thông báo</strong>.<br>
                To disable email notifications, go to <strong>Settings &rarr; Notifications</strong>.<br>
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

function buildInviteTitle(inviterName: string): string {
  return `${inviterName} mời bạn sử dụng FairPay`
}

function buildInviteSubject(): string {
  return '[FairPay] You are invited to FairPay'
}

function buildInviteText(inviterName: string, appUrl: string): string {
  return [
    'Xin chào,',
    '',
    `${inviterName} mời bạn sử dụng FairPay để chia tiền nhóm, theo dõi ai nợ ai, và settle up rõ ràng hơn.`,
    '',
    `Bắt đầu với FairPay: ${appUrl}`,
    '',
    'FairPay - Chia sẻ chi phí thông minh',
  ].join('\n')
}

function buildInviteEmailHtml(inviterName: string, appUrl: string): string {
  const title = buildInviteTitle(inviterName)
  const previewText = 'Chia tiền nhóm, theo dõi ai nợ ai, và settle up rõ ràng hơn cùng FairPay.'
  const safeInviterName = escapeHtml(inviterName)
  const safeAppUrl = escapeHtml(appUrl)

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">
    ${escapeHtml(previewText)}
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f6f7fb;padding:28px 12px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;box-shadow:0 18px 60px rgba(15,23,42,0.10);">
          <tr>
            <td style="padding:28px 32px;background:#111827;color:#ffffff;">
              <div style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#a5b4fc;font-weight:700;">FairPay Invite</div>
              <div style="margin-top:10px;font-size:30px;line-height:1.15;font-weight:800;letter-spacing:-0.04em;">Chia tiền nhóm không còn rối</div>
              <div style="margin-top:10px;font-size:14px;line-height:1.7;color:#d1d5db;">${safeInviterName} vừa mời bạn vào FairPay.</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#111827;">Xin chào,</p>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:#4b5563;">
                FairPay giúp bạn ghi lại chi phí chung, biết chính xác ai đang nợ ai, và settle up minh bạch sau mỗi chuyến đi, bữa ăn, hoặc nhóm bạn.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 26px;border:1px solid #eef2ff;border-radius:14px;background:#f8fafc;">
                <tr>
                  <td style="padding:18px 20px;font-size:14px;line-height:1.8;color:#374151;">
                    <strong style="color:#111827;">Bạn có thể dùng FairPay để:</strong><br>
                    - Split bill nhanh giữa bạn bè và nhóm<br>
                    - Theo dõi công nợ theo thời gian thực<br>
                    - Nhận nhắc thanh toán qua email/thông báo
                  </td>
                </tr>
              </table>
              <div style="text-align:center;margin:30px 0;">
                <a href="${safeAppUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:999px;padding:14px 28px;font-size:15px;font-weight:700;">
                  Bắt đầu với FairPay
                </a>
              </div>
              <p style="margin:0;font-size:12px;line-height:1.7;color:#9ca3af;text-align:center;">Nếu nút không hoạt động, mở liên kết này: <a href="${safeAppUrl}" style="color:#4f46e5;text-decoration:none;">${safeAppUrl}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildInviteEmailParts(inviterName: string, appUrl: string): EmailParts {
  return {
    subject: buildInviteSubject(),
    text: buildInviteText(inviterName, appUrl),
    html: buildInviteEmailHtml(inviterName, appUrl),
  }
}

async function sendInviteEmails(
  smtp: SMTPClient,
  fromName: string,
  fromEmail: string,
  emails: string[],
  inviterName: string,
  appUrl: string
): Promise<ProcessingResult> {
  const result: ProcessingResult = { sent: 0, failed: 0, skipped: 0, errors: [] }
  const inviteEmail = buildInviteEmailParts(inviterName, appUrl)

  for (const email of emails) {
    try {
      await sendHtmlEmail(smtp, {
        fromName,
        fromEmail,
        to: email,
        subject: inviteEmail.subject,
        html: inviteEmail.html,
        text: inviteEmail.text,
        tag: 'invite',
      })
      result.sent++
      console.log(`✓ invite ${email}`)
    } catch (err) {
      const msg = `Invite send failed for ${email}: ${(err as Error).message}`
      console.error(msg)
      result.failed++
      result.errors.push(msg)
    }
  }

  return result
}

/**
 * Send Email Notifications Edge Function
 *
 * Called via cron every 5 minutes (set up via pg_cron + pg_net, see migration).
 * For each user with unsent notifications:
 *   1. Groups all pending notifications into a single digest email
 *   2. Sends via SMTP (denomailer)
 *   3. Marks notifications with email_sent_at timestamp
 *
 * Required secrets (set via `supabase secrets set`):
 *   SMTP_HOST      - e.g. smtp.gmail.com
 *   SMTP_PORT      - e.g. 587 (STARTTLS) or 465 (SSL)
 *   SMTP_USER      - sender email address
 *   SMTP_PASS      - app password or SMTP password
 *   SMTP_FROM_NAME - display name (default: FairPay)
 *   APP_URL        - frontend URL for deep links (default: https://long-pay.vercel.app)
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders() })
  }

  try {
    // ── Config ────────────────────────────────────────────────────────────
    const supabaseUrl      = Deno.env.get('SUPABASE_URL')!
    const supabaseKey      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey  = Deno.env.get('SUPABASE_ANON_KEY')
    const smtpHost         = Deno.env.get('SMTP_HOST')
    const smtpPort         = parseInt(Deno.env.get('SMTP_PORT') || '587')
    const smtpUser         = Deno.env.get('SMTP_USER')
    const smtpPass         = Deno.env.get('SMTP_PASS')
    const smtpFromName     = Deno.env.get('SMTP_FROM_NAME') || 'FairPay'
    const appUrl           = Deno.env.get('APP_URL') || 'https://long-pay.vercel.app'

    const unauthorized = await authorizeWorkerRequest(req, supabaseUrl, supabaseKey, supabaseAnonKey)
    if (unauthorized) return unauthorized

    const body = await readWorkerRequest(req)

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error(
        'SMTP configuration missing. Set SMTP_HOST, SMTP_USER, SMTP_PASS via `supabase secrets set`.'
      )
    }

    if (body.invite?.emails.length) {
      const smtp = new SMTPClient({
        debug: { encodeLB: true },
        connection: {
          hostname: smtpHost,
          port: smtpPort,
          tls: smtpPort === 465,
          auth: { username: smtpUser, password: smtpPass },
        },
      })
      const inviteResult = await sendInviteEmails(
        smtp,
        smtpFromName,
        smtpUser,
        body.invite.emails,
        body.invite.inviter_name || 'Một người bạn',
        appUrl
      )
      await smtp.close()

      return new Response(
        JSON.stringify({
          success: inviteResult.failed === 0,
          ...inviteResult,
          message: `Invite email complete: ${inviteResult.sent} sent, ${inviteResult.failed} failed`,
        }),
        { status: inviteResult.failed === 0 ? 200 : 207, headers: getCorsHeaders() }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    console.log('Starting email notification worker...')

    // ── 1. Fetch queue ────────────────────────────────────────────────────
    const queueRequest = body.notification_ids?.length
      ? supabase.rpc('get_email_notification_queue', {
          p_notification_ids: body.notification_ids,
          p_include_recent: true,
        })
      : supabase.rpc('get_email_notification_queue')

    const { data: queue, error: queueError } = await queueRequest

    if (queueError) {
      throw new Error(`Failed to fetch notification queue: ${queueError.message}`)
    }

    if (!queue || (queue as QueueRow[]).length === 0) {
      console.log('No notifications pending email delivery')
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          skipped: body.notification_ids?.length ?? 0,
          message: body.notification_ids?.length
            ? 'No eligible notifications found for email delivery'
            : 'Nothing to send',
        }),
        { headers: getCorsHeaders() }
      )
    }

    console.log(`Queue: ${(queue as QueueRow[]).length} notifications across users`)

    // ── 2. Group by user ──────────────────────────────────────────────────
    const byUser = new Map<string, QueueRow[]>()
    for (const row of queue as QueueRow[]) {
      if (!byUser.has(row.user_id)) byUser.set(row.user_id, [])
      byUser.get(row.user_id)!.push(row)
    }

    // ── 3. Connect SMTP ───────────────────────────────────────────────────
    const smtp = new SMTPClient({
      debug: { encodeLB: true },
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpPort === 465,
        auth: { username: smtpUser, password: smtpPass },
      },
    })

    const result: ProcessingResult = { sent: 0, failed: 0, skipped: 0, errors: [] }

    // ── 4. Send digest per user ───────────────────────────────────────────
    for (const [userId, notifs] of byUser) {
      const { user_email, user_name } = notifs[0]

      try {
        const html    = buildEmailHtml(user_name || 'there', notifs, appUrl)
        const content = buildEmailText(user_name || 'there', notifs, appUrl)
        const subject = buildSubject(notifs.length, notifs)

        await sendHtmlEmail(smtp, {
          fromName: smtpFromName,
          fromEmail: smtpUser,
          to: user_email,
          subject,
          html,
          text: content,
          tag: 'notification-digest',
        })

        // ── 5. Mark as sent ───────────────────────────────────────────────
        const ids = notifs.map(n => n.notification_id)
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ email_sent_at: new Date().toISOString() })
          .in('id', ids)

        if (updateError) {
          console.error(`Mark-sent failed for ${user_email}:`, updateError.message)
          result.errors.push(`Mark-sent failed for ${user_email}: ${updateError.message}`)
        } else {
          result.sent++
          console.log(`✓ ${user_email} — ${notifs.length} notification(s)`)
        }
      } catch (err) {
        const msg = `Send failed for ${user_email}: ${(err as Error).message}`
        console.error(msg)
        result.failed++
        result.errors.push(msg)
        // Continue to next user — one failure should not block others
      }
    }

    await smtp.close()

    console.log('Email worker complete:', result)

    return new Response(
      JSON.stringify({ success: true, ...result }),
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
