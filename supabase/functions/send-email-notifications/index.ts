import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
}

interface ProcessingResult {
  sent: number
  failed: number
  skipped: number
  errors: string[]
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildSubject(count: number, notifications: QueueRow[]): string {
  if (count === 1) {
    const n = notifications[0]
    const label = NOTIF_LABELS[n.notification_type]
    const typeEn = label?.en ?? 'Notification'
    return `[FairPay] ${typeEn}: ${n.title}`
  }
  return `[FairPay] ${count} new notifications / ${count} thông báo mới`
}

function buildNotifRows(notifications: QueueRow[], appUrl: string): string {
  return notifications.map(n => {
    const label = NOTIF_LABELS[n.notification_type]
    const badge = label ? `${label.vi} / ${label.en}` : n.notification_type
    const href = n.link ? `${appUrl}${n.link}` : appUrl

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
                Xin chào / Hello, <strong>${escapeHtml(userName)}</strong> 👋
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
 *   APP_URL        - frontend URL for deep links (default: https://fairpay.app)
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Config ────────────────────────────────────────────────────────────
    const supabaseUrl      = Deno.env.get('SUPABASE_URL')!
    const supabaseKey      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const smtpHost         = Deno.env.get('SMTP_HOST')
    const smtpPort         = parseInt(Deno.env.get('SMTP_PORT') || '587')
    const smtpUser         = Deno.env.get('SMTP_USER')
    const smtpPass         = Deno.env.get('SMTP_PASS')
    const smtpFromName     = Deno.env.get('SMTP_FROM_NAME') || 'FairPay'
    const appUrl           = Deno.env.get('APP_URL') || 'https://fairpay.app'

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error(
        'SMTP configuration missing. Set SMTP_HOST, SMTP_USER, SMTP_PASS via `supabase secrets set`.'
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    console.log('Starting email notification worker...')

    // ── 1. Fetch queue ────────────────────────────────────────────────────
    const { data: queue, error: queueError } = await supabase
      .rpc('get_email_notification_queue')

    if (queueError) {
      throw new Error(`Failed to fetch notification queue: ${queueError.message}`)
    }

    if (!queue || (queue as QueueRow[]).length === 0) {
      console.log('No notifications pending email delivery')
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'Nothing to send' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        const subject = buildSubject(notifs.length, notifs)

        await smtp.send({
          from:    `${smtpFromName} <${smtpUser}>`,
          to:      user_email,
          subject,
          html,
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
