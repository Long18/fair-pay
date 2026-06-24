import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { okJson, errJson, parseBody, requireAuth } from '../response.ts'
import { ConfirmRequest } from '../contracts.ts'

// Confirm is called only by the FairPay UI click handler, never by the model.
// It binds the actor to the preview via a one-time agent_confirmations row.
export async function handleConfirm(
  supabase: SupabaseClient,
  req: Request,
  previewId: string
): Promise<Response> {
  const auth = await requireAuth(supabase)
  if (auth.error) return auth.error

  const body = await parseBody(req)
  if (body.error) return body.error

  const parsed = ConfirmRequest.safeParse(body.value)
  if (!parsed.success) {
    return errJson(422, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.issues)
  }

  const { preview_hash } = parsed.data

  const { data, error: confirmationError } = await supabase.rpc('confirm_agent_preview', {
    p_preview_id: previewId,
    p_preview_hash: preview_hash,
  })
  if (confirmationError || !data) {
    const message = confirmationError?.message ?? 'Confirmation failed'
    if (message.includes('PREVIEW_EXPIRED')) {
      await supabase.rpc('mark_agent_operation_terminal', {
        p_preview_id: previewId,
        p_status: 'expired',
        p_error_code: 'PREVIEW_EXPIRED',
        p_error_message: 'Preview expired before confirmation',
      })
      return errJson(410, 'PREVIEW_EXPIRED', message)
    }
    if (message.includes('PREVIEW_CONSUMED') || message.includes('CONFIRMATION_USED')) return errJson(409, 'PREVIEW_CONSUMED', message)
    if (message.includes('HASH_MISMATCH')) return errJson(422, 'HASH_MISMATCH', message)
    if (message.includes('PREVIEW_NOT_FOUND')) return errJson(404, 'PREVIEW_NOT_FOUND', message)
    return errJson(422, 'CONFIRMATION_FAILED', message)
  }
  return okJson(data)
}
