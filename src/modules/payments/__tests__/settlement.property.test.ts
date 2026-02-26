import { describe, it, expect } from "vitest";
import fc from "fast-check";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Round a number to 2 decimal places (matches app behavior)
 */
function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Compute remaining debt after a partial payment
 */
function computeRemaining(debtAmount: number, paymentAmount: number): number {
  return roundTo2(debtAmount - paymentAmount);
}

// ============================================================================
// Generators
// ============================================================================

/**
 * Generate a debt amount A and partial payment P where 0 < P < A.
 * Strategy: generate A first, then P as a fraction of A.
 */
function arbitraryDebtAndPartialPayment(): fc.Arbitrary<{ debtAmount: number; paymentAmount: number }> {
  return fc
    .double({ min: 0.02, max: 1_000_000, noNaN: true, noDefaultInfinity: true })
    .chain((rawA) => {
      const debtAmount = roundTo2(rawA);
      // P must be strictly between 0 and A, generate fraction in (0, 1)
      return fc
        .double({ min: 0.01, max: 0.99, noNaN: true, noDefaultInfinity: true })
        .map((fraction) => {
          const paymentAmount = roundTo2(debtAmount * fraction);
          return { debtAmount, paymentAmount };
        })
        // Ensure P > 0 and P < A after rounding
        .filter(({ debtAmount: a, paymentAmount: p }) => p > 0 && p < a);
    });
}

/**
 * Generate a debt amount A and full payment P = A.
 */
function arbitraryDebtAndFullPayment(): fc.Arbitrary<{ debtAmount: number; paymentAmount: number }> {
  return fc
    .double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true })
    .map((rawA) => {
      const debtAmount = roundTo2(rawA);
      return { debtAmount, paymentAmount: debtAmount };
    });
}

// ============================================================================
// Property 9: Partial Payment Arithmetic
// Feature: debt-simplification, Property 9: Partial Payment Arithmetic
// Validates: Requirements 5.4
// ============================================================================

describe("Feature: debt-simplification, Property 9: Partial Payment Arithmetic", () => {
  it("for any A > 0 and 0 < P < A: remaining = round(A - P, 2) and remaining > 0", () => {
    fc.assert(
      fc.property(arbitraryDebtAndPartialPayment(), ({ debtAmount, paymentAmount }) => {
        const remaining = computeRemaining(debtAmount, paymentAmount);

        // Remaining must equal A - P rounded to 2 decimals
        expect(remaining).toBe(roundTo2(debtAmount - paymentAmount));

        // Remaining must be positive when P < A
        expect(remaining).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it("for any A > 0 and P = A: remaining = 0", () => {
    fc.assert(
      fc.property(arbitraryDebtAndFullPayment(), ({ debtAmount, paymentAmount }) => {
        const remaining = computeRemaining(debtAmount, paymentAmount);

        expect(remaining).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it("for any A > 0 and 0 < P < A: remaining + P ≈ A (within ±0.01)", () => {
    fc.assert(
      fc.property(arbitraryDebtAndPartialPayment(), ({ debtAmount, paymentAmount }) => {
        const remaining = computeRemaining(debtAmount, paymentAmount);

        // remaining + paymentAmount should reconstruct the original debt within tolerance
        expect(Math.abs(remaining + paymentAmount - debtAmount)).toBeLessThanOrEqual(0.01);
      }),
      { numRuns: 100 },
    );
  });
});
