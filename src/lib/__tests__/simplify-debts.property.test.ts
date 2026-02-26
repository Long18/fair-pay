import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { simplifyDebts, areDebtsEquivalent } from '../simplify-debts';
import { arbitraryDebtEdgeList, arbitraryDebtEdge, computeNetBalances, roundTo2 } from './simplify-debts.test-utils';

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

// ============================================================================
// Property 7: areDebtsEquivalent Correctness
// Feature: debt-simplification, Property 7: areDebtsEquivalent Correctness
// Validates: Requirements 8.4
// ============================================================================

describe('Feature: debt-simplification, Property 7: areDebtsEquivalent Correctness', () => {
  it('returns true when two debt lists have identical net balances', () => {
    fc.assert(
      fc.property(arbitraryDebtEdgeList(0, 15), (debts) => {
        // Same list must be equivalent to itself
        expect(areDebtsEquivalent(debts, debts)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('returns true for empty lists', () => {
    expect(areDebtsEquivalent([], [])).toBe(true);
  });

  it('returns false when a debt is added that changes net balances', () => {
    fc.assert(
      fc.property(
        arbitraryDebtEdgeList(1, 10),
        arbitraryDebtEdge(),
        (debts, extraEdge) => {
          // Add an extra edge to create different net balances
          const modified = [...debts, extraEdge];
          const balancesOrig = computeNetBalances(debts);
          const balancesMod = computeNetBalances(modified);

          // Check if balances actually differ
          let differs = false;
          const allUsers = new Set([...balancesOrig.keys(), ...balancesMod.keys()]);
          for (const userId of allUsers) {
            const b1 = balancesOrig.get(userId) || 0;
            const b2 = balancesMod.get(userId) || 0;
            if (Math.abs(b1 - b2) > 0.01) {
              differs = true;
              break;
            }
          }

          if (differs) {
            expect(areDebtsEquivalent(debts, modified)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
