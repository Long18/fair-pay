/**
 * Server-side glue for the pay2s-* Edge Functions: env loading, clients, and a
 * token manager that serializes refresh (Pay2S refresh tokens rotate and reuse
 * revokes the whole connection).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  Pay2SApiError,
  createPay2SClient,
  decryptSecret,
  encryptSecret,
} from './pay2s.ts'

export interface Pay2SEnv {
  supabaseUrl: string
  serviceKey: string
  anonKey: string
  clientId: string
  clientSecret: string
  redirectUri: string
  encryptionKey: string
  apiBase: string | undefined
  /** Expected `iss` on the callback; override only for a local mock server. */
  issuer: string | undefined
  appUrl: string
  /** Public base URL Pay2S can reach for webhooks (must be HTTPS). */
  webhookBaseUrl: string
}

export function loadPay2SEnv(): { env: Pay2SEnv } | { missing: string[] } {
  const get = (k: string) => Deno.env.get(k) || ''
  const required = {
    SUPABASE_URL: get('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: get('SUPABASE_SERVICE_ROLE_KEY'),
    SUPABASE_ANON_KEY: get('SUPABASE_ANON_KEY'),
    PAY2S_CLIENT_ID: get('PAY2S_CLIENT_ID'),
    PAY2S_CLIENT_SECRET: get('PAY2S_CLIENT_SECRET'),
    PAY2S_REDIRECT_URI: get('PAY2S_REDIRECT_URI'),
    PAY2S_TOKEN_ENCRYPTION_KEY: get('PAY2S_TOKEN_ENCRYPTION_KEY'),
    APP_URL: get('APP_URL'),
  }
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k)
  if (missing.length) return { missing }

  const supabaseUrl = required.SUPABASE_URL.replace(/\/$/, '')
  return {
    env: {
      supabaseUrl,
      serviceKey: required.SUPABASE_SERVICE_ROLE_KEY,
      anonKey: required.SUPABASE_ANON_KEY,
      clientId: required.PAY2S_CLIENT_ID,
      clientSecret: required.PAY2S_CLIENT_SECRET,
      redirectUri: required.PAY2S_REDIRECT_URI,
      encryptionKey: required.PAY2S_TOKEN_ENCRYPTION_KEY,
      apiBase: get('PAY2S_API_BASE') || undefined,
      issuer: get('PAY2S_ISSUER') || undefined,
      appUrl: required.APP_URL.replace(/\/$/, ''),
      webhookBaseUrl: (get('PAY2S_WEBHOOK_BASE_URL') || `${supabaseUrl}/functions/v1`).replace(/\/$/, ''),
    },
  }
}

export function createServiceClient(env: Pay2SEnv) {
  return createClient(env.supabaseUrl, env.serviceKey, { auth: { persistSession: false } })
}

export function createPay2SApi(env: Pay2SEnv) {
  return createPay2SClient({ apiBase: env.apiBase, clientId: env.clientId, clientSecret: env.clientSecret })
}

/** Resolve the calling user from the request's JWT (never trust a body user id). */
export async function authenticateUser(req: Request, env: Pay2SEnv): Promise<{ id: string } | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const userClient = createClient(env.supabaseUrl, env.anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const { data, error } = await userClient.auth.getUser()
  if (error || !data?.user) return null
  return { id: data.user.id }
}

type ServiceClient = ReturnType<typeof createServiceClient>

const ACCESS_TOKEN_SAFETY_MS = 60_000
const ACCESS_TOKEN_DEFAULT_TTL_S = 900
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const CONNECTION_TTL_MS = 90 * 24 * 60 * 60 * 1000

export class Pay2SConnectionError extends Error {
  code: 'connection_expired' | 'refresh_in_progress' | 'secrets_missing' | 'upstream_error'
  constructor(code: Pay2SConnectionError['code'], message?: string) {
    super(message ?? code)
    this.name = 'Pay2SConnectionError'
    this.code = code
  }
}

export async function saveTokenPair(
  service: ServiceClient,
  env: Pay2SEnv,
  connectionId: string,
  token: { access_token: string; refresh_token: string; expires_in?: number },
  extra: Record<string, unknown> = {},
) {
  const now = Date.now()
  const { error } = await service.from('pay2s_connection_secrets').upsert(
    {
      connection_id: connectionId,
      access_token_enc: await encryptSecret(token.access_token, env.encryptionKey),
      refresh_token_enc: await encryptSecret(token.refresh_token, env.encryptionKey),
      access_expires_at: new Date(now + (token.expires_in ?? ACCESS_TOKEN_DEFAULT_TTL_S) * 1000).toISOString(),
      refresh_expires_at: new Date(now + REFRESH_TOKEN_TTL_MS).toISOString(),
      refresh_lease_until: null,
      ...extra,
    },
    { onConflict: 'connection_id' },
  )
  if (error) throw new Error(`Failed to save Pay2S tokens: ${error.message}`)
}

