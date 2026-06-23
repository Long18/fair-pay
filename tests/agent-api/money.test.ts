// Tests for domain/money.ts — integer VND validation
import { describe, it, expect } from 'vitest'

// We import the domain modules directly since they're pure TypeScript
// (no Deno-specific runtime deps). Path aliased from the edge function source.
// For vitest we use relative path to the function's domain module.
const moneyModule = await import(
  '../../supabase/functions/fairpay-agent-api/domain/money.ts'
)
const { isIntegerVnd, assertPositiveIntegerVnd, assertNonNegativeIntegerVnd, sumIntegers, MoneyError, MAX_SAFE_VND } = moneyModule

describe('domain/money', () => {
  describe('isIntegerVnd', () => {
    it('accepts valid VND integers', () => {
      expect(isIntegerVnd(0)).toBe(true)
      expect(isIntegerVnd(1)).toBe(true)
      expect(isIntegerVnd(50000)).toBe(true)
      expect(isIntegerVnd(MAX_SAFE_VND)).toBe(true)
    })

    it('rejects non-integers', () => {
      expect(isIntegerVnd(1.5)).toBe(false)
      expect(isIntegerVnd(100.01)).toBe(false)
    })

    it('rejects negative numbers', () => {
      expect(isIntegerVnd(-1)).toBe(false)
      expect(isIntegerVnd(-50000)).toBe(false)
    })

    it('rejects non-numbers', () => {
      expect(isIntegerVnd('50000')).toBe(false)
      expect(isIntegerVnd(null)).toBe(false)
      expect(isIntegerVnd(undefined)).toBe(false)
      expect(isIntegerVnd(NaN)).toBe(false)
      expect(isIntegerVnd(Infinity)).toBe(false)
    })

    it('rejects numbers exceeding the DECIMAL(12,2) database limit', () => {
      expect(isIntegerVnd(MAX_SAFE_VND + 1)).toBe(false)
    })
  })

  describe('assertPositiveIntegerVnd', () => {
    it('passes for positive integers', () => {
      expect(assertPositiveIntegerVnd(1, 'amount')).toBe(1)
      expect(assertPositiveIntegerVnd(50000, 'amount')).toBe(50000)
    })

    it('throws for zero', () => {
      expect(() => assertPositiveIntegerVnd(0, 'amount')).toThrow(MoneyError)
    })

    it('throws for negative', () => {
      expect(() => assertPositiveIntegerVnd(-1, 'amount')).toThrow(MoneyError)
    })

    it('throws for decimals', () => {
      expect(() => assertPositiveIntegerVnd(1.5, 'amount')).toThrow(MoneyError)
    })
  })

  describe('assertNonNegativeIntegerVnd', () => {
    it('passes for zero', () => {
      expect(assertNonNegativeIntegerVnd(0, 'amount')).toBe(0)
    })

    it('throws for negative', () => {
      expect(() => assertNonNegativeIntegerVnd(-1, 'amount')).toThrow(MoneyError)
    })
  })

  describe('sumIntegers', () => {
    it('sums correctly', () => {
      expect(sumIntegers([1000, 2000, 3000])).toBe(6000)
    })

    it('returns 0 for empty array', () => {
      expect(sumIntegers([])).toBe(0)
    })

    it('throws for non-integer in array', () => {
      expect(() => sumIntegers([1000, 1.5])).toThrow(MoneyError)
    })

    it('throws when sum exceeds the database amount limit', () => {
      expect(() => sumIntegers([MAX_SAFE_VND, 1])).toThrow(MoneyError)
    })
  })
})
