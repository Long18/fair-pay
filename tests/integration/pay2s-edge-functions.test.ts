/**
 * Runs the real pay2s-* Edge Function handlers against an in-memory Supabase
 * and a mocked Pay2S API, so the whole OAuth + webhook flow is covered without
 * real credentials.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeDb } from '../mocks/fake-supabase'
import {
  computeWebhookSignature,
  decryptSecret,
  generateEncryptionKeyBase64,
} from '../../supabase/functions/_shared/pay2s'

vi.mock('https://esm.sh/@supabase/supabase-js@2', async () => {
  const m = await import('../mocks/fake-supabase')
  return { createClient: m.createFakeClient }
})

type Handler = (req: Request) => Promise<Response>

const ENC_KEY = generateEncryptionKeyBase64()
const ENV: Record<string, string> = {
  SUPABASE_URL: 'https://proj.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  SUPABASE_ANON_KEY: 'anon-key',
  PAY2S_CLIENT_ID: 'client-id',
  PAY2S_CLIENT_SECRET: 'client-secret',
  PAY2S_REDIRECT_URI: 'https://proj.supabase.co/functions/v1/pay2s-oauth-callback',
  PAY2S_TOKEN_ENCRYPTION_KEY: ENC_KEY,
  APP_URL: 'https://app.example.com',
}

const handlerCache = new Map<string, Handler>()

async function loadHandler(fn: string): Promise<Handler> {
  const cached = handlerCache.get(fn)
  if (cached) return cached
  let captured: Handler | undefined
  vi.stubGlobal('Deno', {
    serve: (h: Handler) => {
      captured = h
    },
    env: { get: (k: string) => ENV[k] },
  })
  await import(/* @vite-ignore */ `../../supabase/functions/${fn}/index.ts`)
  if (!captured) throw new Error(`no handler captured for ${fn}`)
  handlerCache.set(fn, captured)
  return captured
}

// --- mock Pay2S API ---------------------------------------------------------
interface Pay2SCalls {
  tokenGrants: string[]
  revoked: string[]
  deletedWebhooks: string[]
  createdWebhooks: Array<Record<string, unknown>>
}
let calls: Pay2SCalls
let refreshCounter: number
let banks: Array<Record<string, unknown>>

function installPay2SMock() {
  calls = { tokenGrants: [], revoked: [], deletedWebhooks: [], createdWebhooks: [] }
  refreshCounter = 0
  banks = [{ id: 123, accountNumber: '0123456789', vaNumber: '', bankName: 'ACB', shortBankName: 'ACB' }]

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(input)
      const path = url.pathname.replace('/api/v1/oauth', '')
      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

      if (path === '/token' && init.method === 'POST') {
        const form = new URLSearchParams(init.body as string)
        calls.tokenGrants.push(form.get('grant_type')!)
        if (form.get('grant_type') === 'authorization_code') {
          if (form.get('code') === 'bad-code') return json({ error: 'invalid_grant' }, 400)
          return json({ access_token: 'access-1', token_type: 'Bearer', expires_in: 900, refresh_token: 'refresh-1', scope: 'accounts:read' })
        }
        await new Promise((r) => setTimeout(r, 20)) // widen the race window
        refreshCounter += 1
        return json({ access_token: `access-r${refreshCounter}`, token_type: 'Bearer', expires_in: 900, refresh_token: `refresh-r${refreshCounter}`, scope: 'accounts:read' })
      }
      if (path === '/bank-accounts') return json({ data: banks })
      if (path === '/webhooks' && init.method === 'POST') {
        const body = JSON.parse(init.body as string)
        calls.createdWebhooks.push(body)
        return json({ id: 'a'.repeat(64), signing_secret: 'whsec-123', replayed: false }, 201)
      }
      if (path.startsWith('/webhooks/') && init.method === 'DELETE') {
        calls.deletedWebhooks.push(path.split('/')[2])
        return json({ success: true })
      }
      if (path === '/revoke') {
        calls.revoked.push(new URLSearchParams(init.body as string).get('token')!)
        return json({ success: true })
      }
      return json({ error: 'not_found' }, 404)
    }),
  )
}

