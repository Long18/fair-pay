import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { okJson, errJson } from '../response.ts'

export async function handleGetOperation(
  supabase: SupabaseClient,
  previewId: string
): Promise<Response> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return errJson(401, 'UNAUTHENTICATED', 'Not authenticated')

  const { data, error: qErr } = await supabase
    .from('agent_operations')
    .select('id, preview_id, status, result, error, created_at, updated_at')
    .eq('preview_id', previewId)
    .eq('user_id', user.id)  // ownership enforced at query level + RLS
    .single()

  if (qErr || !data) return errJson(404, 'OPERATION_NOT_FOUND', 'Operation not found')

  if (data.status === 'previewed' || data.status === 'confirmed') {
    const { data: preview } = await supabase
      .from('agent_previews')
      .select('expires_at, is_consumed')
      .eq('id', previewId)
      .single()
    if (preview && !preview.is_consumed && new Date(preview.expires_at).getTime() <= Date.now()) {
      await supabase.rpc('mark_agent_operation_terminal', {
        p_preview_id: previewId,
        p_status: 'expired',
        p_error_code: 'PREVIEW_EXPIRED',
        p_error_message: 'Preview expired without commit',
      })
      data.status = 'expired'
      data.error = { code: 'PREVIEW_EXPIRED', message: 'Preview expired without commit' }
      data.updated_at = new Date().toISOString()
    }
  }

  return okJson({
    operation_id: data.id,
    preview_id: data.preview_id,
    status: data.status,
    result: data.result,
    error: data.error,
    created_at: data.created_at,
    updated_at: data.updated_at,
  })
}
