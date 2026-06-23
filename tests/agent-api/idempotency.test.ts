// Tests for idempotency, one-time confirmation, and operation polling logic.
// These test the contract invariants rather than the DB (no Supabase needed).
import { describe, it, expect } from 'vitest'

const contractsModule = await import(
  '../../supabase/functions/fairpay-agent-api/contracts.ts'
)
const { CommitRequest, ConfirmRequest, OperationStatus } = contractsModule

describe('idempotency contract', () => {
  describe('Idempotency-Key header requirement', () => {
    it('CommitRequest body does not contain an idempotency field', () => {
      // The Idempotency-Key is a header, not a body field.
      // Verify that adding it to the body gets rejected (strict).
      const bad = {
        preview_id: '550e8400-e29b-41d4-a716-446655440000',
        preview_hash: 'abc',
        confirmation_id: '550e8400-e29b-41d4-a716-446655440001',
        idempotency_key: 'should-be-in-header',
      }
      expect(CommitRequest.safeParse(bad).success).toBe(false)
    })
  })
})

describe('one-time confirmation', () => {
  describe('ConfirmRequest strict body', () => {
    it('only preview_hash is accepted', () => {
      expect(ConfirmRequest.safeParse({ preview_hash: 'a'.repeat(64) }).success).toBe(true)
    })

    it('rejects extra fields (e.g., user_id injection attempt)', () => {
      expect(
        ConfirmRequest.safeParse({ preview_hash: 'a'.repeat(64), user_id: 'injected' }).success
      ).toBe(false)
    })

    it('rejects empty preview_hash', () => {
      expect(ConfirmRequest.safeParse({ preview_hash: '' }).success).toBe(false)
    })
  })
})

describe('operation status transitions', () => {
  it('all valid statuses', () => {
    const valid = ['pending', 'previewed', 'confirmed', 'committed', 'failed', 'expired']
    for (const s of valid) {
      expect(OperationStatus.safeParse(s).success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    expect(OperationStatus.safeParse('cancelled').success).toBe(false)
  })
})
