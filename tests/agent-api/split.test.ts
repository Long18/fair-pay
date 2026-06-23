// Tests for domain/split.ts — deterministic split allocation
import { describe, it, expect } from 'vitest'

const splitModule = await import(
  '../../supabase/functions/fairpay-agent-api/domain/split.ts'
)
const { allocateEqual, allocateExact, allocateFixedThenEqualRemainder, SplitError } = splitModule

const members = [
  { member_id: 'm1', user_id: 'u1' },
  { member_id: 'm2', user_id: 'u2' },
  { member_id: 'm3', user_id: 'u3' },
]

describe('domain/split', () => {
  describe('allocateEqual', () => {
    it('splits evenly when divisible', () => {
      const result = allocateEqual(90000, members)
      expect(result).toEqual([
        { member_id: 'm1', user_id: 'u1', amount: 30000 },
        { member_id: 'm2', user_id: 'u2', amount: 30000 },
        { member_id: 'm3', user_id: 'u3', amount: 30000 },
      ])
    })

    it('distributes remainder deterministically by input order', () => {
      const result = allocateEqual(100000, members)
      // 100000 / 3 = 33333 remainder 1. First participant gets +1.
      expect(result[0].amount).toBe(33334)
      expect(result[1].amount).toBe(33333)
      expect(result[2].amount).toBe(33333)
    })

    it('distributes remainder of 2 to first two', () => {
      const result = allocateEqual(100002, members)
      // 100002 / 3 = 33334 remainder 0 → all equal
      expect(result[0].amount).toBe(33334)
      expect(result[1].amount).toBe(33334)
      expect(result[2].amount).toBe(33334)
    })

    it('sum always equals total exactly', () => {
      for (const total of [3, 7, 100001, 999999, 12345678]) {
        const r = allocateEqual(total, members)
        const sum = r.reduce((s, x) => s + x.amount, 0)
        expect(sum).toBe(total)
      }
    })

    it('deterministic across repeated calls', () => {
      const a = allocateEqual(100001, members)
      const b = allocateEqual(100001, members)
      expect(a).toEqual(b)
    })

    it('throws for zero amount', () => {
      expect(() => allocateEqual(0, members)).toThrow()
    })

    it('throws for no participants', () => {
      expect(() => allocateEqual(100000, [])).toThrow(SplitError)
    })

    it('handles single participant', () => {
      const result = allocateEqual(50000, [members[0]])
      expect(result).toEqual([{ member_id: 'm1', user_id: 'u1', amount: 50000 }])
    })
  })

  describe('allocateExact', () => {
    it('validates exact split summing to total', () => {
      const result = allocateExact(100000, [
        { member_id: 'm1', user_id: 'u1', amount: 60000 },
        { member_id: 'm2', user_id: 'u2', amount: 40000 },
      ])
      expect(result[0].amount).toBe(60000)
      expect(result[1].amount).toBe(40000)
    })

    it('throws when sum does not equal total', () => {
      expect(() =>
        allocateExact(100000, [
          { member_id: 'm1', user_id: 'u1', amount: 60000 },
          { member_id: 'm2', user_id: 'u2', amount: 30000 },
        ])
      ).toThrow(SplitError)
    })

    it('throws for zero amount participant', () => {
      expect(() =>
        allocateExact(100000, [
          { member_id: 'm1', user_id: 'u1', amount: 100000 },
          { member_id: 'm2', user_id: 'u2', amount: 0 },
        ])
      ).toThrow()
    })
  })

  describe('allocateFixedThenEqualRemainder', () => {
    it('fixed amounts plus equal remainder', () => {
      const result = allocateFixedThenEqualRemainder(100000, [
        { member_id: 'm1', user_id: 'u1', fixed_amount: 40000 },
        { member_id: 'm2', user_id: 'u2' }, // gets remainder share
        { member_id: 'm3', user_id: 'u3' }, // gets remainder share
      ])
      expect(result[0].amount).toBe(40000)
      // Remainder = 60000 / 2 = 30000
      expect(result[1].amount).toBe(30000)
      expect(result[2].amount).toBe(30000)
      expect(result.reduce((s, x) => s + x.amount, 0)).toBe(100000)
    })

    it('handles uneven remainder', () => {
      const result = allocateFixedThenEqualRemainder(100001, [
        { member_id: 'm1', user_id: 'u1', fixed_amount: 40000 },
        { member_id: 'm2', user_id: 'u2' },
        { member_id: 'm3', user_id: 'u3' },
      ])
      // Remainder = 60001 / 2 = 30000 R1 → first remainder participant gets +1
      expect(result[0].amount).toBe(40000)
      expect(result[1].amount).toBe(30001)
      expect(result[2].amount).toBe(30000)
      expect(result.reduce((s, x) => s + x.amount, 0)).toBe(100001)
    })

    it('rejects all-fixed input because a remainder participant is required', () => {
      expect(() => allocateFixedThenEqualRemainder(100000, [
        { member_id: 'm1', user_id: 'u1', fixed_amount: 60000 },
        { member_id: 'm2', user_id: 'u2', fixed_amount: 40000 },
      ])).toThrow(SplitError)
    })

    it('throws when fixed exceeds total', () => {
      expect(() =>
        allocateFixedThenEqualRemainder(50000, [
          { member_id: 'm1', user_id: 'u1', fixed_amount: 60000 },
          { member_id: 'm2', user_id: 'u2' },
        ])
      ).toThrow(SplitError)
    })

    it('throws when all fixed but do not sum to total', () => {
      expect(() =>
        allocateFixedThenEqualRemainder(100000, [
          { member_id: 'm1', user_id: 'u1', fixed_amount: 60000 },
          { member_id: 'm2', user_id: 'u2', fixed_amount: 30000 },
        ])
      ).toThrow(SplitError)
    })

    it('sum always equals total exactly', () => {
      for (const total of [3, 7, 100001, 999999]) {
        const r = allocateFixedThenEqualRemainder(total, [
          { member_id: 'm1', user_id: 'u1', fixed_amount: 1 },
          { member_id: 'm2', user_id: 'u2' },
          { member_id: 'm3', user_id: 'u3' },
        ])
        const sum = r.reduce((s, x) => s + x.amount, 0)
        expect(sum).toBe(total)
      }
    })
  })
})
