import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { okJson, errJson, parseBody, requireAuth } from '../response.ts'
import { PreviewRequest } from '../contracts.ts'
import {
  allocateEqual, allocateExact, allocateFixedThenEqualRemainder,
  ExactParticipantInput,
  SplitError,
} from '../domain/split.ts'
import { assertVnd, assertPayerIsCurrentMember, assertAllParticipantsAreCurrentMembers, PolicyViolation } from '../domain/policy.ts'
import { hashPreview } from '../domain/preview-hash.ts'
import { findDuplicates, enrichDuplicateMatches, DuplicateCandidate } from '../domain/duplicate.ts'
import { resolveGroup } from '../services/group-resolver.ts'
import { loadGroupMembers, indexById } from '../services/member-resolver.ts'

export async function handlePreview(
  supabase: SupabaseClient,
  req: Request
): Promise<Response> {
  const auth = await requireAuth(supabase)
  if (auth.error) return auth.error

  const body = await parseBody(req)
  if (body.error) return body.error

  const parsed = PreviewRequest.safeParse(body.value)
  if (!parsed.success) {
    return errJson(422, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.issues)
  }

  const req_data = parsed.data

  try {
    assertVnd(req_data.currency)
  } catch (e) {
    if (e instanceof PolicyViolation) return errJson(422, e.code, e.message)
    throw e
  }

  // Load group and members in parallel via shared services
  const [groupResult, membersResult] = await Promise.all([
    resolveGroup(supabase, req_data.group_id),
    loadGroupMembers(supabase, req_data.group_id, auth.user.id),
  ])

  if (groupResult.error) return groupResult.error
  if (membersResult.error) return membersResult.error

  const group = groupResult.group
  const members = membersResult.members
  const memberById = indexById(members)

  // Build the raw member shape the policy assertions expect
  const policyMembers = members.map((m) => ({ id: m.member_id, user_id: m.user_id }))

  try {
    assertPayerIsCurrentMember(req_data.payer_member_id, policyMembers)
    assertAllParticipantsAreCurrentMembers(
      req_data.participants.map((p) => p.member_id),
      policyMembers
    )
  } catch (e) {
    if (e instanceof PolicyViolation) return errJson(422, e.code, e.message)
    throw e
  }

  const payerMember = memberById[req_data.payer_member_id]

  // Compute splits (domain logic)
  let allocations: Array<{ member_id: string; user_id: string; amount: number }>
  try {
    const participants = req_data.participants.map((p) => ({
      member_id: p.member_id,
      user_id: memberById[p.member_id]?.user_id ?? '',
      amount: p.amount,
      fixed_amount: p.fixed_amount,
    })).sort((a, b) => a.member_id.localeCompare(b.member_id))

    switch (req_data.split_method) {
      case 'equal':
        allocations = allocateEqual(req_data.amount, participants)
        break
      case 'exact': {
        const exactParticipants: ExactParticipantInput[] = participants.map((p) => {
          if (p.amount === undefined) {
            throw new SplitError('MISSING_EXACT_AMOUNT', `Participant ${p.member_id} missing 'amount' for exact split`)
          }
          return { member_id: p.member_id, user_id: p.user_id, amount: p.amount }
        })
        allocations = allocateExact(req_data.amount, exactParticipants)
        break
      }
      case 'fixed_then_equal_remainder':
        allocations = allocateFixedThenEqualRemainder(req_data.amount, participants)
        break
    }
  } catch (e) {
    if (e instanceof SplitError) return errJson(422, e.code, e.message)
    throw e
  }

  const splits = allocations.map((a) => ({
    member_id: a.member_id,
    user_id: a.user_id,
    full_name: memberById[a.member_id]?.full_name ?? '',
    amount: a.amount,
  }))

  const totalCheck = splits.reduce((s, x) => s + x.amount, 0)
  const expenseDate = req_data.expense_date ?? new Date().toISOString().split('T')[0]

  // Inline duplicate check (non-blocking; uses shared enrichment helper)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: candidates } = await supabase
    .from('expenses')
    .select('id, description, amount, paid_by_user_id, expense_date, created_at')
    .eq('group_id', req_data.group_id)
    .eq('is_payment', false)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50)

  const cs = (candidates ?? []) as DuplicateCandidate[]
  const rawMatches = findDuplicates(cs, {
    description: req_data.description,
    amount: req_data.amount,
    payer_user_id: payerMember.user_id,
    expense_date: expenseDate,
  })
  const duplicateWarnings = enrichDuplicateMatches(rawMatches, cs)

  // Build canonical preview object
  const canonicalPreview = {
    group_id: req_data.group_id,
    group_name: group.name,
    description: req_data.description,
    total_amount: req_data.amount,
    currency: 'VND',
    category: req_data.category ?? null,
    expense_date: expenseDate,
    comment: req_data.comment ?? null,
    payer_user_id: payerMember.user_id,
    payer_member_id: req_data.payer_member_id,
    actor_user_id: auth.user.id,
    requested_split_method: req_data.split_method,
    splits: splits.map((s) => ({ member_id: s.member_id, user_id: s.user_id, amount: s.amount })),
  }

  const previewHash = await hashPreview(canonicalPreview)
  const source = req.headers.get('x-fairpay-agent-source') === 'internal_mcp'
    ? 'internal_mcp'
    : 'internal_fairpay_agent'

  const { data: previewRecord, error: previewError } = await supabase.rpc(
    'create_agent_expense_preview',
    {
      p_group_id: req_data.group_id,
      p_preview_data: canonicalPreview,
      p_preview_hash: previewHash,
      p_metadata: {
        source,
        api_version: 'v1',
        requested_split_method: req_data.split_method,
      },
    }
  )
  if (previewError || !previewRecord) {
    if (previewError?.message.includes('RATE_LIMIT_EXCEEDED')) {
      return errJson(429, 'RATE_LIMIT_EXCEEDED', 'Too many expense previews; retry in one minute')
    }
    return errJson(422, 'PREVIEW_CREATE_FAILED', previewError?.message ?? 'Failed to store preview')
  }

  return okJson({
    preview_id: previewRecord.preview_id,
    preview_hash: previewHash,
    operation_id: previewRecord.operation_id,
    expires_at: previewRecord.expires_at,
    preview: {
      group_id: req_data.group_id,
      group_name: group.name,
      description: req_data.description,
      amount: req_data.amount,
      currency: 'VND',
      category: req_data.category ?? null,
      expense_date: expenseDate,
      comment: req_data.comment ?? null,
      payer: {
        member_id: req_data.payer_member_id,
        user_id: payerMember.user_id,
        full_name: payerMember.full_name,
      },
      requested_split_method: req_data.split_method,
      splits,
      total_check: totalCheck,
    },
    duplicate_warnings: duplicateWarnings,
  })
}
