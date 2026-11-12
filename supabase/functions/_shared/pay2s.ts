/**
 * Pay2S OAuth2 helpers shared by the pay2s-* Edge Functions.
 *
 * Pure, Web-standard code (crypto.subtle, fetch, URL) so it runs in Deno and
 * can be unit-tested with Vitest. Environment access is done by callers.
 *
 * Docs: https://developer.pay2s.vn/docs/oauth/overview/
 */

export const PAY2S_DEFAULT_API_BASE = 'https://api.pay2s.vn/api/v1/oauth'
export const PAY2S_ISSUER = 'https://api.pay2s.vn'
export const PAY2S_SCOPES = [
  'profile:read',
  'accounts:read',
  'transactions:read',
  'webhooks:read',
  'webhooks:write',
  'webhooks:delete',
] as const

export const WEBHOOK_MAX_SKEW_SECONDS = 5 * 60
export const OAUTH_STATE_TTL_SECONDS = 10 * 60

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

const encoder = new TextEncoder()

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomUrlSafeString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return bytesToBase64Url(bytes)
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  return bytesToHex(new Uint8Array(digest))
}

// ---------------------------------------------------------------------------
// PKCE + state
// ---------------------------------------------------------------------------

export interface PkcePair {
  verifier: string
  challenge: string
}

/** code_challenge = BASE64URL(SHA256(code_verifier)), no padding. */
export async function computeCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(verifier))
  return bytesToBase64Url(new Uint8Array(digest))
}

/** verifier is 43 chars (32 random bytes, base64url) — within Pay2S's 43–128. */
export async function generatePkcePair(): Promise<PkcePair> {
  const verifier = randomUrlSafeString(32)
  return { verifier, challenge: await computeCodeChallenge(verifier) }
}

/** state must be 16–512 chars; 32 random bytes => 43 chars. */
export function generateState(): string {
  return randomUrlSafeString(32)
}

export function buildAuthorizeUrl(params: {
  apiBase?: string
  clientId: string
  redirectUri: string
  scopes?: readonly string[]
  state: string
  codeChallenge: string
}): string {
  const base = (params.apiBase ?? PAY2S_DEFAULT_API_BASE).replace(/\/$/, '')
  const url = new URL(`${base}/authorize`)
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', (params.scopes ?? PAY2S_SCOPES).join(' '))
  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

/** The callback `iss` must equal the Pay2S issuer; `apiIssuer` is overridable for local mocks. */
export function isValidIssuer(iss: string | null | undefined, expected = PAY2S_ISSUER): boolean {
  return !!iss && iss === expected
}

// ---------------------------------------------------------------------------
// Secret encryption (AES-256-GCM). Key is 32 random bytes, base64 encoded.
// Format: v1.<iv base64url>.<ciphertext base64url>
// ---------------------------------------------------------------------------

async function importAesKey(keyBase64: string): Promise<CryptoKey> {
  const raw = base64ToBytes(keyBase64)
  if (raw.length !== 32) {
    throw new Error('PAY2S_TOKEN_ENCRYPTION_KEY must be 32 bytes (base64)')
  }
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encryptSecret(plaintext: string, keyBase64: string): Promise<string> {
  const key = await importAesKey(keyBase64)
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext))
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(ct))}`
}

export async function decryptSecret(payload: string, keyBase64: string): Promise<string> {
  const parts = payload.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') throw new Error('Unsupported secret format')
  const key = await importAesKey(keyBase64)
  const iv = base64ToBytes(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
  const ct = base64ToBytes(parts[2].replace(/-/g, '+').replace(/_/g, '/'))
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(pt)
}

export function generateEncryptionKeyBase64(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return bytesToBase64(bytes)
}

// ---------------------------------------------------------------------------
// Webhook signature: hex(HMAC_SHA256(secret, `${timestamp}.${rawBody}`))
// ---------------------------------------------------------------------------

export async function computeWebhookSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${rawBody}`))
  return bytesToHex(new Uint8Array(sig))
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a)
  const bb = encoder.encode(b)
  let diff = ab.length ^ bb.length
  const len = Math.max(ab.length, bb.length)
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0)
  return diff === 0
}

