// Pure deterministic split allocation for VND integer amounts.
//
// Methods supported:
//   - 'equal':                   total split evenly across N participants;
//                                remainder distributed by stable participant order.
//   - 'exact':                   caller provides exact amounts per participant;
//                                must sum to total.
//   - 'fixed_then_equal_remainder':
//                                some participants have fixed amounts; the
//                                remainder is split equally among the rest.
//                                Persisted as 'exact' (legacy check constraint),
//                                with the requested method preserved in operation
//                                metadata.
//
// Determinism: callers sort participants by member_id before allocation.

import { assertPositiveIntegerVnd, sumIntegers } from './money.ts'

export type SplitMethod = 'equal' | 'exact' | 'fixed_then_equal_remainder'

export interface ParticipantInput {
  member_id: string  // group_members.id
  user_id: string    // profiles.id (resolved by repository before split)
}

export interface ExactParticipantInput extends ParticipantInput {
  amount: number     // integer VND
}

export interface FixedParticipantInput extends ParticipantInput {
  fixed_amount?: number  // optional integer VND fixed contribution
}

export interface AllocatedSplit {
  member_id: string
  user_id: string
  amount: number
}

export class SplitError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'SplitError'
  }
}

/**
 * Split `total` equally across participants. The integer remainder
 * (total - floor(total/N) * N) is distributed one VND at a time to the
 * participants in their input order, so the result sums exactly to total
 * and the order is deterministic.
 */
export function allocateEqual(
  total: number,
  participants: readonly ParticipantInput[]
): AllocatedSplit[] {
  assertPositiveIntegerVnd(total, 'total')
  if (participants.length === 0) {
    throw new SplitError('NO_PARTICIPANTS', 'At least one participant is required')
  }
  const n = participants.length
  if (total < n) {
    throw new SplitError('ZERO_SPLIT', 'Total must allocate at least 1 VND to every participant')
  }
  const base = Math.floor(total / n)
  const remainder = total - base * n  // 0 <= remainder < n
  return participants.map((p, i) => ({
    member_id: p.member_id,
    user_id: p.user_id,
    amount: base + (i < remainder ? 1 : 0),
  }))
}

/**
 * Validate exact-amount splits sum to total.
 */
export function allocateExact(
  total: number,
  participants: readonly ExactParticipantInput[]
): AllocatedSplit[] {
  assertPositiveIntegerVnd(total, 'total')
  if (participants.length === 0) {
    throw new SplitError('NO_PARTICIPANTS', 'At least one participant is required')
  }

  for (const p of participants) {
    assertPositiveIntegerVnd(p.amount, `participant ${p.member_id} amount`)
  }
  const sum = sumIntegers(participants.map((p) => p.amount))
  if (sum !== total) {
    throw new SplitError(
      'SPLIT_SUM_MISMATCH',
      `Split sum (${sum}) does not equal total (${total})`
    )
  }
  return participants.map((p) => ({
    member_id: p.member_id,
    user_id: p.user_id,
    amount: p.amount,
  }))
}

/**
 * Some participants pay a fixed amount; the remainder is split equally
 * among the rest. If a fixed-only participant has no remainder participant,
 * the remainder must be zero.
 *
 * Order is preserved from input. The remainder distribution rounding follows
 * the same rule as allocateEqual.
 */
export function allocateFixedThenEqualRemainder(
  total: number,
  participants: readonly FixedParticipantInput[]
): AllocatedSplit[] {
  assertPositiveIntegerVnd(total, 'total')
  if (participants.length === 0) {
    throw new SplitError('NO_PARTICIPANTS', 'At least one participant is required')
  }

  const fixedCount = participants.filter((p) => p.fixed_amount !== undefined).length
  if (fixedCount === 0 || fixedCount === participants.length) {
    throw new SplitError(
      'INVALID_FIXED_REMAINDER_PARTICIPANTS',
      'At least one fixed and one remainder participant are required'
    )
  }

  let fixedSum = 0
  const remainderIndices: number[] = []
  for (let i = 0; i < participants.length; i++) {
    const p = participants[i]
    if (p.fixed_amount !== undefined) {
      assertPositiveIntegerVnd(p.fixed_amount, `participant ${p.member_id} fixed_amount`)
      fixedSum += p.fixed_amount
    } else {
      remainderIndices.push(i)
    }
  }

  if (fixedSum > total) {
    throw new SplitError(
      'FIXED_EXCEEDS_TOTAL',
      `Sum of fixed amounts (${fixedSum}) exceeds total (${total})`
    )
  }

  const remainderTotal = total - fixedSum
  if (remainderIndices.length === 0 && remainderTotal !== 0) {
    throw new SplitError(
      'FIXED_DOES_NOT_SUM_TO_TOTAL',
      `Fixed amounts (${fixedSum}) do not sum to total (${total}) and no remainder participants`
    )
  }
  if (remainderTotal < remainderIndices.length) {
    throw new SplitError('ZERO_SPLIT', 'Remainder must allocate at least 1 VND to every remainder participant')
  }

  let baseRemainder = 0
  let remainderRem = 0
  if (remainderIndices.length > 0) {
    baseRemainder = Math.floor(remainderTotal / remainderIndices.length)
    remainderRem = remainderTotal - baseRemainder * remainderIndices.length
  }

  const result: AllocatedSplit[] = []
  let assignedRemIdx = 0
  for (let i = 0; i < participants.length; i++) {
    const p = participants[i]
    let amount: number
    if (p.fixed_amount !== undefined) {
      amount = p.fixed_amount
    } else {
      amount = baseRemainder + (assignedRemIdx < remainderRem ? 1 : 0)
      assignedRemIdx++
    }
    if (amount < 0) {
      throw new SplitError('NEGATIVE_SPLIT', `Computed negative amount for ${p.member_id}`)
    }
    result.push({ member_id: p.member_id, user_id: p.user_id, amount })
  }

  // Sanity check
  const sum = sumIntegers(result.map((r) => r.amount))
  if (sum !== total) {
    throw new SplitError(
      'SPLIT_SUM_MISMATCH',
      `Allocator output sum (${sum}) does not equal total (${total})`
    )
  }
  return result
}
