// Digest email for non-reminder notifications (and reminders without a snapshot).
// Pure string rendering so vitest can cover it; no Deno APIs.
import { buildEmailPanel, buildEmailShell, escapeEmailHtml as escapeHtml } from '../_shared/email-design-system.ts'
import { defaultDebtReminderCopy } from '../_shared/transactional-email.bundle.mjs'
import { SETTLEMENT_REMINDER, type QueueRow } from './routing.ts'

// Vietnamese labels for each notification type (digest badges)
const NOTIF_LABELS: Record<string, string> = {
  expense_added: 'Chi phí mới',
  expense_updated: 'Chi phí đã cập nhật',
  expense_deleted: 'Chi phí đã xóa',
  payment_recorded: 'Thanh toán mới',
  friend_request: 'Lời mời kết bạn',
  friend_accepted: 'Kết bạn thành công',
  added_to_group: 'Được thêm vào nhóm',
  group_join_request: 'Yêu cầu tham gia nhóm',
  group_join_approved: 'Yêu cầu được chấp thuận',
  group_join_rejected: 'Yêu cầu bị từ chối',
  comment_mention: 'Đề cập trong bình luận',
  comment_reply: 'Trả lời bình luận',
  comment_reaction: 'Phản ứng bình luận',
  expense_comment: 'Bình luận chi phí',
  settlement_reminder: 'Nhắc thanh toán',
}

function joinAppUrl(appUrl: string, link: string): string {
  return `${appUrl.replace(/\/$/, '')}/${link.replace(/^\//, '')}`
}

function withSrc(url: string, src: string): string {
  const [path, query = ''] = url.split('?')
  const params = new URLSearchParams(query)
  params.set('src', src)
  return `${path}?${params}`
}

const DIGEST_FOOTER_HTML = 'Bạn nhận email này vì có tài khoản hoặc được mời vào FairPay.<br>Tắt email này: <strong>Cài đặt → Thông báo</strong>'

/** Digest-only reminder row (U7): reminders with a snapshot never reach the digest. */
function digestReminderHref(appUrl: string, hasAuthAccount: boolean): string {
  return withSrc(joinAppUrl(appUrl, hasAuthAccount ? '/balances' : '/register'), 'email_digest_reminder')
}

function notificationHref(n: QueueRow, appUrl: string, hasAuthAccount: boolean): string | null {
  if (n.notification_type === SETTLEMENT_REMINDER) return digestReminderHref(appUrl, hasAuthAccount)
  if (!hasAuthAccount) return joinAppUrl(appUrl, '/register')
  return n.link ? joinAppUrl(appUrl, n.link) : null
}

export function buildSubject(count: number, notifications: QueueRow[]): string {
  if (count === 1) {
    return `FairPay: ${NOTIF_LABELS[notifications[0].notification_type] ?? 'Thông báo mới'}`
  }
  return `FairPay: ${count} thông báo mới`
}

function getSmartCtaHref(notifications: QueueRow[], appUrl: string): string {
  const hasAuthAccount = notifications[0]?.has_auth_account !== false
  if (!hasAuthAccount) return joinAppUrl(appUrl, '/register')
  if (notifications.length === 1) {
    return notificationHref(notifications[0], appUrl, true) ?? joinAppUrl(appUrl, '/dashboard')
  }
  return joinAppUrl(appUrl, '/dashboard')
}

function digestCtaLabel(hasAuthAccount: boolean): string {
  return hasAuthAccount ? 'Mở FairPay' : 'Tạo tài khoản FairPay'
}

export function buildEmailText(userName: string, notifications: QueueRow[], appUrl: string): string {
  const hasAuthAccount = notifications[0]?.has_auth_account !== false
  const lines: string[] = [
    `Xin chào ${userName},`,
    '',
    `Bạn có ${notifications.length} thông báo mới trên FairPay.`,
    '',
  ]
  for (const n of notifications) {
    const isReminder = n.notification_type === SETTLEMENT_REMINDER
    const badge = isReminder ? defaultDebtReminderCopy.digestReminderBadge : NOTIF_LABELS[n.notification_type] ?? n.notification_type
    lines.push(isReminder ? `[${badge}]` : `[${badge}] ${n.title}`)
    lines.push(n.message)
    const href = notificationHref(n, appUrl, hasAuthAccount)
    if (href) lines.push(`${isReminder ? defaultDebtReminderCopy.digestReminderLink.replace(/\s*→$/, '') : 'Xem chi tiết'}: ${href}`)
    lines.push('')
  }
  lines.push(`${digestCtaLabel(hasAuthAccount)}: ${getSmartCtaHref(notifications, appUrl)}`)
  lines.push('', 'Tắt email này: Cài đặt → Thông báo')
  return lines.join('\n')
}

function buildNotifRows(notifications: QueueRow[], appUrl: string): string {
  const hasAuthAccount = notifications[0]?.has_auth_account !== false

  return notifications.map((n) => {
    const isReminder = n.notification_type === SETTLEMENT_REMINDER
    const href = notificationHref(n, appUrl, hasAuthAccount)
    const linkLabel = isReminder ? defaultDebtReminderCopy.digestReminderLink : 'Xem chi tiết →'

    return buildEmailPanel({
      label: isReminder ? defaultDebtReminderCopy.digestReminderBadge : NOTIF_LABELS[n.notification_type] ?? n.notification_type,
      title: isReminder ? undefined : n.title,
      description: n.message,
      tone: isReminder ? 'reminder' : 'default',
      marker: 'notification-card',
      bodyHtml: href
        ? `<a href="${escapeHtml(href)}" style="display:inline-block;margin-top:10px;font-size:13px;color:#2563eb;text-decoration:none;font-weight:700;">${escapeHtml(linkLabel)}</a>`
        : '',
    })
  }).join('')
}

export function buildEmailHtml(
  userName: string,
  notifications: QueueRow[],
  appUrl: string
): string {
  const hasAuthAccount = notifications[0]?.has_auth_account !== false
  const count = notifications.length
  const countLabel = `${count} thông báo mới`

  const bodyHtml = `
    <p style="margin:0 0 6px;font-size:16px;line-height:1.7;color:#0f172a;">
      Xin chào <strong>${escapeHtml(userName)}</strong>,
    </p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#64748b;">
      Bạn có <strong>${escapeHtml(countLabel)}</strong> trên FairPay.
    </p>
    ${buildNotifRows(notifications, appUrl)}`

  return buildEmailShell({
    title: buildSubject(count, notifications),
    previewText: `Bạn có ${countLabel} trên FairPay`,
    eyebrow: 'FairPay',
    heading: 'Thông báo mới từ FairPay',
    subheading: hasAuthAccount
      ? 'Mở FairPay để xem chi tiết.'
      : 'Tạo tài khoản để xem đầy đủ nội dung được gửi cho email này.',
    bodyHtml,
    ctaHref: getSmartCtaHref(notifications, appUrl),
    ctaLabel: digestCtaLabel(hasAuthAccount),
    footerHtml: DIGEST_FOOTER_HTML,
    tone: 'default',
  })
}
