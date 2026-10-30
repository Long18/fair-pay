import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import {
  buildReminderViewModel,
  renderDebtReminderViewModel,
  renderInviteEmail,
} from '../_shared/transactional-email.bundle.mjs'
import {
  shouldMarkSent,
  splitRecipientBatch,
  toReminderContextInput,
  type BatchOutcome,
  type QueueRow,
  type ReminderBatch,
} from './routing.ts'
// NOTE: send-email-notifications is invoked server-side (admin worker / cron)
// and does not strictly need CORS. Use the shared helper anyway so origin
// handling stays consistent across functions (defense-in-depth).
import { getCorsHeaders } from '../_shared/cors.ts'
import { buildEmailHtml, buildEmailText, buildSubject } from './digest.ts'

const textEncoder = new TextEncoder()

interface ProcessingResult {
  sent: number
  failed: number
  skipped: number
  errors: string[]
  skip_reasons?: Record<string, number>
  warnings?: Record<string, number>
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

async function buildInviteEmailParts(inviterName: string, appUrl: string): Promise<EmailParts> {
  const { subject, text, html } = await renderInviteEmail({ inviterName, appUrl })
  return { subject, text, html }
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
  const inviteEmail = await buildInviteEmailParts(inviterName, appUrl)

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
 * For each recipient with unsent notifications:
 *   1. Settlement reminders with an email_context snapshot are merged into one reminder email
 *      (newest snapshot wins) and skipped when multi-currency, empty, or already settled
 *   2. Everything else (plus reminders without a snapshot) goes into one digest email
 *   3. Sends via SMTP (denomailer), with a short gap between emails
 *   4. Marks notifications with email_sent_at when sent or skipped; failed sends stay queued
 *
 * Timing (enforced by get_email_notification_queue, admin bypass via p_include_recent):
 *   - Batch window: notifications wait 30 minutes before email (accumulate into one digest)
 *   - Per-user cooldown: at most one digest every 2 hours
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

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error(
        'SMTP configuration missing. Set SMTP_HOST, SMTP_USER, SMTP_PASS via `supabase secrets set`.'
      )
    }

    const body = await readWorkerRequest(req)

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

    const skipReasons: Record<string, number> = {}
    const warningCounts: Record<string, number> = {}
    const result: ProcessingResult = { sent: 0, failed: 0, skipped: 0, errors: [], skip_reasons: skipReasons, warnings: warningCounts }
    const successfulNotificationIds = new Set<string>()
    const failedNotificationIds = new Set<string>()

    const recordOutcome = (rows: QueueRow[], outcome: BatchOutcome) => {
      const target = shouldMarkSent(outcome) ? successfulNotificationIds : failedNotificationIds
      for (const row of rows) target.add(row.notification_id)
    }
    const countReason = (bucket: Record<string, number>, reason: string) => {
      bucket[reason] = (bucket[reason] ?? 0) + 1
    }

    // One user can have several recipient emails; check their live balance once.
    const liveDebtByUser = new Map<string, Promise<number | null>>()
    const getLiveTotalIOwe = (userId: string) => {
      let pending = liveDebtByUser.get(userId)
      if (!pending) {
        pending = (async () => {
          const { data, error } = await supabase.rpc('get_user_balance', { p_user_id: userId })
          if (error) {
            console.warn(`warn:stale_check_failed ${userId}: ${error.message}`)
            return null
          }
          const row = (Array.isArray(data) ? data[0] : data) as { total_i_owe?: number } | null
          return row ? Number(row.total_i_owe ?? 0) : 0
        })()
        liveDebtByUser.set(userId, pending)
      }
      return pending
    }

    const sendReminderBatch = async (batch: ReminderBatch): Promise<BatchOutcome> => {
      const { latest } = batch
      const vm = buildReminderViewModel({
        context: toReminderContextInput(batch.context),
        recipient: { name: latest.user_name, hasAccount: latest.has_auth_account !== false },
        appUrl,
        notificationCreatedAt: latest.created_at,
      })

      for (const warning of vm.warnings) {
        countReason(warningCounts, `warn:${warning.type}`)
        console.warn(`warn:${warning.type} ${latest.user_email}: snapshot=${warning.snapshotMinor} computed=${warning.computedMinor}`)
      }

      let skipReason: string | null = vm.status === 'skip' ? `skipped:${vm.reason}` : null
      if (!skipReason) {
        const liveTotal = await getLiveTotalIOwe(latest.user_id)
        if (liveTotal !== null && liveTotal <= 0) skipReason = 'skipped:stale'
      }
      if (skipReason) {
        result.skipped++
        countReason(skipReasons, skipReason)
        console.log(`${skipReason} ${latest.user_email} — ${batch.rows.length} reminder(s)`)
        return 'skipped'
      }

      const email = await renderDebtReminderViewModel(vm)
      await sendHtmlEmail(smtp, {
        fromName: smtpFromName,
        fromEmail: smtpFromEmail,
        to: latest.user_email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tag: 'debt-reminder',
      })
      result.sent++
      console.log(`✓ reminder ${latest.user_email} — ${batch.rows.length} reminder(s) merged`)
      return 'sent'
    }

    const sendDigestBatch = async (rows: QueueRow[]): Promise<BatchOutcome> => {
      const { user_email, user_name } = rows[0]
      const recipientName = user_name || 'bạn'
      await sendHtmlEmail(smtp, {
        fromName: smtpFromName,
        fromEmail: smtpFromEmail,
        to: user_email,
        subject: buildSubject(rows.length, rows),
        html: buildEmailHtml(recipientName, rows, appUrl),
        text: buildEmailText(recipientName, rows, appUrl),
        tag: 'notification-digest',
      })
      result.sent++
      console.log(`✓ digest ${user_email} — ${rows.length} notification(s)`)
      return 'sent'
    }

    const runBatch = async (rows: QueueRow[], send: () => Promise<BatchOutcome>) => {
      try {
        recordOutcome(rows, await send())
      } catch (err) {
        const msg = `Send failed for ${rows[0].user_email}: ${(err as Error).message}`
        console.error(msg)
        result.failed++
        result.errors.push(msg)
        recordOutcome(rows, 'failed')
      }
    }

    // ── 4. Per recipient: reminder email (if any) then digest (spaced to avoid SMTP blast) ─
    // Admin bulk UI staggers 60–90s between recipients client-side.
    // This short gap is a safety net when multiple emails share one worker run.
    const recipientGroups = Array.from(byRecipient.values())
    const interSendDelayMs = 5_000
    let sendsAttempted = 0
    const pace = async () => {
      if (sendsAttempted++ > 0) await new Promise((resolve) => setTimeout(resolve, interSendDelayMs))
    }

    for (const notifs of recipientGroups) {
      const { reminder, digestRows } = splitRecipientBatch(notifs)

      if (reminder) {
        await pace()
        await runBatch(reminder.rows, () => sendReminderBatch(reminder))
      }
      if (digestRows.length) {
        await pace()
        await runBatch(digestRows, () => sendDigestBatch(digestRows))
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
