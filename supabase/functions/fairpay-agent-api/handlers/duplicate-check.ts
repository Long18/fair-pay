import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { okJson, errJson, parseBody, requireAuth } from '../response.ts'
import { DuplicateCheckRequest } from '../contracts.ts'
import { findDuplicates, enrichDuplicateMatches, DuplicateCandidate } from '../domain/duplicate.ts'

export async function handleDuplicateCheck(
  supabase: SupabaseClient,
  req: Request
): Promise<Response> {
  const auth = await requireAuth(supabase)
  if (auth.error) return auth.error

  const body = await parseBody(req)
  if (body.error) return body.error

  const parsed = DuplicateCheckRequest.safeParse(body.value)
  if (!parsed.success) {
    return errJson(422, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.issues)
  }

  const { group_id, description, amount, payer_member_id, expense_date, window_hours } = parsed.data

  // Resolve payer_member_id → payer user_id and verify group membership in parallel
  const [payerRes, actorRes] = await Promise.all([
    supabase
      .from('group_members')
      .select('user_id, group_id')
      .eq('id', payer_member_id)
      .single(),
    supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group_id)
      .eq('user_id', auth.user.id)
      .single(),
  ])

  if (!payerRes.data || payerRes.data.group_id !== group_id) {
    return errJson(422, 'INVALID_PAYER_MEMBER', 'payer_member_id is not a member of this group')
  }
  if (!actorRes.data) {
    return errJson(403, 'NOT_GROUP_MEMBER', 'You are not a member of this group')
  }

  const windowH = window_hours ?? 24
  const since = new Date(Date.now() - windowH * 60 * 60 * 1000).toISOString()

  const { data: candidates, error: qErr } = await supabase
    .from('expenses')
    .select('id, description, amount, paid_by_user_id, expense_date, created_at')
    .eq('group_id', group_id)
    .eq('is_payment', false)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50)

  if (qErr) return errJson(500, 'QUERY_ERROR', qErr.message)

  const cs = (candidates ?? []) as DuplicateCandidate[]
  const matches = findDuplicates(cs, {
    description,
    amount,
    payer_user_id: payerRes.data.user_id,
    expense_date,
    window_hours: windowH,
  })

  return okJson({ matches: enrichDuplicateMatches(matches, cs) })
}
