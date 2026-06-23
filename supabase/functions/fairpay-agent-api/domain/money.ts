// Pure money/VND domain. No I/O, no side effects.
// All amounts are integers expressed in VND (no decimals).

// expenses.amount is DECIMAL(12,2), so integer VND is capped at 9,999,999,999.
export const MAX_SAFE_VND = 9_999_999_999

export type ValidationError = { code: string; message: string }

export function isIntegerVnd(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_SAFE_VND
  )
}

export function assertPositiveIntegerVnd(value: unknown, field: string): number {
  if (!isIntegerVnd(value)) {
    throw new MoneyError('INVALID_AMOUNT', `${field} must be a non-negative safe integer VND`)
  }
  if (value <= 0) {
    throw new MoneyError('INVALID_AMOUNT', `${field} must be a positive integer VND`)
  }
  return value
}

export function assertNonNegativeIntegerVnd(value: unknown, field: string): number {
  if (!isIntegerVnd(value)) {
    throw new MoneyError('INVALID_AMOUNT', `${field} must be a non-negative safe integer VND`)
  }
  return value
}

export function sumIntegers(amounts: readonly number[]): number {
  let total = 0
  for (const a of amounts) {
    if (!Number.isInteger(a)) {
      throw new MoneyError('INVALID_AMOUNT', 'All amounts must be integers')
    }
    total += a
    if (total > MAX_SAFE_VND) {
      throw new MoneyError('INVALID_AMOUNT', 'Sum exceeds safe integer limit')
    }
  }
  return total
}

export class MoneyError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'MoneyError'
  }
}
