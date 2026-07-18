import { describe, expect, it } from 'vitest'

const contractsModule = await import(
  '../../supabase/functions/fairpay-external-agent-api/contracts.ts'
)

const { ExternalAgentSubmissionRequest } = contractsModule

const validSubmission = {
  target_email: 'Alice@Example.com',
  target_name: 'Alice',
  actor_confirmed: true,
  transaction_type: 'group',
  group_name: 'Roommates',
  source: 'chatgpt',
  description: 'Dinner',
  amount: 450000,
  currency: 'VND',
  category: 'Food & Drink',
  expense_date: '2026-06-24',
  payer: { email: 'alice@example.com' },
  split_method: 'equal',
  participants: [
    { email: 'alice@example.com' },
    { email: 'bob@example.com' },
  ],
}

function issueCodes(result: ReturnType<typeof ExternalAgentSubmissionRequest.safeParse>) {
  return result.success ? [] : result.error.issues.map((issue) => issue.code)
}

describe('external agent submission contracts', () => {
  it('accepts valid group submission and normalizes target email', () => {
    const result = ExternalAgentSubmissionRequest.safeParse(validSubmission)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.target_email).toBe('alice@example.com')
      expect(result.data.actor_confirmed).toBe(true)
      expect(result.data.transaction_type).toBe('group')
    }
  })

  it('requires actor confirmation before submission', () => {
    const result = ExternalAgentSubmissionRequest.safeParse({
      ...validSubmission,
      actor_confirmed: false,
    })

    expect(result.success).toBe(false)
    expect(issueCodes(result)).toContain('NEEDS_CLARIFICATION')
  })

  it('requires group-vs-personal transaction type before submission', () => {
    const payload = { ...validSubmission }
    delete (payload as Partial<typeof validSubmission>).transaction_type
    const result = ExternalAgentSubmissionRequest.safeParse(payload)

    expect(result.success).toBe(false)
    expect(issueCodes(result)).toContain('NEEDS_CLARIFICATION')
  })

  it('rejects personal transactions without enqueueing', () => {
    const result = ExternalAgentSubmissionRequest.safeParse({
      ...validSubmission,
      transaction_type: 'personal',
    })

    expect(result.success).toBe(false)
    expect(issueCodes(result)).toContain('UNSUPPORTED_PERSONAL_TRANSACTION')
  })

  it('requires a group hint for group transactions', () => {
    const payload = { ...validSubmission }
    delete (payload as Partial<typeof validSubmission>).group_name
    const result = ExternalAgentSubmissionRequest.safeParse(payload)

    expect(result.success).toBe(false)
    expect(issueCodes(result)).toContain('NEEDS_CLARIFICATION')
  })

  it('rejects invalid target email while preserving target email hint', () => {
    const result = ExternalAgentSubmissionRequest.safeParse({
      ...validSubmission,
      target_email: 'not-an-email',
    })

    expect(result.success).toBe(false)
    expect(result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))).toContain('target_email')
  })

  it('rejects identity and auth fields from public submissions', () => {
    const result = ExternalAgentSubmissionRequest.safeParse({
      ...validSubmission,
      actor_user_id: '550e8400-e29b-41d4-a716-446655440000',
      authorization: 'Bearer token',
    })

    expect(result.success).toBe(false)
    const paths = result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))
    expect(paths).toContain('actor_user_id')
    expect(paths).toContain('authorization')
  })

  it('rejects duplicate participant identities', () => {
    const result = ExternalAgentSubmissionRequest.safeParse({
      ...validSubmission,
      participants: [
        { email: 'bob@example.com' },
        { email: 'BOB@example.com' },
      ],
    })

    expect(result.success).toBe(false)
    expect(result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))).toContain('participants')
  })

  it('enforces split-method-specific participant fields', () => {
    const exactMissingAmount = ExternalAgentSubmissionRequest.safeParse({
      ...validSubmission,
      split_method: 'exact',
      participants: [
        { email: 'alice@example.com', amount: 200000 },
        { email: 'bob@example.com' },
      ],
    })
    const equalWithAmounts = ExternalAgentSubmissionRequest.safeParse({
      ...validSubmission,
      split_method: 'equal',
      participants: [
        { email: 'alice@example.com', amount: 200000 },
        { email: 'bob@example.com', amount: 250000 },
      ],
    })

    expect(exactMissingAmount.success).toBe(false)
    expect(equalWithAmounts.success).toBe(false)
  })

  it('accepts exact split when every participant has amount summing to total', () => {
    const result = ExternalAgentSubmissionRequest.safeParse({
      ...validSubmission,
      amount: 450000,
      split_method: 'exact',
      participants: [
        { email: 'alice@example.com', amount: 200000 },
        { email: 'bob@example.com', amount: 250000 },
      ],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.participants).toEqual([
        { email: 'alice@example.com', amount: 200000 },
        { email: 'bob@example.com', amount: 250000 },
      ])
    }
  })

  it('rejects exact split when participant amounts do not sum to total', () => {
    const result = ExternalAgentSubmissionRequest.safeParse({
      ...validSubmission,
      amount: 450000,
      split_method: 'exact',
      participants: [
        { email: 'alice@example.com', amount: 100000 },
        { email: 'bob@example.com', amount: 100000 },
      ],
    })

    expect(result.success).toBe(false)
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message)
    expect(messages.some((message) => message.includes('must equal total amount'))).toBe(true)
  })

  it('accepts fixed_then_equal_remainder with fixed_amount on some participants', () => {
    const result = ExternalAgentSubmissionRequest.safeParse({
      ...validSubmission,
      amount: 450000,
      split_method: 'fixed_then_equal_remainder',
      participants: [
        { email: 'alice@example.com', fixed_amount: 150000 },
        { email: 'bob@example.com', fixed_amount: 150000 },
        { display_name: 'Thuần' },
      ],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.participants[0]).toEqual({
        email: 'alice@example.com',
        fixed_amount: 150000,
      })
      expect(result.data.participants[2]).toEqual({ display_name: 'Thuần' })
    }
  })

  it('rejects amount on participants for fixed_then_equal_remainder', () => {
    const result = ExternalAgentSubmissionRequest.safeParse({
      ...validSubmission,
      split_method: 'fixed_then_equal_remainder',
      participants: [
        { email: 'alice@example.com', amount: 150000 },
        { email: 'bob@example.com' },
      ],
    })

    expect(result.success).toBe(false)
  })
})