async function loadSecrets(service: ServiceClient, connectionId: string) {
  const { data, error } = await service
    .from('pay2s_connection_secrets')
    .select('access_token_enc, refresh_token_enc, access_expires_at, refresh_expires_at')
    .eq('connection_id', connectionId)
    .maybeSingle()
  if (error) throw new Pay2SConnectionError('upstream_error', error.message)
  if (!data) throw new Pay2SConnectionError('secrets_missing')
  return data as {
    access_token_enc: string | null
    refresh_token_enc: string | null
    access_expires_at: string | null
    refresh_expires_at: string | null
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Return a usable access token, refreshing at most once at a time per
 * connection. If another request holds the refresh lease we wait briefly for it
 * to publish the new pair instead of refreshing in parallel.
 */
export async function getValidAccessToken(
  service: ServiceClient,
  env: Pay2SEnv,
  connectionId: string,
): Promise<string> {
  const api = createPay2SApi(env)

  let secrets = await loadSecrets(service, connectionId)
  const isFresh = (s: typeof secrets) =>
    !!s.access_token_enc && !!s.access_expires_at && new Date(s.access_expires_at).getTime() - Date.now() > ACCESS_TOKEN_SAFETY_MS
  if (isFresh(secrets)) return await decryptSecret(secrets.access_token_enc!, env.encryptionKey)

  const { data: acquired, error: leaseError } = await service.rpc('pay2s_try_acquire_refresh_lease', {
    p_connection_id: connectionId,
    p_lease_seconds: 30,
  })
  if (leaseError) throw new Pay2SConnectionError('upstream_error', leaseError.message)

  if (!acquired) {
    for (let i = 0; i < 10; i++) {
      await sleep(500)
      secrets = await loadSecrets(service, connectionId)
      if (isFresh(secrets)) return await decryptSecret(secrets.access_token_enc!, env.encryptionKey)
    }
    throw new Pay2SConnectionError('refresh_in_progress')
  }

  // We hold the lease; re-read in case a concurrent refresh just finished.
  secrets = await loadSecrets(service, connectionId)
  if (isFresh(secrets)) {
    await service.from('pay2s_connection_secrets').update({ refresh_lease_until: null }).eq('connection_id', connectionId)
    return await decryptSecret(secrets.access_token_enc!, env.encryptionKey)
  }

  const refreshExpired = secrets.refresh_expires_at && new Date(secrets.refresh_expires_at).getTime() <= Date.now()
  if (!secrets.refresh_token_enc || refreshExpired) {
    await markConnection(service, connectionId, 'expired', 'refresh_token_expired')
    throw new Pay2SConnectionError('connection_expired')
  }

  try {
    const refreshToken = await decryptSecret(secrets.refresh_token_enc, env.encryptionKey)
    const token = await api.refresh(refreshToken)
    // Persist both tokens in ONE write; the old refresh token is now consumed.
    await saveTokenPair(service, env, connectionId, token)
    return token.access_token
  } catch (err) {
    if (err instanceof Pay2SApiError && (err.code === 'invalid_grant' || err.code === 'invalid_token' || err.status === 401)) {
      await markConnection(service, connectionId, 'expired', err.code)
      throw new Pay2SConnectionError('connection_expired')
    }
    // Outcome unknown (timeout / 5xx): do NOT retry with the old refresh token.
    // The lease expires on its own; surface the failure.
    await service
      .from('pay2s_connections')
      .update({ last_error: err instanceof Error ? err.message.slice(0, 200) : 'refresh_failed' })
      .eq('id', connectionId)
    throw new Pay2SConnectionError('upstream_error', err instanceof Error ? err.message : 'refresh failed')
  }
}

export async function markConnection(
  service: ServiceClient,
  connectionId: string,
  status: 'active' | 'expired' | 'revoked' | 'error',
  lastError: string | null = null,
) {
  await service.from('pay2s_connections').update({ status, last_error: lastError }).eq('id', connectionId)
}