export type WebhookVerifyResult = { ok: true } | { ok: false; reason: 'missing_headers' | 'stale_timestamp' | 'bad_signature' }

export async function verifyWebhookSignature(args: {
  secret: string
  timestamp: string | null
  signature: string | null
  rawBody: string
  nowSeconds?: number
  maxSkewSeconds?: number
}): Promise<WebhookVerifyResult> {
  const { secret, timestamp, signature, rawBody } = args
  if (!timestamp || !signature) return { ok: false, reason: 'missing_headers' }

  const ts = Number(timestamp)
  const now = args.nowSeconds ?? Math.floor(Date.now() / 1000)
  const skew = args.maxSkewSeconds ?? WEBHOOK_MAX_SKEW_SECONDS
  if (!Number.isFinite(ts) || Math.abs(now - ts) > skew) {
    return { ok: false, reason: 'stale_timestamp' }
  }

  const expected = await computeWebhookSignature(secret, timestamp, rawBody)
  return constantTimeEqual(expected, signature.trim().toLowerCase())
    ? { ok: true }
    : { ok: false, reason: 'bad_signature' }
}

// ---------------------------------------------------------------------------
// Webhook payload parsing
// ---------------------------------------------------------------------------

export interface NormalizedPay2STransaction {
  externalId: string
  gateway: string | null
  accountNumber: string | null
  amount: number
  content: string
  direction: 'IN' | 'OUT'
  txTime: string | null // ISO-8601 with +07:00 offset
  paymentCode: string | null
  raw: Record<string, unknown>
}

const PAYMENT_CODE_RE = /FP[A-Z0-9]{8,}/

/** FairPay payment codes start with FP + 8+ alphanumerics (same as sepay-webhook). */
export function extractPaymentCode(content: string | null | undefined, explicit?: string | null): string | null {
  if (explicit && /^FP[A-Z0-9]{8,}$/i.test(explicit)) return explicit.toUpperCase()
  const match = (content ?? '').toUpperCase().match(PAYMENT_CODE_RE)
  return match ? match[0] : null
}

