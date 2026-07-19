/**
 * Polar Webhook — syncs subscription state into public.subscriptions.
 *
 * Signature: Standard Webhooks (webhook-id, webhook-timestamp, webhook-signature).
 * Secret: POLAR_WEBHOOK_SECRET (whsec_… or raw; see verifyStandardWebhook below).
 *
 * Updates use the service_role client only. Clients cannot insert/update subscriptions.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Standard Webhooks verification ─────────────────────────────────────────
// Spec: https://github.com/standard-webhooks/standard-webhooks
// Polar: https://polar.sh/docs/integrate/webhooks/delivery
//
// signed_content = `${webhook-id}.${webhook-timestamp}.${rawBody}`
// expected sig   = base64(HMAC-SHA256(secretBytes, signed_content))
// header         = "v1,<sig>" (space-separated list of versioned signatures)
//
// Secret handling:
// 1. If value starts with `whsec_`, strip prefix and base64-decode (Svix/Polar style).
// 2. Else try base64-decode of the whole string.
// 3. Else use UTF-8 bytes (and also try base64-encoded UTF-8 of the secret, per Polar note).

function decodeSecret(secret: string): Uint8Array {
  const raw = secret.startsWith('whsec_') ? secret.slice(6) : secret
  try {
    const bin = atob(raw)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  } catch {
    return new TextEncoder().encode(secret)
  }
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

async function hmacSha256Base64(secretBytes: Uint8Array, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  const bytes = new Uint8Array(sig)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

async function verifyStandardWebhook(
  rawBody: string,
  headers: Headers,
  secret: string,
): Promise<boolean> {
  const msgId = headers.get('webhook-id')
  const timestamp = headers.get('webhook-timestamp')
  const signatureHeader = headers.get('webhook-signature')
  if (!msgId || !timestamp || !signatureHeader) return false

  // Reject stale timestamps (>5 min) to limit replay
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    console.error('Webhook timestamp out of range', { timestamp })
    return false
  }

  const signedContent = `${msgId}.${timestamp}.${rawBody}`
  const secretBytes = decodeSecret(secret)
  const expected = await hmacSha256Base64(secretBytes, signedContent)

  // Also try UTF-8 secret base64-encoded (Polar custom-validation note)
  const utf8SecretB64 = btoa(secret.startsWith('whsec_') ? secret.slice(6) : secret)
  let expectedAlt: string | null = null
  try {
    expectedAlt = await hmacSha256Base64(decodeSecret(utf8SecretB64), signedContent)
  } catch {
    expectedAlt = null
  }

  const candidates = signatureHeader.split(' ').map((part) => {
    const [, sig] = part.split(',', 2)
    return sig ?? part
  })

  const expectedBytes = new TextEncoder().encode(expected)
  for (const cand of candidates) {
    const candBytes = new TextEncoder().encode(cand)
    if (timingSafeEqual(expectedBytes, candBytes)) return true
    if (expectedAlt && timingSafeEqual(new TextEncoder().encode(expectedAlt), candBytes)) {
      return true
    }
  }
  return false
}

// ─── Event → row patch (mirrors src/modules/billing/polar-webhook-map.ts) ────

type Plan = 'free' | 'pro'
type SubscriptionStatus = 'inactive' | 'active' | 'past_due' | 'canceled' | 'revoked'

interface SubscriptionRowPatch {
  user_id: string
  plan: Plan
  status: SubscriptionStatus
  polar_customer_id: string | null
  polar_subscription_id: string | null
  expires_at: string | null
  updated_at: string
}

interface PolarWebhookEvent {
  type: string
  data?: {
    id?: string | null
    status?: string | null
    current_period_end?: string | null
    customer?: { id?: string | null; external_id?: string | null } | null
  } | null
}

const ACTIVE_EVENTS = new Set([
  'subscription.active',
  'subscription.created',
  'subscription.updated',
  'subscription.uncanceled',
])
const END_EVENTS = new Set(['subscription.canceled', 'subscription.revoked'])

function mapPolarEventToSubscriptionPatch(
  event: PolarWebhookEvent,
  now: Date = new Date(),
): SubscriptionRowPatch | null {
  const data = event.data
  if (!data) return null
  const userId = data.customer?.external_id?.trim()
  if (!userId) return null

  const polarStatus = (data.status ?? '').toLowerCase()
  const periodEnd = data.current_period_end ?? null
  const periodEnded =
    periodEnd != null ? new Date(periodEnd).getTime() <= now.getTime() : true

  const base = {
    user_id: userId,
    polar_customer_id: data.customer?.id ?? null,
    polar_subscription_id: data.id ?? null,
    expires_at: periodEnd,
    updated_at: now.toISOString(),
  }

  if (event.type === 'subscription.past_due' || polarStatus === 'past_due') {
    return { ...base, plan: 'pro', status: 'past_due' }
  }

  if (END_EVENTS.has(event.type) || polarStatus === 'canceled' || polarStatus === 'revoked') {
    const status: SubscriptionStatus =
      event.type === 'subscription.revoked' || polarStatus === 'revoked' ? 'revoked' : 'canceled'
    if (status === 'canceled' && !periodEnded) {
      return { ...base, plan: 'pro', status: 'canceled' }
    }
    return { ...base, plan: 'free', status }
  }

  if (ACTIVE_EVENTS.has(event.type)) {
    return { ...base, plan: 'pro', status: 'active' }
  }

  return null
}

// ─── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const webhookSecret = Deno.env.get('POLAR_WEBHOOK_SECRET')
  if (!webhookSecret) {
    console.error('POLAR_WEBHOOK_SECRET not configured')
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const rawBody = await req.text()

  const ok = await verifyStandardWebhook(rawBody, req.headers, webhookSecret)
  if (!ok) {
    console.error('Invalid Polar webhook signature')
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let event: PolarWebhookEvent
  try {
    event = JSON.parse(rawBody) as PolarWebhookEvent
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const patch = mapPolarEventToSubscriptionPatch(event)
  if (!patch) {
    // Acknowledge ignored / unattributed events so Polar does not retry forever
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const serviceClient = createClient(supabaseUrl, serviceKey)

  const { error } = await serviceClient.from('subscriptions').upsert(
    {
      user_id: patch.user_id,
      plan: patch.plan,
      status: patch.status,
      polar_customer_id: patch.polar_customer_id,
      polar_subscription_id: patch.polar_subscription_id,
      expires_at: patch.expires_at,
      updated_at: patch.updated_at,
    },
    { onConflict: 'user_id' },
  )

  if (error) {
    console.error('subscriptions upsert failed', error)
    return new Response(JSON.stringify({ error: 'Database update failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  })
})
