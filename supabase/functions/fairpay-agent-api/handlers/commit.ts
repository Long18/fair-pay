import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { okJson, errJson, parseBody, requireAuth } from '../response.ts'
import { CommitRequest } from '../contracts.ts'
import { sha256Hex } from '../domain/preview-hash.ts'

// Commit is called only by the FairPay UI controller after the user confirms.
// The model's tool list MUST NOT include commit.
//
// Idempotency-Key header is required: identical key + same user replays the
// same response without re-executing side effects.
export async function handleCommit(
  supabase: SupabaseClient,
  req: Request
): Promise<Response> {
  const auth = await requireAuth(supabase)
  if (auth.error) return auth.error

  const idempotencyKey = req.headers.get('idempotency-key')
  if (!idempotencyKey || idempotencyKey.trim().length === 0 || idempotencyKey.length > 200) {
    return errJson(400, 'MISSING_IDEMPOTENCY_KEY', 'Idempotency-Key header is required')
  }

  const body = await parseBody(req)
  if (body.error) return body.error

  const parsed = CommitRequest.safeParse(body.value)
  if (!parsed.success) {
    return errJson(422, 'VALIDATION_ERROR', 'Invalid request body — only preview_id, preview_hash, and confirmation_id are accepted', parsed.error.issues)
  }

  const { preview_id, preview_hash, confirmation_id } = parsed.data
  const idempotencyKeyHash = await sha256Hex(idempotencyKey.trim())

  const { data, error: rpcErr } = await supabase.rpc('commit_agent_expense', {
    p_preview_id: preview_id,
    p_preview_hash: preview_hash,
    p_confirmation_id: confirmation_id,
    p_idempotency_key: idempotencyKeyHash,
  })

  if (rpcErr) {
    const msg = rpcErr.message ?? 'Commit failed'
    const fail = async (status: number, code: string, terminalStatus: 'failed' | 'expired' = 'failed') => {
      await supabase.rpc('mark_agent_operation_terminal', {
        p_preview_id: preview_id,
        p_status: terminalStatus,
        p_error_code: code,
        p_error_message: msg,
      })
      return errJson(status, code, msg)
    }
    if (msg.includes('PREVIEW_EXPIRED')) return fail(410, 'PREVIEW_EXPIRED', 'expired')
    if (msg.includes('GROUP_NOT_ACCESSIBLE')) return fail(403, 'GROUP_NOT_ACCESSIBLE')
    if (msg.includes('DUPLICATE_EXPENSE')) return fail(409, 'DUPLICATE_DETECTED')
    if (msg.includes('PARTICIPANT_CHANGED') || msg.includes('PAYER_CHANGED')) return fail(422, 'MEMBER_CHANGED')
    if (msg.includes('HASH_MISMATCH')) return fail(422, 'HASH_MISMATCH')
    if (msg.includes('PREVIEW_CONSUMED')) return fail(409, 'PREVIEW_CONSUMED')
    if (msg.includes('CONFIRMATION_USED')) return fail(409, 'CONFIRMATION_USED')
    if (msg.includes('IDEMPOTENCY_KEY_REUSED')) return fail(409, 'IDEMPOTENCY_KEY_REUSED')
    if (msg.includes('NOT_FOUND')) return fail(404, 'NOT_FOUND')
    return fail(422, 'COMMIT_FAILED')
  }

  return okJson(data)
}
