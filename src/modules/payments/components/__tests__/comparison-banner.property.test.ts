import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { SimplifiedBalance } from "../../hooks/use-simplified-balances";
import { arbitraryUserId } from "@/lib/__tests__/simplify-debts.test-utils";

// ============================================================================
// Generators
// ============================================================================

/**
 * Generate a random SimplifiedBalance with valid user IDs and positive amount
 */
function arbitrarySimplifiedBalance(): fc.Arbitrary<SimplifiedBalance> {
  return fc
    .record({
      from_user_id: arbitraryUserId(),
      from_user_name: fc.string({ minLength: 1, maxLength: 10 }),
      to_user_id: arbitraryUserId(),
      to_user_name: fc.string({ minLength: 1, maxLength: 10 }),
      amount: fc.double({ min: 0.01, max: 100_000, noNaN: true, noDefaultInfinity: true }),
    })
    .filter((b) => b.from_user_id !== b.to_user_id)
    .map((b) => ({
      ...b,
      from_user_avatar_url: null,
      to_user_avatar_url: null,
      amount: Math.round(b.amount * 100) / 100,
    }));
}

/**
 * Generate a list of SimplifiedBalance with configurable size
 */
function arbitrarySimplifiedBalanceList(
  minSize: number = 0,
  maxSize: number = 20,
): fc.Arbitrary<SimplifiedBalance[]> {
  return fc.array(arbitrarySimplifiedBalance(), { minLength: minSize, maxLength: maxSize });
}

// ============================================================================
// Pure computation extracted from ComparisonBanner useMemo
// ============================================================================

function computeBannerStats(originalCount: number, simplifiedCount: number) {
  const saved = Math.max(0, originalCount - simplifiedCount);
  const percent = originalCount > 0 ? Math.round((saved / originalCount) * 100) : 0;
  return { transactionsSaved: saved, reductionPercent: percent };
}

// ============================================================================
// Property 8: Comparison Banner Accuracy
// Feature: debt-simplification, Property 8: Comparison Banner Accuracy
// Validates: Requirements 4.1
// ============================================================================

describe("Feature: debt-simplification, Property 8: Comparison Banner Accuracy", () => {
  it("transactionsSaved equals max(0, originalCount - simplifiedCount)", () => {
    fc.assert(
      fc.property(
        arbitrarySimplifiedBalanceList(0, 20),
        arbitrarySimplifiedBalanceList(0, 20),
        (originalDebts, simplifiedDebts) => {
          const originalCount = originalDebts.length;
          const simplifiedCount = simplifiedDebts.length;

          const { transactionsSaved } = computeBannerStats(originalCount, simplifiedCount);

          expect(transactionsSaved).toBe(Math.max(0, originalCount - simplifiedCount));
          expect(transactionsSaved).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("reductionPercent equals round((transactionsSaved / originalCount) * 100) when originalCount > 0", () => {
    fc.assert(
      fc.property(
        arbitrarySimplifiedBalanceList(1, 20),
        arbitrarySimplifiedBalanceList(0, 20),
        (originalDebts, simplifiedDebts) => {
          const originalCount = originalDebts.length;
          const simplifiedCount = simplifiedDebts.length;

          const { transactionsSaved, reductionPercent } = computeBannerStats(
            originalCount,
            simplifiedCount,
          );

          const expectedPercent = Math.round((transactionsSaved / originalCount) * 100);
          expect(reductionPercent).toBe(expectedPercent);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("reductionPercent is 0 when originalCount is 0", () => {
    fc.assert(
      fc.property(
        arbitrarySimplifiedBalanceList(0, 20),
        (simplifiedDebts) => {
          const { transactionsSaved, reductionPercent } = computeBannerStats(
            0,
            simplifiedDebts.length,
          );

          expect(transactionsSaved).toBe(0);
          expect(reductionPercent).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("reductionPercent is between 0 and 100 when simplifiedCount <= originalCount", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        (originalCount, simplifiedCount) => {
          // Constrain simplifiedCount <= originalCount for realistic scenario
          const clampedSimplified = Math.min(simplifiedCount, originalCount);

          const { reductionPercent } = computeBannerStats(originalCount, clampedSimplified);

          expect(reductionPercent).toBeGreaterThanOrEqual(0);
          expect(reductionPercent).toBeLessThanOrEqual(100);
        },
      ),
      { numRuns: 100 },
    );
  });
});
