import { describe, it, expect } from 'vitest';
import { simplifyDebts, areDebtsEquivalent } from '../simplify-debts';
import type { DebtEdge } from '../simplify-debts';

// ============================================================================
// Unit tests for edge cases of the debt simplification algorithm
// Requirements: 9.1, 9.2, 9.3, 9.5
// ============================================================================

describe('simplifyDebts - edge cases', () => {
  it('empty debt list → empty result', () => {
    const result = simplifyDebts([]);
    expect(result.original).toEqual([]);
    expect(result.simplified).toEqual([]);
    expect(result.transactionsSaved).toBe(0);
  });

  it('1 member (self-cancelling debts) → empty result', () => {
    // A single user can't owe themselves, so debts involving only
    // one user as both from/to are invalid. With one user appearing
    // only as debtor or creditor, net balance is non-zero only for them,
    // but simplification needs pairs. Test with debts that net to zero.
    const debts: DebtEdge[] = [
      { from: 'alice', to: 'bob', amount: 10 },
      { from: 'bob', to: 'alice', amount: 10 },
    ];
    const result = simplifyDebts(debts);
    // Both have zero net balance → no transactions needed
    expect(result.simplified).toEqual([]);
  });

  it('2 members → at most 1 transaction', () => {
    const debts: DebtEdge[] = [
      { from: 'alice', to: 'bob', amount: 30 },
      { from: 'alice', to: 'bob', amount: 20 },
    ];
    const result = simplifyDebts(debts);
    expect(result.simplified.length).toBeLessThanOrEqual(1);
    expect(result.simplified[0]?.amount).toBe(50);
  });

  it('2 members with equal opposite balances → exactly 1 transaction', () => {
    const debts: DebtEdge[] = [
      { from: 'alice', to: 'bob', amount: 25 },
    ];
    const result = simplifyDebts(debts);
    expect(result.simplified).toHaveLength(1);
    expect(result.simplified[0]).toEqual({
      from: 'alice',
      to: 'bob',
      amount: 25,
    });
  });

  it('all zero balances → empty result', () => {
    const debts: DebtEdge[] = [
      { from: 'alice', to: 'bob', amount: 10 },
      { from: 'bob', to: 'charlie', amount: 10 },
      { from: 'charlie', to: 'alice', amount: 10 },
    ];
    const result = simplifyDebts(debts);
    // Circular debts cancel out → all net balances are zero
    expect(result.simplified).toEqual([]);
  });

  it('rounding compensation when discrepancy > 0.01', () => {
    // Create debts with amounts that cause rounding issues
    const debts: DebtEdge[] = [
      { from: 'alice', to: 'bob', amount: 33.33 },
      { from: 'alice', to: 'charlie', amount: 33.33 },
      { from: 'alice', to: 'dave', amount: 33.34 },
    ];
    const result = simplifyDebts(debts);

    // Verify net balance preservation despite rounding
    expect(areDebtsEquivalent(debts, result.simplified)).toBe(true);

    // All amounts should be rounded to 2 decimal places
    for (const edge of result.simplified) {
      expect(edge.amount).toBe(Math.round(edge.amount * 100) / 100);
    }
  });

  it('3 members chain: A→B, B→C simplifies to A→C', () => {
    const debts: DebtEdge[] = [
      { from: 'alice', to: 'bob', amount: 20 },
      { from: 'bob', to: 'charlie', amount: 20 },
    ];
    const result = simplifyDebts(debts);
    // Bob's net balance is 0, so only A→C remains
    expect(result.simplified).toHaveLength(1);
    expect(result.simplified[0]).toEqual({
      from: 'alice',
      to: 'charlie',
      amount: 20,
    });
    expect(result.transactionsSaved).toBe(1);
  });

  it('multiple debts between same pair consolidate', () => {
    const debts: DebtEdge[] = [
      { from: 'alice', to: 'bob', amount: 10 },
      { from: 'alice', to: 'bob', amount: 15 },
      { from: 'alice', to: 'bob', amount: 5 },
    ];
    const result = simplifyDebts(debts);
    expect(result.simplified).toHaveLength(1);
    expect(result.simplified[0].amount).toBe(30);
  });
});
