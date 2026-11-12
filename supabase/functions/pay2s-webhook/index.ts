/**
 * pay2s-webhook
 *
 * Receives Pay2S OAuth webhook deliveries for ONE connection (`?c=<uuid>`).
 * Auth is the per-webhook HMAC (X-Pay2S-Signature over `${timestamp}.${rawBody}`),
 * not a Supabase JWT.
 *
 * Idempotency: UNIQUE (connection_id, pay2s_tx_id) on pay2s_bank_transactions —
 * the event is "processed" only once its row is durably stored, so a crash
 * between steps is retried by Pay2S instead of being lost.
 *
 * This function only RECORDS transactions and SUGGESTS matches. It never
 * settles: confirmation stays in the FairPay UI.
 *
 * ACK = HTTP 200 + {"success": true}, only after storage succeeded.
 */

import {
  decryptSecret,
  jsonResponse,
  parseWebhookTransactions,
  verifyWebhookSignature,
} from '../_shared/pay2s.ts'
import { createServiceClient, loadPay2SEnv } from '../_shared/pay2s-server.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const loaded = loadPay2SEnv()
  if ('missing' in loaded) {
    console.error('pay2s-webhook: missing env', loaded.missing)
    return jsonResponse({ error: 'Webhook not configured' }, 503)
  }
  const { env } = loaded

  const connectionId = new URL(req.url).searchParams.get('c')
  if (!connectionId || !UUID_RE.test(connectionId)) return jsonResponse({ error: 'Not found' }, 404)

  const service = createServiceClient(env)

  const { data: connection } = await service
    .from('pay2s_connections')
    .select('id, user_id, status')
    .eq('id', connectionId)
    .maybeSingle()
  if (!connection || connection.status === 'revoked') return jsonResponse({ error: 'Not found' }, 404)

  const { data: secretRow } = await service
    .from('pay2s_connection_secrets')
    .select('webhook_signing_secret_enc')
    .eq('connection_id', connectionId)
    .maybeSingle()
  if (!secretRow?.webhook_signing_secret_enc) return jsonResponse({ error: 'Not found' }, 404)

  // Verify on the RAW body before parsing.
  const rawBody = await req.text()
  let signingSecret: string
  try {
    signingSecret = await decryptSecret(secretRow.webhook_signing_secret_enc, env.encryptionKey)
  } catch {
    console.error('pay2s-webhook: cannot decrypt signing secret for connection', connectionId)
    return jsonResponse({ error: 'Webhook not configured' }, 500)
  }

  const verdict = await verifyWebhookSignature({
    secret: signingSecret,
    timestamp: req.headers.get('X-Pay2S-Timestamp'),
    signature: req.headers.get('X-Pay2S-Signature'),
    rawBody,
  })
  if (!verdict.ok) {
    console.warn('pay2s-webhook: rejected', { connectionId, reason: verdict.reason })
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const transactions = parseWebhookTransactions(body)

  try {
    for (const tx of transactions) {
      const { data: inserted, error } = await service
        .from('pay2s_bank_transactions')
        .upsert(
          {
            connection_id: connectionId,
            user_id: connection.user_id,
            pay2s_tx_id: tx.externalId,
            gateway: tx.gateway,
            account_number: tx.accountNumber,
            amount: tx.amount,
            content: tx.content,
            direction: tx.direction,
            tx_time: tx.txTime,
            payment_code: tx.paymentCode,
            raw: tx.raw,
          },
          { onConflict: 'connection_id,pay2s_tx_id', ignoreDuplicates: true },
        )
        .select('id')

      if (error) throw error
      // Empty result => duplicate delivery, already stored; nothing more to do.
      if (!inserted || inserted.length === 0) continue

      if (tx.direction === 'IN' && tx.paymentCode) {
        await suggestMatch(service, inserted[0].id as string, connection.user_id as string, tx.paymentCode)
      }
    }

    await service
      .from('pay2s_connections')
      .update({ last_event_at: new Date().toISOString() })
      .eq('id', connectionId)
  } catch (err) {
    // Non-2xx so Pay2S retries; do not ACK unstored events.
    console.error('pay2s-webhook: storage failed', err instanceof Error ? err.message : 'unknown')
    return jsonResponse({ success: false, error: 'Internal error' }, 500)
  }

  return jsonResponse({ success: true })
})

/**
 * Suggest (never settle) a match: the FP payment code must belong to an open
 * order whose payee is the connection owner.
 */
async function suggestMatch(
  service: ReturnType<typeof createServiceClient>,
  transactionRowId: string,
  payeeUserId: string,
  paymentCode: string,
) {
  const { data: order } = await service
    .from('sepay_payment_orders')
    .select('id')
    .eq('order_invoice_number', paymentCode)
    .eq('payee_user_id', payeeUserId)
    .in('status', ['PENDING', 'PARTIAL_PAID'])
    .maybeSingle()

  if (!order) return
  await service
    .from('pay2s_bank_transactions')
    .update({ match_status: 'suggested', matched_source_type: 'sepay_order', matched_source_id: order.id })
    .eq('id', transactionRowId)
}
