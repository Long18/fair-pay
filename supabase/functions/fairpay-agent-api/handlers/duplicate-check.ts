import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { okJson, errJson, parseBody } from '../response.ts'
import { DuplicateCheckRequest } from '../contracts.ts'
import { findDuplicates } from '../domain/duplicate.ts'

export async function handleDuplicateCheck(
  supabase: SupabaseClient,
  req: Request
): Promise<Response> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return errJson(401, 'UNAUTHENTICATED', 'Not authenticated')

  const body = await parseBody(req)
  if (body.error) return body.error

  const parsed = DuplicateCheckRequest.safeParse(body.value)
  if (!parsed.success) {
    return errJson(422, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.issues)
  }

  const { group_id, description, amount, payer_member_id, expense_date, window_hours } = parsed.data

  // Resolve payer_member_id → payer user_id
  const { data: payerMember } = await supabase
    .from('group_members')
    .select('user_id, group_id')
    .eq('id', payer_member_id)
    .single()

  if (!payerMember || payerMember.group_id !== group_id) {
    return errJson(422, 'INVALID_PAYER_MEMBER', 'payer_member_id is not a member of this group')
  }

  // Actor must be a member
  const { data: actorMembership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group_id)
    .eq('user_id', user.id)
    .single()

  if (!actorMembership) {
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

  const matches = findDuplicates(candidates ?? [], {
    description,
    amount,
    payer_user_id: payerMember.user_id,
    expense_date,
    window_hours: windowH,
  })

  // Enrich matches with description/amount from candidates
  type CandidateRow = {
    id: string
    description: string
    amount: number
    paid_by_user_id: string
    expense_date: string
    created_at: string
  }
  const cs = (candidates ?? []) as CandidateRow[]
  const candidateMap = Object.fromEntries(cs.map((c) => [c.id, c]))
  const enriched = matches.map((m) => {
    const c = candidateMap[m.expense_id] ?? {}
    return {
      expense_id: m.expense_id,
      match_type: m.match_type,
      reason: m.reason,
      description: c.description ?? '',
      amount: c.amount ?? 0,
      expense_date: c.expense_date ?? '',
      created_at: c.created_at ?? '',
    }
  })

  return okJson({ matches: enriched })
}
