/**
 * pay2s-disconnect
 *
 * Authenticated. Best-effort remote cleanup (delete webhook, revoke token) and
 * ALWAYS finalizes locally: secrets are deleted and the connection is marked
 * revoked, even if Pay2S is unreachable or the token already expired.
 */

import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts'
import { decryptSecret, jsonResponse } from '../_shared/pay2s.ts'
import {
  authenticateUser,
  createPay2SApi,
  createServiceClient,
  getValidAccessToken,
  loadPay2SEnv,
} from '../_shared/pay2s-server.ts'

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflightIfNeeded(req)
  if (preflight) return preflight
  const cors = getCorsHeaders()

  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, cors)

  const loaded = loadPay2SEnv()
  if ('missing' in loaded) {
    console.error('pay2s-disconnect: missing env', loaded.missing)
    return jsonResponse({ error: 'pay2s_not_configured' }, 503, cors)
  }
  const { env } = loaded

  const user = await authenticateUser(req, env)
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, cors)

  const service = createServiceClient(env)
  const { data: connection } = await service
    .from('pay2s_connections')
    .select('id, status, webhook_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!connection) return jsonResponse({ ok: true }, 200, cors)

  const api = createPay2SApi(env)
  const remote: Record<string, string> = {}

  try {
    if (connection.status === 'active' && connection.webhook_id) {
      const accessToken = await getValidAccessToken(service, env, connection.id as string)
      await api.deleteWebhook(accessToken, connection.webhook_id as string)
      remote.webhook = 'deleted'
    }
  } catch (err) {
    remote.webhook = err instanceof Error ? err.message.slice(0, 80) : 'failed'
  }

  try {
    const { data: secrets } = await service
      .from('pay2s_connection_secrets')
      .select('refresh_token_enc')
      .eq('connection_id', connection.id)
      .maybeSingle()
    if (secrets?.refresh_token_enc) {
      await api.revoke(await decryptSecret(secrets.refresh_token_enc, env.encryptionKey))
      remote.revoke = 'ok'
    }
  } catch (err) {
    remote.revoke = err instanceof Error ? err.message.slice(0, 80) : 'failed'
  }

  await service.from('pay2s_connection_secrets').delete().eq('connection_id', connection.id)
  await service
    .from('pay2s_connections')
    .update({ status: 'revoked', webhook_id: null, last_error: null })
    .eq('id', connection.id)

  return jsonResponse({ ok: true, remote }, 200, cors)
})
