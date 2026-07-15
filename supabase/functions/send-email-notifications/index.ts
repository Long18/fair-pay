import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { buildEmailPanel, buildEmailShell } from '../_shared/email-design-system.ts'
// NOTE: send-email-notifications is invoked server-side (admin worker / cron)
// and does not strictly need CORS. Use the shared helper anyway so origin
// handling stays consistent across functions (defense-in-depth).
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts'

const textEncoder = new TextEncoder()

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
  has_auth_account: boolean
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

interface GroupBreakdownItem {
  group_id: string | null
  group_name: string
  group_avatar_url: string | null
  subtotal_amount: number
  currency: string
  counterparties: DebtBreakdownItem[]
}

interface ReminderEmailContext {
  total_amount: number
  debt_breakdown: DebtBreakdownItem[]
  group_breakdown: GroupBreakdownItem[]
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

  const emails = rawItems.reduce<string[]>((acc, email) => {
    const normalized = email.trim().toLowerCase()
    if (EMAIL_RE.test(normalized)) acc.push(normalized)
    return acc
  }, [])

  return Array.from(new Set(emails))
}

async function readWorkerRequest(req: Request): Promise<WorkerRequest> {
  const raw = await req.text()
  if (!raw) return {}

  const parsed = JSON.parse(raw) as Record<string, unknown>
  const notificationIds = Array.isArray(parsed.notification_ids)
    ? parsed.notification_ids.reduce<string[]>((acc, id) => {
        const normalized = String(id)
        if (UUID_RE.test(normalized)) acc.push(normalized)
        return acc
      }, [])
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

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function formatDate(value: string | null): string {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return dateFormatter.format(date)
}

function normalizeDebtTransactions(value: unknown, fallbackCurrency: string): DebtTransaction[] {
  if (!Array.isArray(value)) return []

  return value.reduce<DebtTransaction[]>((acc, transaction) => {
    const tx = transaction as Record<string, unknown>
    const expenseId = String(tx.expense_id || '')
    const amount = Number(tx.amount || 0)
    if (expenseId && amount > 0) {
      acc.push({
        expense_id: expenseId,
        description: String(tx.description || 'Chi phí'),
        amount,
        currency: String(tx.currency || fallbackCurrency),
        expense_date: tx.expense_date ? String(tx.expense_date) : null,
      })
    }
    return acc
  }, [])
}

function normalizeDebtBreakdownItems(value: unknown): DebtBreakdownItem[] {
  if (!Array.isArray(value)) return []

  return value.reduce<DebtBreakdownItem[]>((acc, item) => {
    const debt = item as Record<string, unknown>
    const currency = String(debt.currency || 'VND')
    const counterpartyKey = String(debt.counterparty_key || '')
    const amount = Number(debt.amount || 0)

    if (counterpartyKey && amount > 0) {
      acc.push({
        counterparty_key: counterpartyKey,
        counterparty_name: String(debt.counterparty_name || 'Không rõ'),
        counterparty_email: debt.counterparty_email ? String(debt.counterparty_email) : null,
        amount,
        currency,
        direction: 'user_owes_counterparty' as const,
        transactions: normalizeDebtTransactions(debt.transactions, currency),
      })
    }
    return acc
  }, [])
}

function normalizeGroupBreakdownItems(value: unknown): GroupBreakdownItem[] {
  if (!Array.isArray(value)) return []

  return value.reduce<GroupBreakdownItem[]>((acc, item) => {
    const group = item as Record<string, unknown>
    const currency = String(group.currency || 'VND')
    const subtotalAmount = Number(group.subtotal_amount || 0)
    const counterparties = normalizeDebtBreakdownItems(group.counterparties)

    if (subtotalAmount > 0 && counterparties.length > 0) {
      acc.push({
        group_id: group.group_id ? String(group.group_id) : null,
        group_name: String(group.group_name || 'Direct / Ngoài group'),
        group_avatar_url: group.group_avatar_url ? String(group.group_avatar_url) : null,
        subtotal_amount: subtotalAmount,
        currency,
        counterparties,
      })
    }
    return acc
  }, [])
}

function normalizeReminderEmailContext(value: unknown): ReminderEmailContext | null {
  if (!value || typeof value !== 'object') return null

  const raw = value as Record<string, unknown>
  const debtBreakdown = normalizeDebtBreakdownItems(raw.debt_breakdown)
  const groupBreakdown = normalizeGroupBreakdownItems(raw.group_breakdown)

  if (!debtBreakdown.length && !groupBreakdown.length) return null

  const totalAmount = Number(raw.total_amount || 0)
  return {
    total_amount: totalAmount > 0
      ? totalAmount
      : debtBreakdown.length
        ? debtBreakdown.reduce((sum, item) => sum + item.amount, 0)
        : groupBreakdown.reduce((sum, item) => sum + item.subtotal_amount, 0),
    debt_breakdown: debtBreakdown,
    group_breakdown: groupBreakdown,
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
  const hasAuthAccount = notifications[0]?.has_auth_account !== false
  const ctaUrl = getSmartCtaHref(notifications, appUrl)
  const hasReminder = notifications.some((n) => n.notification_type === 'settlement_reminder')
  const ctaActionLabel = hasAuthAccount
    ? (hasReminder ? 'Xem số dư / View balances' : 'Mở FairPay / Open FairPay')
    : 'Tạo tài khoản FairPay / Create your FairPay account'
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
    if (n.link) {
      lines.push(`${hasAuthAccount ? 'Xem chi tiết / View' : 'Tạo tài khoản để xem / Create account to view'}: ${hasAuthAccount ? joinAppUrl(appUrl, n.link) : ctaUrl}`)
    }
    lines.push('')
  }
  lines.push(`${ctaActionLabel}: ${ctaUrl}`)
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
    `Tổng cần trả sau bù trừ / Total due after netting: ${formatCurrency(context.total_amount)}`,
  ]

  if (context.group_breakdown.length) {
    for (const group of context.group_breakdown) {
      lines.push(`- ${group.group_name}: ${formatCurrency(group.subtotal_amount, group.currency)} chưa settle / outstanding`)
      for (const debt of group.counterparties) {
        lines.push(`  • Bạn cần trả ${debt.counterparty_name}: ${formatCurrency(debt.amount, debt.currency)}`)
        for (const transaction of debt.transactions.slice(0, 6)) {
          lines.push(`    - ${transaction.description}: ${formatCurrency(transaction.amount, transaction.currency)}`)
        }
      }
    }
    lines.push('Lưu ý / Note: Subtotal theo group là các khoản chưa settle và có thể khác tổng chính thức sau bù trừ.')
    return lines
  }

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

function getInitials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'FP'

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

function buildCounterpartyRows(items: DebtBreakdownItem[]): string {
  return items.map((item) => {
    const safeName = escapeHtml(item.counterparty_name || 'Không rõ')
    const safeEmail = item.counterparty_email ? escapeHtml(item.counterparty_email) : ''
    const safeAmount = escapeHtml(formatCurrency(item.amount, item.currency))
    const transactionRows = buildDebtTransactionRows(item.transactions, item.currency)

    return `
      <tr>
        <td style="padding:12px 0 10px;border-top:1px solid #e2e8f0;">
          <div style="font-size:12px;line-height:1.5;color:#64748b;">Bạn cần trả / You owe</div>
          <div style="font-size:16px;line-height:1.45;font-weight:800;color:#0f172a;">${safeName}</div>
          ${safeEmail ? `<div style="font-size:12px;line-height:1.45;color:#94a3b8;">${safeEmail}</div>` : ''}
        </td>
        <td align="right" style="padding:12px 0 10px;border-top:1px solid #e2e8f0;white-space:nowrap;">
          <div style="font-size:17px;line-height:1.45;font-weight:900;color:#f43f5e;">${safeAmount}</div>
        </td>
      </tr>
      ${transactionRows ? `<tr>
        <td colspan="2" style="padding:0 0 14px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:14px;background:#ffffff;padding:4px 12px;border:1px solid #eef2f7;">
            ${transactionRows}
          </table>
        </td>
      </tr>` : ''}`
  }).join('')
}

function buildGroupAvatarHtml(group: GroupBreakdownItem): string {
  const safeGroupName = escapeHtml(group.group_name || 'Group')

  if (group.group_avatar_url) {
    return `<img src="${escapeHtml(group.group_avatar_url)}" width="48" height="48" alt="${safeGroupName}" style="display:block;width:48px;height:48px;border-radius:999px;object-fit:cover;border:1px solid #e2e8f0;">`
  }

  return `<div aria-label="${safeGroupName}" style="width:48px;height:48px;border-radius:999px;background:#e0e7ff;color:#4338ca;font-size:16px;line-height:48px;font-weight:800;text-align:center;">
    ${escapeHtml(getInitials(group.group_name || 'FairPay'))}
  </div>`
}

function buildGroupSections(groups: GroupBreakdownItem[], appUrl?: string): string {
  return groups.map((group) => {
    const safeGroupName = escapeHtml(group.group_name || 'Direct / Ngoài group')
    const safeSubtotal = escapeHtml(formatCurrency(group.subtotal_amount, group.currency))
    const groupHref = group.group_id && appUrl ? joinAppUrl(appUrl, `/groups/${group.group_id}`) : undefined
    const headerOpen = groupHref
      ? `<a href="${escapeHtml(groupHref)}" style="display:block;text-decoration:none;color:inherit;">`
      : ''
    const headerClose = groupHref ? '</a>' : ''

    return `
      <table class="group-card" data-email-block="group-debt-card" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:14px;border:1px solid #e2e8f0;border-radius:20px;background:#ffffff;padding:0 16px;">
        <tr>
          <td style="padding:16px 0 12px;">
            ${headerOpen}
            <table class="group-header-table" width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td class="group-header-avatar" width="58" valign="top">${buildGroupAvatarHtml(group)}</td>
                <td valign="middle">
                  <div style="font-size:12px;line-height:1.5;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;font-weight:800;">Group</div>
                  <div style="font-size:17px;line-height:1.4;font-weight:800;color:#0f172a;">${safeGroupName}</div>
                </td>
                <td class="group-header-amount" align="right" valign="middle" style="white-space:nowrap;">
                  <div style="font-size:11px;line-height:1.5;color:#64748b;">Chưa settle / Outstanding</div>
                  <div style="font-size:18px;line-height:1.3;font-weight:900;color:#f43f5e;">${safeSubtotal}</div>
                </td>
              </tr>
            </table>
            ${headerClose}
          </td>
        </tr>
        <tr>
          <td>
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              ${buildCounterpartyRows(group.counterparties)}
            </table>
          </td>
        </tr>
      </table>`
  }).join('')
}

function buildDebtBreakdownHtml(context: ReminderEmailContext | null, appUrl?: string): string {
  if (!context) return ''

  const safeTotal = escapeHtml(formatCurrency(context.total_amount))
  const groupSections = buildGroupSections(context.group_breakdown, appUrl)
  const legacyRows = buildCounterpartyRows(context.debt_breakdown)

  return `
    ${buildEmailPanel({
      label: 'Chi tiết công nợ / Debt breakdown',
      title: `Tổng cần trả sau bù trừ: ${safeTotal}`,
      description: context.group_breakdown.length
        ? 'Các section bên dưới là các khoản chưa settle theo group; subtotal có thể khác tổng chính thức sau bù trừ.'
        : 'Các khoản bên dưới được nhóm theo người bạn cần thanh toán.',
      tone: 'reminder',
      marker: 'debt-summary',
    })}
    ${groupSections || `
    <table data-email-block="legacy-debt-list" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:14px;border:1px solid #e2e8f0;border-radius:18px;background:#ffffff;padding:0 18px;">
      ${legacyRows}
    </table>`}`
}

function buildNotifRows(notifications: QueueRow[], appUrl: string): string {
  const hasAuthAccount = notifications[0]?.has_auth_account !== false
  const placeholderHref = joinAppUrl(appUrl, '/register')

  return notifications.map(n => {
    const label = NOTIF_LABELS[n.notification_type]
    const badge = label ? `${label.vi} / ${label.en}` : n.notification_type
    const href = hasAuthAccount && n.link ? joinAppUrl(appUrl, n.link) : placeholderHref
    const reminderContext = n.notification_type === 'settlement_reminder'
      ? normalizeReminderEmailContext(n.email_context)
      : null

    return buildEmailPanel({
      label: badge,
      title: n.title,
      description: n.message,
      tone: n.notification_type === 'settlement_reminder' ? 'reminder' : 'default',
      marker: 'notification-card',
      bodyHtml: `
        ${n.link ? `
          <a href="${escapeHtml(href)}" style="display:inline-block;margin-top:10px;font-size:13px;color:#2563eb;text-decoration:none;font-weight:700;">
            ${hasAuthAccount ? 'Xem chi tiết / View' : 'Tạo tài khoản để xem / Create account to view'} &rarr;
          </a>` : ''}
        ${buildDebtBreakdownHtml(reminderContext, appUrl)}`,
    })
  }).join('')
}

function getSmartCtaHref(notifications: QueueRow[], appUrl: string): string {
  const hasAuthAccount = notifications[0]?.has_auth_account !== false

  if (!hasAuthAccount) return joinAppUrl(appUrl, '/register')

  // Single notification: route to its link if available
  if (notifications.length === 1 && notifications[0]?.link) {
    return joinAppUrl(appUrl, notifications[0].link)
  }

  // Any settlement reminders: go to /balances (where user settles)
  if (notifications.some((n) => n.notification_type === 'settlement_reminder')) {
    return joinAppUrl(appUrl, '/balances')
  }

  // Default: dashboard
  return joinAppUrl(appUrl, '/dashboard')
}

function buildEmailHtml(
  userName: string,
  notifications: QueueRow[],
  appUrl: string
): string {
  const hasAuthAccount = notifications[0]?.has_auth_account !== false
  const hasReminder = notifications.some((notification) => notification.notification_type === 'settlement_reminder')
  const ctaHref = getSmartCtaHref(notifications, appUrl)
  const ctaLabel = hasAuthAccount
    ? (hasReminder ? 'Xem số dư / View balances' : 'Mở FairPay / Open FairPay')
    : 'Tạo tài khoản để xem chi tiết / Create account to view'
  const heroUrl = joinAppUrl(appUrl, '/assets/email/debt-reminder-hero.jpg')
  const count = notifications.length
  const countLabel = count === 1
    ? '1 thông báo mới / 1 new notification'
    : `${count} thông báo mới / ${count} new notifications`

  const bodyHtml = `
    <p style="margin:0 0 6px;font-size:16px;line-height:1.7;color:#0f172a;">
      Xin chào / Hello, <strong>${escapeHtml(userName)}</strong>
    </p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#64748b;">
      Bạn có <strong>${escapeHtml(countLabel)}</strong>.
    </p>
    ${buildNotifRows(notifications, appUrl)}`

  return buildEmailShell({
    title: 'FairPay Notifications',
    previewText: countLabel,
    eyebrow: hasReminder ? 'FairPay Reminder' : 'FairPay Notifications',
    heading: hasReminder ? 'Nhắc thanh toán rõ ràng' : 'Thông báo mới từ FairPay',
    subheading: hasAuthAccount
      ? 'Mở FairPay để xem chi tiết và xử lý khi sẵn sàng.'
      : 'Tạo tài khoản để xem đầy đủ nội dung được gửi cho email này.',
    bodyHtml,
    ctaHref,
    ctaLabel,
    tone: hasReminder ? 'reminder' : 'default',
    heroHtml: hasReminder ? `<tr>
      <td data-email-block="hero-image" style="background:#111827;">
        <img src="${escapeHtml(heroUrl)}" width="600" alt="FairPay debt reminder overview" style="display:block;width:100%;max-width:600px;height:auto;">
      </td>
    </tr>` : '',
  })
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

  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#0f172a;">Xin chào,</p>
    <p style="margin:0;font-size:15px;line-height:1.8;color:#475569;">
      ${safeInviterName} mời bạn vào FairPay để chia tiền nhóm, theo dõi ai nợ ai, và settle up rõ ràng sau mỗi chuyến đi, bữa ăn, hoặc nhóm bạn.
    </p>
    ${buildEmailPanel({
      label: 'Invite block',
      title: 'Bạn có thể dùng FairPay để',
      description: 'Split bill nhanh, xem công nợ theo thời gian thực, và nhận nhắc thanh toán qua email hoặc thông báo trong app.',
      tone: 'invite',
      marker: 'invite-benefits',
    })}
    <p style="margin:18px 0 0;font-size:12px;line-height:1.7;color:#94a3b8;text-align:center;">Nếu nút không hoạt động, mở liên kết này: <a href="${safeAppUrl}" style="color:#4f46e5;text-decoration:none;">${safeAppUrl}</a></p>`

  return buildEmailShell({
    title,
    previewText,
    eyebrow: 'FairPay Invite',
    heading: 'Chia tiền nhóm không còn rối',
    subheading: `${inviterName} vừa mời bạn vào FairPay.`,
    bodyHtml,
    ctaHref: appUrl,
    ctaLabel: 'Bắt đầu với FairPay',
    tone: 'invite',
  })
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
 *   SMTP_USER      - SMTP username
 *   SMTP_PASS      - app password or SMTP password
 *   SMTP_FROM_EMAIL - sender email address (defaults to SMTP_USER)
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
    const smtpFromEmail    = Deno.env.get('SMTP_FROM_EMAIL') || smtpUser
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
        smtpFromEmail,
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

    console.log(`Queue: ${(queue as QueueRow[]).length} notification recipient rows`)

    // ── 2. Group by recipient ─────────────────────────────────────────────
    const byRecipient = new Map<string, QueueRow[]>()
    for (const row of queue as QueueRow[]) {
      const recipientKey = `${row.user_id}:${row.user_email.toLowerCase()}`
      if (!byRecipient.has(recipientKey)) byRecipient.set(recipientKey, [])
      byRecipient.get(recipientKey)!.push(row)
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
    const successfulNotificationIds = new Set<string>()
    const failedNotificationIds = new Set<string>()

    // ── 4. Send digest per selected recipient ─────────────────────────────
    for (const notifs of byRecipient.values()) {
      const { user_email, user_name } = notifs[0]

      try {
        const html    = buildEmailHtml(user_name || 'there', notifs, appUrl)
        const content = buildEmailText(user_name || 'there', notifs, appUrl)
        const subject = buildSubject(notifs.length, notifs)

        await sendHtmlEmail(smtp, {
          fromName: smtpFromName,
          fromEmail: smtpFromEmail,
          to: user_email,
          subject,
          html,
          text: content,
          tag: 'notification-digest',
        })

        for (const notif of notifs) successfulNotificationIds.add(notif.notification_id)
        result.sent++
        console.log(`✓ ${user_email} — ${notifs.length} notification(s)`)
      } catch (err) {
        const msg = `Send failed for ${user_email}: ${(err as Error).message}`
        console.error(msg)
        result.failed++
        for (const notif of notifs) failedNotificationIds.add(notif.notification_id)
        result.errors.push(msg)
        // Continue to next recipient — one failure should not block others
      }
    }

    // ── 5. Mark notifications sent only when every selected recipient passed
    const sentIds = Array.from(successfulNotificationIds)
      .filter((id) => !failedNotificationIds.has(id))
    if (sentIds.length) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ email_sent_at: new Date().toISOString() })
        .in('id', sentIds)

      if (updateError) {
        console.error('Mark-sent failed:', updateError.message)
        result.errors.push(`Mark-sent failed: ${updateError.message}`)
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
