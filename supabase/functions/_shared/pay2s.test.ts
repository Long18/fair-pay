import { describe, expect, it, vi } from 'vitest'
import {
  Pay2SApiError,
  buildAuthorizeUrl,
  buildWebhookRequestKey,
  computeCodeChallenge,
  computeWebhookSignature,
  createPay2SClient,
  decryptSecret,
  encryptSecret,
  extractPaymentCode,
  generateEncryptionKeyBase64,
  generatePkcePair,
  generateState,
  isValidIssuer,
  parsePay2STime,
  parseWebhookTransactions,
  sha256Hex,
  verifyWebhookSignature,
} from './pay2s.ts'

describe('PKCE', () => {
  it('matches the RFC 7636 appendix B vector', async () => {
    const challenge = await computeCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })

  it('generates a verifier within 43-128 chars and a matching challenge', async () => {
    const { verifier, challenge } = await generatePkcePair()
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(verifier.length).toBeLessThanOrEqual(128)
    expect(challenge).toBe(await computeCodeChallenge(verifier))
    expect(challenge).not.toMatch(/[=+/]/)
  })

  it('generates states of 16-512 chars that never repeat', () => {
    const a = generateState()
    const b = generateState()
    expect(a.length).toBeGreaterThanOrEqual(16)
    expect(a.length).toBeLessThanOrEqual(512)
    expect(a).not.toBe(b)
  })
})

describe('buildAuthorizeUrl', () => {
  it('includes every required param with S256', () => {
    const url = new URL(
      buildAuthorizeUrl({
        clientId: 'cid',
        redirectUri: 'https://x.supabase.co/functions/v1/pay2s-oauth-callback',
        state: 'state-state-state-state',
        codeChallenge: 'chal',
        scopes: ['accounts:read', 'transactions:read'],
      }),
    )
    expect(url.origin + url.pathname).toBe('https://api.pay2s.vn/api/v1/oauth/authorize')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('scope')).toBe('accounts:read transactions:read')
    expect(url.searchParams.get('client_id')).toBe('cid')
    expect(url.searchParams.get('redirect_uri')).toContain('pay2s-oauth-callback')
  })

  it('validates the issuer exactly', () => {
    expect(isValidIssuer('https://api.pay2s.vn')).toBe(true)
    expect(isValidIssuer('https://evil.example')).toBe(false)
    expect(isValidIssuer(null)).toBe(false)
  })
})

describe('secret encryption', () => {
  it('round-trips and uses a fresh IV each time', async () => {
    const key = generateEncryptionKeyBase64()
    const a = await encryptSecret('refresh-token-123', key)
    const b = await encryptSecret('refresh-token-123', key)
    expect(a).not.toBe(b)
    expect(a.startsWith('v1.')).toBe(true)
    expect(await decryptSecret(a, key)).toBe('refresh-token-123')
  })

  it('fails with a wrong key and with a malformed key', async () => {
    const enc = await encryptSecret('x', generateEncryptionKeyBase64())
    await expect(decryptSecret(enc, generateEncryptionKeyBase64())).rejects.toBeDefined()
    await expect(encryptSecret('x', btoa('short'))).rejects.toThrow(/32 bytes/)
  })
})

describe('webhook signature', () => {
  const secret = 'signing-secret'
  const body = '{"transactions":[{"id":1}]}'
  const now = 1_800_000_000

  it('accepts a valid signature computed over timestamp.rawBody', async () => {
    const ts = String(now)
    const signature = await computeWebhookSignature(secret, ts, body)
    expect(await verifyWebhookSignature({ secret, timestamp: ts, signature, rawBody: body, nowSeconds: now })).toEqual({ ok: true })
  })

  it('rejects a tampered body', async () => {
    const ts = String(now)
    const signature = await computeWebhookSignature(secret, ts, body)
    const res = await verifyWebhookSignature({ secret, timestamp: ts, signature, rawBody: body + ' ', nowSeconds: now })
    expect(res).toEqual({ ok: false, reason: 'bad_signature' })
  })

  it('rejects timestamps older/newer than 5 minutes', async () => {
    const ts = String(now - 301)
    const signature = await computeWebhookSignature(secret, ts, body)
    expect(await verifyWebhookSignature({ secret, timestamp: ts, signature, rawBody: body, nowSeconds: now })).toEqual({
      ok: false,
      reason: 'stale_timestamp',
    })
    const edge = String(now - 300)
    const edgeSig = await computeWebhookSignature(secret, edge, body)
    expect((await verifyWebhookSignature({ secret, timestamp: edge, signature: edgeSig, rawBody: body, nowSeconds: now })).ok).toBe(true)
  })

  it('rejects missing headers and a wrong secret', async () => {
    expect(await verifyWebhookSignature({ secret, timestamp: null, signature: 'x', rawBody: body })).toEqual({
      ok: false,
      reason: 'missing_headers',
    })
    const ts = String(now)
    const signature = await computeWebhookSignature('other', ts, body)
    expect((await verifyWebhookSignature({ secret, timestamp: ts, signature, rawBody: body, nowSeconds: now })).ok).toBe(false)
  })
})

