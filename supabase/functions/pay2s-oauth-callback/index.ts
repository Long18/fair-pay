/**
 * pay2s-oauth-callback
 *
 * Public GET endpoint (verify_jwt = false) registered as the app's single
 * HTTPS redirect URI. The user is identified ONLY through the one-time `state`
 * stored by pay2s-oauth-start. Always ends with a redirect back to the app.
 *
 * Never log `code`, tokens, or secrets.
 */

import {
  PAY2S_ISSUER,
  Pay2SApiError,
  buildWebhookRequestKey,
  decryptSecret,
  encryptSecret,
  isValidIssuer,
  sha256Hex,
} from '../_shared/pay2s.ts'
import {
  CONNECTION_TTL_MS,
  createPay2SApi,
  createServiceClient,
  getValidAccessToken,
  loadPay2SEnv,
  saveTokenPair,
} from '../_shared/pay2s-server.ts'

function redirect(appUrl: string, status: string): Response {
  const target = `${appUrl}/settings/pay2s?status=${encodeURIComponent(status)}`
  return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store' } })
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const loaded = loadPay2SEnv()
  if ('missing' in loaded) {
    console.error('pay2s-oauth-callback: missing env', loaded.missing)
    return new Response('Pay2S integration is not configured', { status: 503 })
  }
  const { env } = loaded

  const params = new URL(req.url).searchParams
  const code = params.get('code')
  const state = params.get('state')
  const iss = params.get('iss')
  const oauthError = params.get('error')

  if (!state) return redirect(env.appUrl, 'invalid_request')

  const service = createServiceClient(env)

  // Atomically consume the state (single use, must not be expired).
  const { data: stateRow, error: stateError } = await service
    .from('pay2s_oauth_states')
    .update({ consumed_at: new Date().toISOString() })
    .eq('state_hash', await sha256Hex(state))
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('user_id, code_verifier_enc')
    .maybeSingle()

  if (stateError || !stateRow) return redirect(env.appUrl, 'invalid_state')
  if (oauthError) return redirect(env.appUrl, oauthError === 'access_denied' ? 'denied' : 'error')
  if (!code) return redirect(env.appUrl, 'invalid_request')
  if (!isValidIssuer(iss, env.issuer ?? PAY2S_ISSUER)) return redirect(env.appUrl, 'invalid_issuer')

  const api = createPay2SApi(env)
  let connectionId: string | null = null

  try {
    const verifier = await decryptSecret(stateRow.code_verifier_enc, env.encryptionKey)
    const token = await api.exchangeCode({ code, redirectUri: env.redirectUri, codeVerifier: verifier })

    const banks = await api.listBankAccounts(token.access_token)
    if (banks.length === 0) {
      await api.revoke(token.refresh_token).catch(() => undefined)
      return redirect(env.appUrl, 'no_bank')
    }
    const bank = banks[0] // v1: first granted bank
    const maskedNumber = bank.accountNumber ? `•••${bank.accountNumber.slice(-4)}` : ''
    const bankLabel = [bank.shortBankName || bank.bankName, maskedNumber].filter(Boolean).join(' ')

    // Reconnect: best-effort removal of the previous webhook so it stops
    // delivering with a signing secret we are about to overwrite.
    const { data: previous } = await service
      .from('pay2s_connections')
      .select('id, status, webhook_id')
      .eq('user_id', stateRow.user_id)
      .maybeSingle()
    if (previous?.status === 'active' && previous.webhook_id) {
      try {
        const oldToken = await getValidAccessToken(service, env, previous.id as string)
        await api.deleteWebhook(oldToken, previous.webhook_id as string)
      } catch {
        // Old connection may already be expired/revoked; nothing more to do.
      }
    }

    const { data: connection, error: connError } = await service
      .from('pay2s_connections')
      .upsert(
        {
          user_id: stateRow.user_id,
          status: 'active',
          scope: token.scope ?? '',
          bank_id: bank.id,
          bank_label: bankLabel,
          webhook_id: null,
          connected_at: new Date().toISOString(),
          connection_expires_at: new Date(Date.now() + CONNECTION_TTL_MS).toISOString(),
          last_error: null,
        },
        { onConflict: 'user_id' },
      )
      .select('id')
      .single()
    if (connError || !connection) throw new Error('connection_upsert_failed')
    connectionId = connection.id as string

    await saveTokenPair(service, env, connectionId, token)

    const webhook = await api.createWebhook(token.access_token, {
      bankId: bank.id,
      url: `${env.webhookBaseUrl}/pay2s-webhook?c=${connectionId}`,
      requestKey: buildWebhookRequestKey(connectionId, bank.id, state.slice(0, 8)),
    })

    if (!webhook.signing_secret) {
      // Replayed request: Pay2S only shows the secret once and we do not have it.
      throw new Error('webhook_secret_missing')
    }

    await service
      .from('pay2s_connection_secrets')
      .update({ webhook_signing_secret_enc: await encryptSecret(webhook.signing_secret, env.encryptionKey) })
      .eq('connection_id', connectionId)
    await service.from('pay2s_connections').update({ webhook_id: webhook.id }).eq('id', connectionId)

    return redirect(env.appUrl, 'connected')
  } catch (err) {
    const reason =
      err instanceof Pay2SApiError ? err.code : err instanceof Error ? err.message : 'unknown'
    console.error('pay2s-oauth-callback failed:', reason)
    if (connectionId) {
      await service
        .from('pay2s_connections')
        .update({ status: 'error', last_error: reason.slice(0, 200) })
        .eq('id', connectionId)
    }
    const known = ['app_not_approved', 'personal_app_owner_only', 'active_plan_required', 'invalid_grant', 'webhook_secret_missing']
    return redirect(env.appUrl, known.includes(reason) ? reason : 'error')
  }
})
