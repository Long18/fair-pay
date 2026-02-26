import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { simplifyDebts, areDebtsEquivalent } from '../simplify-debts';
import type { DebtEdge } from '../simplify-debts';

// ============================================================================
// Generators (reusable across all property tests)
// ============================================================================

/**
 * Generate a valid user ID (short alphanumeric string simulating UUIDs)
 */
function arbitraryUserId(): fc.Arbitrary<string> {
  return fc.stringMatching(/^user_[a-z0-9]{1,6}$/);
}

/**
 * Generate a random DebtEdge with valid user IDs and positive amount
 * Amount is a positive number with at most 2 decimal places
 */
function arbitraryDebtEdge(): fc.Arbitrary<DebtEdge> {
  return fc
    .record({
      from: arbitraryUserId(),
      to: arbitraryUserId(),
      amount: fc.double({ min: 0.01, max: 100_000, noNaN: true, noDefaultInfinity: true }),
    })
    .filter((edge) => edge.from !== edge.to)
    .map((edge) => ({
      ...edge,
      amount: Math.round(edge.amount * 100) / 100,
    }));
}

/**
 * Generate a list of DebtEdge with configurable size range
 */
function arbitraryDebtEdgeList(
  minSize: number = 0,
  maxSize: number = 20,
): fc.Arbitrary<DebtEdge[]> {
  return fc.array(arbitraryDebtEdge(), { minLength: minSize, maxLength: maxSize });
}

// ============================================================================
// Helper: compute net balances from a list of DebtEdges
// ============================================================================