describe('payment code + time + payload parsing', () => {
  it('extracts FP codes case-insensitively and prefers a valid explicit code', () => {
    expect(extractPaymentCode('chuyen tien fpab12cd34ef cam on')).toBe('FPAB12CD34EF')
    expect(extractPaymentCode('no code here')).toBeNull()
    expect(extractPaymentCode('x', 'fp12345678')).toBe('FP12345678')
    expect(extractPaymentCode('FPSHORT', 'DH10001')).toBeNull()
  })

  it('treats Pay2S times as UTC+7', () => {
    expect(parsePay2STime('2026-10-13 09:00:00')).toBe('2026-10-13T02:00:00.000Z')
    expect(parsePay2STime('garbage')).toBeNull()
    expect(parsePay2STime(undefined)).toBeNull()
  })

  it('parses valid transactions and skips malformed ones without failing the batch', () => {
    const parsed = parseWebhookTransactions({
      transactions: [
        {
          id: 10001,
          gateway: 'ACB',
          transactionDate: '2026-10-13 09:00:00',
          accountNumber: '123456',
          content: 'FPAB12CD34EF tra no',
          transferType: 'IN',
          transferAmount: 150000,
          extraData: { remitterName: 'N/A' },
        },
        { id: 2, transferType: 'SIDEWAYS', transferAmount: 1 },
        { transferType: 'IN', transferAmount: 5 },
        { id: 3, transferType: 'OUT', transferAmount: 'abc' },
        null,
        { id: 4, transferType: 'OUT', transferAmount: 70000, content: 'x', gateway: 'N/A' },
      ],
    })
    expect(parsed.map((p) => p.externalId)).toEqual(['10001', '4'])
    expect(parsed[0]).toMatchObject({
      gateway: 'ACB',
      accountNumber: '123456',
      amount: 150000,
      direction: 'IN',
      paymentCode: 'FPAB12CD34EF',
      txTime: '2026-10-13T02:00:00.000Z',
    })
    expect(parsed[1].gateway).toBeNull()
  })

  it('returns [] for non-object or missing transactions', () => {
    expect(parseWebhookTransactions(null)).toEqual([])
    expect(parseWebhookTransactions({})).toEqual([])
    expect(parseWebhookTransactions({ transactions: 'x' })).toEqual([])
  })
})

describe('createPay2SClient', () => {
  const mockFetch = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status, headers }))

  it('exchanges a code with form-encoded PKCE params', async () => {
    const fetchImpl = mockFetch(200, {
      access_token: 'a',
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: 'r',
      scope: 'accounts:read',
    })
    const client = createPay2SClient({ clientId: 'cid', clientSecret: 'sec', fetchImpl: fetchImpl as unknown as typeof fetch })
    const token = await client.exchangeCode({ code: 'c', redirectUri: 'https://r', codeVerifier: 'v' })
    expect(token.refresh_token).toBe('r')
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.pay2s.vn/api/v1/oauth/token')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/x-www-form-urlencoded')
    const params = new URLSearchParams(init.body as string)
    expect(params.get('grant_type')).toBe('authorization_code')
    expect(params.get('code_verifier')).toBe('v')
    expect(params.get('client_secret')).toBe('sec')
  })

  it('maps API errors and Retry-After', async () => {
    const fetchImpl = mockFetch(429, { error: 'rate_limited' }, { 'Retry-After': '12' })
    const client = createPay2SClient({ clientId: 'c', clientSecret: 's', fetchImpl: fetchImpl as unknown as typeof fetch })
    await expect(client.refresh('r')).rejects.toMatchObject({ status: 429, code: 'rate_limited', retryAfterSeconds: 12 })
    await expect(client.refresh('r')).rejects.toBeInstanceOf(Pay2SApiError)
  })

  it('normalizes bank accounts to opaque string ids and sends the Bearer token', async () => {
    const fetchImpl = mockFetch(200, { data: [{ id: 123, accountNumber: 'P2S1', vaNumber: '', bankName: 'ACB', shortBankName: 'ACB' }] })
    const client = createPay2SClient({ clientId: 'c', clientSecret: 's', fetchImpl: fetchImpl as unknown as typeof fetch })
    const banks = await client.listBankAccounts('tok')
    expect(banks).toEqual([{ id: '123', accountNumber: 'P2S1', vaNumber: '', bankName: 'ACB', shortBankName: 'ACB' }])
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('creates an IN webhook with an idempotent request_key', async () => {
    const fetchImpl = mockFetch(201, { id: 'a'.repeat(64), signing_secret: 'ss', replayed: false })
    const client = createPay2SClient({ clientId: 'c', clientSecret: 's', fetchImpl: fetchImpl as unknown as typeof fetch })
    await client.createWebhook('tok', { bankId: '123', url: 'https://hook', requestKey: 'fp:abc:123' })
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({ bank_id: '123', url: 'https://hook', direction: 'IN', request_key: 'fp:abc:123' })
  })
})

describe('misc', () => {
  it('builds request keys within Pay2S limits (8-80 chars, restricted charset)', () => {
    const key = buildWebhookRequestKey('11111111-2222-3333-4444-555555555555', '123/45 6')
    expect(key.length).toBeGreaterThanOrEqual(8)
    expect(key.length).toBeLessThanOrEqual(80)
    expect(key).toMatch(/^[A-Za-z0-9._:-]+$/)
  })

  it('hashes state deterministically', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})
