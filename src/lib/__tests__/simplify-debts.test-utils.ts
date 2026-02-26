import fc from 'fast-check';
import type { DebtEdge } from '../simplify-debts';

/**
 * Generate a valid user ID (short alphanumeric string simulating UUIDs)
 */
export function arbitraryUserId(): fc.Arbitrary<string> {
  return fc.stringMatching(/^user_[a-z0-9]{1,6}$/);
}

/**
 * Generate a random DebtEdge with valid user IDs and positive amount
 * Amount is a positive number with at most 2 decimal places
 */
export function arbitraryDebtEdge(): fc.Arbitrary<DebtEdge> {
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
export function arbitraryDebtEdgeList(
  minSize: number = 0,
  maxSize: number = 20,
): fc.Arbitrary<DebtEdge[]> {
  return fc.array(arbitraryDebtEdge(), { minLength: minSize, maxLength: maxSize });
}

/**
 * Compute net balances from a list of DebtEdges
 */
export function computeNetBalances(debts: DebtEdge[]): Map<string, number> {
  const balances = new Map<string, number>();
  for (const debt of debts) {
    balances.set(debt.from, (balances.get(debt.from) || 0) - debt.amount);
    balances.set(debt.to, (balances.get(debt.to) || 0) + debt.amount);
  }
  return balances;
}

export function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}