beforeEach(() => {
  fakeDb.reset()
  installPay2SMock()
  handlerCache.clear()
  vi.resetModules()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

// --- helpers ----------------------------------------------------------------
async function startOAuth(userId = 'user-A') {
  const start = await loadHandler('pay2s-oauth-start')
  const res = await start(new Request('https://x/functions/v1/pay2s-oauth-start', { method: 'POST', headers: { Authorization: `Bearer ${userId}` } }))
  return res
}

async function connectUser(userId = 'user-A') {
  const res = await startOAuth(userId)
  const { url } = (await res.json()) as { url: string }
  const state = new URL(url).searchParams.get('state')!
  const callback = await loadHandler('pay2s-oauth-callback')
  const cbRes = await callback(
    new Request(`https://x/functions/v1/pay2s-oauth-callback?code=good&state=${state}&iss=${encodeURIComponent('https://api.pay2s.vn')}`),
  )
  return { state, cbRes }
}

const locationStatus = (res: Response) => new URL(res.headers.get('Location')!).searchParams.get('status')

// --- tests ------------------------------------------------------------------
describe('pay2s-oauth-start', () => {
  it('rejects unauthenticated callers', async () => {
    const start = await loadHandler('pay2s-oauth-start')
    const res = await start(new Request('https://x/start', { method: 'POST' }))
    expect(res.status).toBe(401)
  })

  it('returns an authorize URL with PKCE S256 and stores only hashed state + encrypted verifier', async () => {
    const res = await startOAuth()
    expect(res.status).toBe(200)
    const { url } = (await res.json()) as { url: string }
    const u = new URL(url)
    expect(u.origin + u.pathname).toBe('https://api.pay2s.vn/api/v1/oauth/authorize')
    expect(u.searchParams.get('code_challenge_method')).toBe('S256')
    expect(u.searchParams.get('client_id')).toBe('client-id')
    expect(u.searchParams.get('redirect_uri')).toBe(ENV.PAY2S_REDIRECT_URI)

    const rows = fakeDb.table('pay2s_oauth_states')
    expect(rows).toHaveLength(1)
    const state = u.searchParams.get('state')!
    expect(rows[0].state_hash).not.toBe(state)
    expect(String(rows[0].code_verifier_enc).startsWith('v1.')).toBe(true)
  })

  it('returns 503 when Pay2S secrets are not configured', async () => {
    const saved = ENV.PAY2S_CLIENT_ID
    ENV.PAY2S_CLIENT_ID = ''
    try {
      const res = await startOAuth()
      expect(res.status).toBe(503)
    } finally {
      ENV.PAY2S_CLIENT_ID = saved
    }
  })
})

describe('pay2s-oauth-callback', () => {
  it('completes the flow: stores a masked connection, encrypted secrets, and creates an IN webhook', async () => {
    const { cbRes } = await connectUser()
    expect(cbRes.status).toBe(302)
    expect(locationStatus(cbRes)).toBe('connected')

    const conn = fakeDb.table('pay2s_connections')[0]
    expect(conn).toMatchObject({ user_id: 'user-A', status: 'active', bank_id: '123', bank_label: 'ACB •••6789', webhook_id: 'a'.repeat(64) })
    expect(JSON.stringify(conn)).not.toContain('0123456789')

    const secrets = fakeDb.table('pay2s_connection_secrets')[0]
    expect(secrets.access_token_enc).not.toBe('access-1')
    expect(await decryptSecret(secrets.access_token_enc as string, ENC_KEY)).toBe('access-1')
    expect(await decryptSecret(secrets.refresh_token_enc as string, ENC_KEY)).toBe('refresh-1')
    expect(await decryptSecret(secrets.webhook_signing_secret_enc as string, ENC_KEY)).toBe('whsec-123')

    expect(calls.createdWebhooks[0]).toMatchObject({ bank_id: '123', direction: 'IN' })
    expect(String(calls.createdWebhooks[0].url)).toBe(`https://proj.supabase.co/functions/v1/pay2s-webhook?c=${conn.id}`)
    expect(String(calls.createdWebhooks[0].request_key)).toMatch(/^[A-Za-z0-9._:-]{8,80}$/)
  })

  it('treats state as single-use', async () => {
    const { state } = await connectUser()
    const callback = await loadHandler('pay2s-oauth-callback')
    const replay = await callback(new Request(`https://x/cb?code=good&state=${state}&iss=${encodeURIComponent('https://api.pay2s.vn')}`))
    expect(locationStatus(replay)).toBe('invalid_state')
  })

  it('rejects an unknown or missing state without exchanging a code', async () => {
    const callback = await loadHandler('pay2s-oauth-callback')
    expect(locationStatus(await callback(new Request('https://x/cb?code=good&state=nope&iss=https%3A%2F%2Fapi.pay2s.vn')))).toBe('invalid_state')
    expect(locationStatus(await callback(new Request('https://x/cb?code=good')))).toBe('invalid_request')
    expect(calls.tokenGrants).toHaveLength(0)
  })

  it('rejects a wrong issuer and burns the state', async () => {
    const res = await startOAuth()
    const state = new URL(((await res.json()) as { url: string }).url).searchParams.get('state')!
    const callback = await loadHandler('pay2s-oauth-callback')
    const bad = await callback(new Request(`https://x/cb?code=good&state=${state}&iss=${encodeURIComponent('https://evil.example')}`))
    expect(locationStatus(bad)).toBe('invalid_issuer')
    expect(calls.tokenGrants).toHaveLength(0)
    const retry = await callback(new Request(`https://x/cb?code=good&state=${state}&iss=${encodeURIComponent('https://api.pay2s.vn')}`))
    expect(locationStatus(retry)).toBe('invalid_state')
  })

  it('maps access_denied to denied', async () => {
    const res = await startOAuth()
    const state = new URL(((await res.json()) as { url: string }).url).searchParams.get('state')!
    const callback = await loadHandler('pay2s-oauth-callback')
    const denied = await callback(new Request(`https://x/cb?error=access_denied&state=${state}`))
    expect(locationStatus(denied)).toBe('denied')
  })

  it('surfaces Pay2S invalid_grant and leaves no connection behind', async () => {
    const res = await startOAuth()
    const state = new URL(((await res.json()) as { url: string }).url).searchParams.get('state')!
    const callback = await loadHandler('pay2s-oauth-callback')
    const out = await callback(new Request(`https://x/cb?code=bad-code&state=${state}&iss=${encodeURIComponent('https://api.pay2s.vn')}`))
    expect(locationStatus(out)).toBe('invalid_grant')
    expect(fakeDb.table('pay2s_connections')).toHaveLength(0)
  })

  it('reports no_bank and revokes when the user shared no bank', async () => {
    banks = []
    const { cbRes } = await connectUser()
    expect(locationStatus(cbRes)).toBe('no_bank')
    expect(calls.revoked).toEqual(['refresh-1'])
    expect(fakeDb.table('pay2s_connections')).toHaveLength(0)
  })

  it('on reconnect deletes the old webhook and uses a fresh request_key', async () => {
    await connectUser()
    const firstKey = String(calls.createdWebhooks[0].request_key)
    await connectUser()
    expect(calls.deletedWebhooks).toHaveLength(1)
    expect(String(calls.createdWebhooks[1].request_key)).not.toBe(firstKey)
    expect(fakeDb.table('pay2s_connections')).toHaveLength(1)
  })
})

describe('pay2s-webhook', () => {
  async function signedRequest(connectionId: string, body: unknown, opts: { secret?: string; timestamp?: number } = {}) {
    const raw = JSON.stringify(body)
    const ts = String(opts.timestamp ?? Math.floor(Date.now() / 1000))
    const sig = await computeWebhookSignature(opts.secret ?? 'whsec-123', ts, raw)
    return new Request(`https://x/functions/v1/pay2s-webhook?c=${connectionId}`, {
      method: 'POST',
      headers: { 'X-Pay2S-Timestamp': ts, 'X-Pay2S-Signature': sig, 'Content-Type': 'application/json' },
      body: raw,
    })
  }

  const tx = (over: Record<string, unknown> = {}) => ({
    id: 10001,
    gateway: 'ACB',
    transactionDate: '2026-10-13 09:00:00',
    accountNumber: '0123456789',
    content: 'FPAB12CD34EF tra no',
    transferType: 'IN',
    transferAmount: 150000,
    ...over,
  })

  async function setup() {
    await connectUser()
    return fakeDb.table('pay2s_connections')[0].id as string
  }

  it('stores a signed delivery and ACKs with {"success":true}', async () => {
    const id = await setup()
    const handler = await loadHandler('pay2s-webhook')
    const res = await handler(await signedRequest(id, { transactions: [tx()] }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })

    const rows = fakeDb.table('pay2s_bank_transactions')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      user_id: 'user-A',
      pay2s_tx_id: '10001',
      amount: 150000,
      direction: 'IN',
      payment_code: 'FPAB12CD34EF',
      tx_time: '2026-10-13T02:00:00.000Z',
    })
    expect(fakeDb.table('pay2s_connections')[0].last_event_at).toBeTruthy()
  })

  it('is idempotent on redelivery', async () => {
    const id = await setup()
    const handler = await loadHandler('pay2s-webhook')
    await handler(await signedRequest(id, { transactions: [tx()] }))
    const again = await handler(await signedRequest(id, { transactions: [tx(), tx({ id: 10002 })] }))
    expect(again.status).toBe(200)
    expect(fakeDb.table('pay2s_bank_transactions').map((r) => r.pay2s_tx_id)).toEqual(['10001', '10002'])
  })

  it('rejects a bad signature, a wrong secret and a stale timestamp', async () => {
    const id = await setup()
    const handler = await loadHandler('pay2s-webhook')
    expect((await handler(await signedRequest(id, { transactions: [tx()] }, { secret: 'other' }))).status).toBe(401)
    expect((await handler(await signedRequest(id, { transactions: [tx()] }, { timestamp: Math.floor(Date.now() / 1000) - 600 }))).status).toBe(401)
    const unsigned = await handler(new Request(`https://x/w?c=${id}`, { method: 'POST', body: '{"transactions":[]}' }))
    expect(unsigned.status).toBe(401)
    expect(fakeDb.table('pay2s_bank_transactions')).toHaveLength(0)
  })

  it('returns 404 for an unknown or malformed connection id and 405 for non-POST', async () => {
    const handler = await loadHandler('pay2s-webhook')
    expect((await handler(await signedRequest('11111111-1111-1111-1111-111111111111', { transactions: [] }))).status).toBe(404)
    expect((await handler(new Request('https://x/w?c=not-a-uuid', { method: 'POST', body: '{}' }))).status).toBe(404)
    expect((await handler(new Request('https://x/w', { method: 'GET' }))).status).toBe(405)
  })

  it('suggests (never settles) a match when the FP code belongs to an open order of this payee', async () => {
    const id = await setup()
    fakeDb.table('sepay_payment_orders').push({ id: 'order-1', order_invoice_number: 'FPAB12CD34EF', payee_user_id: 'user-A', status: 'PENDING' })
    fakeDb.table('expense_splits').push({ id: 's1', is_settled: false })
    const handler = await loadHandler('pay2s-webhook')
    await handler(await signedRequest(id, { transactions: [tx()] }))

    expect(fakeDb.table('pay2s_bank_transactions')[0]).toMatchObject({
      match_status: 'suggested',
      matched_source_type: 'sepay_order',
      matched_source_id: 'order-1',
    })
    expect(fakeDb.table('sepay_payment_orders')[0].status).toBe('PENDING')
    expect(fakeDb.table('expense_splits')[0].is_settled).toBe(false)
  })

  it('does not suggest for another payee, a closed order, or an OUT transfer', async () => {
    const id = await setup()
    fakeDb.table('sepay_payment_orders').push(
      { id: 'o-other', order_invoice_number: 'FPAB12CD34EF', payee_user_id: 'user-B', status: 'PENDING' },
      { id: 'o-closed', order_invoice_number: 'FPZZ99YY88XX', payee_user_id: 'user-A', status: 'PAID' },
      { id: 'o-open', order_invoice_number: 'FPQQ11WW22EE', payee_user_id: 'user-A', status: 'PENDING' },
    )
    const handler = await loadHandler('pay2s-webhook')
    await handler(
      await signedRequest(id, {
        transactions: [
          tx({ id: 1 }),
          tx({ id: 2, content: 'FPZZ99YY88XX' }),
          tx({ id: 3, content: 'FPQQ11WW22EE', transferType: 'OUT' }),
        ],
      }),
    )
    expect(fakeDb.table('pay2s_bank_transactions').map((r) => r.match_status ?? 'unmatched')).toEqual(['unmatched', 'unmatched', 'unmatched']) // DB default is 'unmatched'
  })

  it('does not accept deliveries for a revoked connection', async () => {
    const id = await setup()
    fakeDb.table('pay2s_connections')[0].status = 'revoked'
    const handler = await loadHandler('pay2s-webhook')
    expect((await handler(await signedRequest(id, { transactions: [tx()] }))).status).toBe(404)
  })
})

