import { describe, expect, it } from 'vitest'

const contractsModule = await import(
  '../../supabase/functions/fairpay-external-agent-api/contracts.ts'
)

const { ExternalAgentSubmissionRequest } = contractsModule

const validSubmission = {
  target_email: 'Alice@Example.com',
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

describe('external agent submission contracts', () => {
  it('accepts a valid no-key submission and normalizes target email', () => {
    const result = ExternalAgentSubmissionRequest.safeParse(validSubmission)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.target_email).toBe('alice@example.com')
    }
  })

  it('requires a target email and group hint', () => {
    const result = ExternalAgentSubmissionRequest.safeParse({
      ...validSubmission,
      target_email: 'not-an-email',
      group_name: undefined,
    })

    expect(result.success).toBe(false)
  })

  it('rejects identity and auth fields from public submissions', () => {
    const result = ExternalAgentSubmissionRequest.safeParse({
      ...validSubmission,
      actor_user_id: '550e8400-e29b-41d4-a716-446655440000',
      authorization: 'Bearer token',
    })

    expect(result.success).toBe(false)
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
  })

  it('enforces split-method-specific amount fields', () => {
    const equalWithAmounts = ExternalAgentSubmissionRequest.safeParse({
      ...validSubmission,
      participants: [
        { email: 'alice@example.com', amount: 225000 },
        { email: 'bob@example.com', amount: 225000 },
      ],
    })

    const exactWithoutAmounts = ExternalAgentSubmissionRequest.safeParse({
      ...validSubmission,
      split_method: 'exact',
    })

    const fixedWithAmount = ExternalAgentSubmissionRequest.safeParse({
      ...validSubmission,
      split_method: 'fixed_then_equal_remainder',
      participants: [
        { email: 'alice@example.com', amount: 100000 },
        { email: 'bob@example.com' },
      ],
    })

    expect(equalWithAmounts.success).toBe(false)
    expect(exactWithoutAmounts.success).toBe(false)
    expect(fixedWithAmount.success).toBe(false)
  })
})

