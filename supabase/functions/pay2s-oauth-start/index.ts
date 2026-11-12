/**
 * pay2s-oauth-start
 *
 * Authenticated (Supabase JWT). Creates a one-time `state` + PKCE verifier,
 * stores them server-side, and returns the Pay2S authorize URL. The browser
 * then navigates to that URL (a redirect, not an AJAX call).
 */

import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts'
import {
  OAUTH_STATE_TTL_SECONDS,
  buildAuthorizeUrl,
  encryptSecret,
  generatePkcePair,
  generateState,
  jsonResponse,
  sha256Hex,
} from '../_shared/pay2s.ts'
import { authenticateUser, createServiceClient, loadPay2SEnv } from '../_shared/pay2s-server.ts'

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflightIfNeeded(req)
  if (preflight) return preflight
  const cors = getCorsHeaders()

  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, cors)

  const loaded = loadPay2SEnv()
  if ('missing' in loaded) {
    console.error('pay2s-oauth-start: missing env', loaded.missing)
    return jsonResponse({ error: 'pay2s_not_configured' }, 503, cors)
  }
  const { env } = loaded

  const user = await authenticateUser(req, env)
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, cors)

  try {
    const service = createServiceClient(env)
    const state = generateState()
    const { verifier, challenge } = await generatePkcePair()

    // Opportunistic cleanup of this user's stale/consumed states.
    await service
      .from('pay2s_oauth_states')
      .delete()
      .eq('user_id', user.id)
      .or(`expires_at.lt.${new Date().toISOString()},consumed_at.not.is.null`)

    const { error } = await service.from('pay2s_oauth_states').insert({
      state_hash: await sha256Hex(state),
      user_id: user.id,
      code_verifier_enc: await encryptSecret(verifier, env.encryptionKey),
      expires_at: new Date(Date.now() + OAUTH_STATE_TTL_SECONDS * 1000).toISOString(),
    })
    if (error) throw error

    const url = buildAuthorizeUrl({
      apiBase: env.apiBase,
      clientId: env.clientId,
      redirectUri: env.redirectUri,
      state,
      codeChallenge: challenge,
    })
    return jsonResponse({ url }, 200, cors)
  } catch (err) {
    console.error('pay2s-oauth-start failed:', err instanceof Error ? err.message : 'unknown')
    return jsonResponse({ error: 'internal_error' }, 500, cors)
  }
})
