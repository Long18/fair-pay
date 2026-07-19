import { describe, expect, it } from "vitest";
import { computeBudgetVsActual, currentYearMonth } from "./budget-vs-actual";

describe("computeBudgetVsActual", () => {
  it("merges budget and actual by category", () => {
    const rows = computeBudgetVsActual(
      [
        { category: "Food & Drink", amount: 1_000_000 },
        { category: "Transportation", amount: 500_000 },
      ],
      [
        { category: "Food & Drink", amount: 250_000 },
        { category: "Shopping", amount: 99_000 },
      ],
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      category: "Food & Drink",
      budgetAmount: 1_000_000,
      actualAmount: 250_000,
      remaining: 750_000,
      percentUsed: 25,
      overBudget: false,
    });
    expect(rows[1]).toMatchObject({
      category: "Transportation",
      actualAmount: 0,
      percentUsed: 0,
      overBudget: false,
    });
  });

  it("flags over-budget categories", () => {
    const [row] = computeBudgetVsActual(
      [{ category: "Utilities", amount: 100 }],
      [{ category: "Utilities", amount: 150 }],
    );
    expect(row.overBudget).toBe(true);
    expect(row.percentUsed).toBe(150);
    expect(row.remaining).toBe(-50);
  });

  it("sums duplicate actual categories", () => {
    const [row] = computeBudgetVsActual(
      [{ category: "Other", amount: 200 }],
      [
        { category: "Other", amount: 50 },
        { category: "Other", amount: 25 },
      ],
    );
    expect(row.actualAmount).toBe(75);
  });
});

describe("currentYearMonth", () => {
  it("formats YYYY-MM", () => {
    expect(currentYearMonth(new Date("2026-07-19T12:00:00Z"))).toBe("2026-07");
  });
});