describe('token refresh + disconnect', () => {
  async function expireAccessToken() {
    const secrets = fakeDb.table('pay2s_connection_secrets')[0]
    secrets.access_expires_at = new Date(Date.now() - 1000).toISOString()
  }

  it('refreshes only once under concurrent callers and rotates both tokens in one write', async () => {
    await connectUser()
    await expireAccessToken()
    const connectionId = fakeDb.table('pay2s_connections')[0].id as string

    const { createServiceClient, getValidAccessToken, loadPay2SEnv } = await import('../../supabase/functions/_shared/pay2s-server')
    const loaded = loadPay2SEnv()
    if (!('env' in loaded)) throw new Error('env missing')
    const service = createServiceClient(loaded.env)

    const [a, b, c] = await Promise.all([
      getValidAccessToken(service, loaded.env, connectionId),
      getValidAccessToken(service, loaded.env, connectionId),
      getValidAccessToken(service, loaded.env, connectionId),
    ])
    expect(calls.tokenGrants.filter((g) => g === 'refresh_token')).toHaveLength(1)
    expect([a, b, c]).toEqual(['access-r1', 'access-r1', 'access-r1'])

    const secrets = fakeDb.table('pay2s_connection_secrets')[0]
    expect(await decryptSecret(secrets.refresh_token_enc as string, ENC_KEY)).toBe('refresh-r1')
    expect(secrets.refresh_lease_until).toBeNull()
  })

  it('marks the connection expired when the refresh token is rejected', async () => {
    await connectUser()
    await expireAccessToken()
    const connectionId = fakeDb.table('pay2s_connections')[0].id as string
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })),
    )
    const { createServiceClient, getValidAccessToken, loadPay2SEnv, Pay2SConnectionError } = await import('../../supabase/functions/_shared/pay2s-server')
    const loaded = loadPay2SEnv()
    if (!('env' in loaded)) throw new Error('env missing')
    await expect(getValidAccessToken(createServiceClient(loaded.env), loaded.env, connectionId)).rejects.toBeInstanceOf(Pay2SConnectionError)
    expect(fakeDb.table('pay2s_connections')[0].status).toBe('expired')
  })

  it('disconnect deletes the webhook, revokes the token, wipes secrets and marks the connection revoked', async () => {
    await connectUser()
    await expireAccessToken()
    const disconnect = await loadHandler('pay2s-disconnect')
    const res = await disconnect(new Request('https://x/d', { method: 'POST', headers: { Authorization: 'Bearer user-A' } }))
    expect(res.status).toBe(200)
    expect(calls.deletedWebhooks).toHaveLength(1)
    expect(calls.revoked).toEqual(['refresh-r1'])
    expect(fakeDb.table('pay2s_connection_secrets')).toHaveLength(0)
    expect(fakeDb.table('pay2s_connections')[0]).toMatchObject({ status: 'revoked', webhook_id: null })
  })

  it('disconnect still finalizes locally when Pay2S is unreachable', async () => {
    await connectUser()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    const disconnect = await loadHandler('pay2s-disconnect')
    const res = await disconnect(new Request('https://x/d', { method: 'POST', headers: { Authorization: 'Bearer user-A' } }))
    expect(res.status).toBe(200)
    expect(fakeDb.table('pay2s_connection_secrets')).toHaveLength(0)
    expect(fakeDb.table('pay2s_connections')[0].status).toBe('revoked')
  })

  it('disconnect requires authentication', async () => {
    const disconnect = await loadHandler('pay2s-disconnect')
    expect((await disconnect(new Request('https://x/d', { method: 'POST' }))).status).toBe(401)
  })
})