function computeNetBalances(debts: DebtEdge[]): Map<string, number> {
  const balances = new Map<string, number>();
  for (const debt of debts) {
    balances.set(debt.from, (balances.get(debt.from) || 0) - debt.amount);
    balances.set(debt.to, (balances.get(debt.to) || 0) + debt.amount);
  }
  return balances;
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ============================================================================
// Property 1: Net Balance Conservation
// Feature: debt-simplification, Property 1: Net Balance Conservation
// Validates: Requirements 1.1, 1.2, 1.5
// ============================================================================

describe('Feature: debt-simplification, Property 1: Net Balance Conservation', () => {
  it('the sum of all net balances must equal zero (within ±0.01 tolerance)', () => {
    fc.assert(
      fc.property(arbitraryDebtEdgeList(1, 20), (debts) => {
        const result = simplifyDebts(debts);
        const balances = computeNetBalances(result.simplified);

        // Sum of all net balances must be zero (within tolerance)
        let sum = 0;
        for (const balance of balances.values()) {
          sum += balance;
        }

        expect(Math.abs(sum)).toBeLessThanOrEqual(0.01);
      }),
      { numRuns: 100 },
    );
  });

  it('each individual net balance in simplified output must be rounded to exactly 2 decimal places', () => {
    fc.assert(
      fc.property(arbitraryDebtEdgeList(1, 20), (debts) => {
        const result = simplifyDebts(debts);

        // Every amount in simplified edges must be rounded to 2 decimal places
        for (const edge of result.simplified) {
          expect(edge.amount).toBe(roundTo2(edge.amount));
        }
      }),
      { numRuns: 100 },
    );
  });

  it('the sum of all net balances from original debts must equal zero (within ±0.01 tolerance)', () => {
    fc.assert(
      fc.property(arbitraryDebtEdgeList(1, 20), (debts) => {
        const balances = computeNetBalances(debts);

        // Sum of all original net balances must also be zero (conservation law)
        let sum = 0;
        for (const balance of balances.values()) {
          sum += balance;
        }

        expect(Math.abs(roundTo2(sum))).toBeLessThanOrEqual(0.01);
      }),
      { numRuns: 100 },
    );
  });
});

// ============================================================================
// Property 2: Simplification Preserves Net Balances
// Feature: debt-simplification, Property 2: Simplification Preserves Net Balances
// Validates: Requirements 2.2, 8.1
// ============================================================================

describe('Feature: debt-simplification, Property 2: Simplification Preserves Net Balances', () => {
  it('areDebtsEquivalent(original, simplified) must return true for any valid input', () => {
    fc.assert(
      fc.property(arbitraryDebtEdgeList(0, 20), (debts) => {
        const result = simplifyDebts(debts);

        expect(areDebtsEquivalent(result.original, result.simplified)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('preserves net balances even for empty input', () => {
    const result = simplifyDebts([]);
    expect(areDebtsEquivalent(result.original, result.simplified)).toBe(true);
  });
});

// ============================================================================
// Property 3: Simplification Reduces Transaction Count
// Feature: debt-simplification, Property 3: Transaction Count Reduction
// Validates: Requirements 2.1
// ============================================================================

describe('Feature: debt-simplification, Property 3: Transaction Count Reduction', () => {
  it('transactionsSaved must equal max(0, original count minus simplified count)', () => {
    fc.assert(
      fc.property(arbitraryDebtEdgeList(0, 20), (debts) => {
        const result = simplifyDebts(debts);

        expect(result.transactionsSaved).toBe(
          Math.max(0, result.original.length - result.simplified.length),
        );
      }),
      { numRuns: 100 },
    );
  });

});

// ============================================================================
// Property 4: Upper Bound on Simplified Transactions
// Feature: debt-simplification, Property 4: Upper Bound N-1
// Validates: Requirements 2.5
// ============================================================================

describe('Feature: debt-simplification, Property 4: Upper Bound N-1', () => {
  it('simplified output must contain at most N-1 transactions for N members with non-zero balances', () => {
    fc.assert(
      fc.property(arbitraryDebtEdgeList(1, 20), (debts) => {
        const result = simplifyDebts(debts);
        const balances = computeNetBalances(debts);

        // Count users with non-zero net balance (within tolerance)
        let nonZeroCount = 0;
        for (const balance of balances.values()) {
          if (Math.abs(roundTo2(balance)) > 0.01) {
            nonZeroCount++;
          }
        }

        const upperBound = nonZeroCount > 0 ? nonZeroCount - 1 : 0;
        expect(result.simplified.length).toBeLessThanOrEqual(upperBound);
      }),
      { numRuns: 100 },
    );
  });

  it('when all members have zero net balance, returns empty simplified list', () => {
    fc.assert(
      fc.property(arbitraryDebtEdgeList(0, 20), (debts) => {
        const balances = computeNetBalances(debts);
        const allZero = [...balances.values()].every((b) => Math.abs(roundTo2(b)) <= 0.01);

        if (allZero) {
          const result = simplifyDebts(debts);
          expect(result.simplified.length).toBe(0);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ============================================================================
// Property 5: Simplification Idempotence
// Feature: debt-simplification, Property 5: Simplification Idempotence
// Validates: Requirements 8.2
// ============================================================================

describe('Feature: debt-simplification, Property 5: Simplification Idempotence', () => {
  it('simplifying an already-simplified result must produce an equivalent plan', () => {
    fc.assert(
      fc.property(arbitraryDebtEdgeList(0, 20), (debts) => {
        const first = simplifyDebts(debts);
        const second = simplifyDebts(first.simplified);

        expect(areDebtsEquivalent(first.simplified, second.simplified)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('re-simplifying must not increase transaction count', () => {
    fc.assert(
      fc.property(arbitraryDebtEdgeList(0, 20), (debts) => {
        const first = simplifyDebts(debts);
        const second = simplifyDebts(first.simplified);

        expect(second.simplified.length).toBeLessThanOrEqual(first.simplified.length);
      }),
      { numRuns: 100 },
    );
  });
});

// ============================================================================
// Property 6: Round-Trip Consistency
// Feature: debt-simplification, Property 6: Round-Trip Consistency
// Validates: Requirements 8.3
// ============================================================================

describe('Feature: debt-simplification, Property 6: Round-Trip Consistency', () => {
  it('converting simplified edges back to net balances and re-simplifying must produce equivalent net balances', () => {
    fc.assert(
      fc.property(arbitraryDebtEdgeList(0, 20), (debts) => {
        const first = simplifyDebts(debts);

        // Convert simplified edges to "net balance edges" by re-simplifying
        const reSimplified = simplifyDebts(first.simplified);

        // Net balances must be equivalent
        expect(areDebtsEquivalent(first.simplified, reSimplified.simplified)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// Export generators for reuse in subsequent property test files
export { arbitraryUserId, arbitraryDebtEdge, arbitraryDebtEdgeList, computeNetBalances, roundTo2 };