/** Pay2S timestamps are Vietnam local time (UTC+7): "YYYY-MM-DD HH:mm:ss". */
export function parsePay2STime(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const m = value.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/)
  if (!m) return null
  const date = new Date(`${m[1]}T${m[2]}+07:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function cleanString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' || t === 'N/A' ? null : t
}

/**
 * Accepts `{transactions: [...]}`. Skips malformed entries instead of rejecting
 * the whole batch (Pay2S may add optional fields).
 */
export function parseWebhookTransactions(body: unknown): NormalizedPay2STransaction[] {
  if (!body || typeof body !== 'object') return []
  const list = (body as { transactions?: unknown }).transactions
  if (!Array.isArray(list)) return []

  const out: NormalizedPay2STransaction[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const tx = item as Record<string, unknown>
    const id = tx.id ?? tx.checksum
    const amount = Number(tx.transferAmount)
    const type = String(tx.transferType ?? '').toUpperCase()
    if (id === undefined || id === null || !Number.isFinite(amount)) continue
    if (type !== 'IN' && type !== 'OUT') continue

    const content = typeof tx.content === 'string' ? tx.content : ''
    out.push({
      externalId: String(id),
      gateway: cleanString(tx.gateway),
      accountNumber: cleanString(tx.accountNumber),
      amount,
      content,
      direction: type,
      txTime: parsePay2STime(tx.transactionDate),
      paymentCode: extractPaymentCode(content, typeof tx.paymentCode === 'string' ? tx.paymentCode : null),
      raw: tx,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Pay2S REST client (fetch is injectable for tests / local mock)
// ---------------------------------------------------------------------------

function parseJsonSafe(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export class Pay2SApiError extends Error {
  status: number
  code: string
  retryAfterSeconds: number | null
  constructor(status: number, code: string, retryAfterSeconds: number | null = null) {
    super(`Pay2S API error ${status}: ${code}`)
    this.name = 'Pay2SApiError'
    this.status = status
    this.code = code
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export interface Pay2STokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

export interface Pay2SBankAccount {
  id: string
  accountNumber: string
  vaNumber: string
  bankName: string
  shortBankName: string
}

export interface Pay2SClientOptions {
  apiBase?: string
  clientId: string
  clientSecret: string
  fetchImpl?: typeof fetch
}

export function createPay2SClient(opts: Pay2SClientOptions) {
  const base = (opts.apiBase ?? PAY2S_DEFAULT_API_BASE).replace(/\/$/, '')
  const doFetch = opts.fetchImpl ?? fetch

  async function request<T>(path: string, init: RequestInit): Promise<T> {
    const res = await doFetch(`${base}${path}`, init)
    const text = await res.text()
    const json = parseJsonSafe(text)
    if (!res.ok) {
      const code =
        json && typeof json === 'object' && typeof (json as { error?: unknown }).error === 'string'
          ? (json as { error: string }).error
          : `http_${res.status}`
      const retryAfter = Number(res.headers.get('Retry-After'))
      throw new Pay2SApiError(res.status, code, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null)
    }
    return json as T
  }

  const form = (data: Record<string, string>) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(data).toString(),
  })

  const bearer = (accessToken: string, extra: RequestInit = {}): RequestInit => ({
    ...extra,
    headers: {
      Accept: 'application/json',
      ...(extra.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return {
    exchangeCode(args: { code: string; redirectUri: string; codeVerifier: string }) {
      return request<Pay2STokenResponse>(
        '/token',
        form({
          grant_type: 'authorization_code',
          client_id: opts.clientId,
          client_secret: opts.clientSecret,
          code: args.code,
          redirect_uri: args.redirectUri,
          code_verifier: args.codeVerifier,
        }),
      )
    },
    refresh(refreshToken: string) {
      return request<Pay2STokenResponse>(
        '/token',
        form({
          grant_type: 'refresh_token',
          client_id: opts.clientId,
          client_secret: opts.clientSecret,
          refresh_token: refreshToken,
        }),
      )
    },
    async listBankAccounts(accessToken: string): Promise<Pay2SBankAccount[]> {
      const res = await request<{ data?: Array<Record<string, unknown>> }>('/bank-accounts', bearer(accessToken))
      return (res.data ?? []).map((b) => ({
        id: String(b.id),
        accountNumber: String(b.accountNumber ?? ''),
        vaNumber: String(b.vaNumber ?? ''),
        bankName: String(b.bankName ?? ''),
        shortBankName: String(b.shortBankName ?? ''),
      }))
    },
    createWebhook(accessToken: string, args: { bankId: string; url: string; requestKey: string }) {
      return request<{ id: string; signing_secret?: string; replayed?: boolean }>(
        '/webhooks',
        bearer(accessToken, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bank_id: args.bankId,
            url: args.url,
            direction: 'IN',
            request_key: args.requestKey,
          }),
        }),
      )
    },
    deleteWebhook(accessToken: string, webhookId: string) {
      return request<{ success: boolean }>(`/webhooks/${encodeURIComponent(webhookId)}`, bearer(accessToken, { method: 'DELETE' }))
    },
    /** NOTE: exact revoke path is not confirmed on the pages read; verify against /docs/oauth/revoke/. */
    revoke(token: string) {
      return request<unknown>(
        '/revoke',
        form({ client_id: opts.clientId, client_secret: opts.clientSecret, token }),
      )
    },
  }
}

/** Stable request_key (8–80 chars, [A-Za-z0-9._:-]) so webhook creation is idempotent per connection+bank. */
export function buildWebhookRequestKey(connectionId: string, bankId: string, nonce = ''): string {
  // A fresh nonce per authorization avoids a `replayed` reply (which omits the
  // signing secret) when the user reconnects.
  const raw = `fp:${connectionId}:${bankId}${nonce ? `:${nonce}` : ''}`.replace(/[^A-Za-z0-9._:-]/g, '-')
  return raw.slice(0, 80)
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}
