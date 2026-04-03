import { describe, expect, it } from "vitest";

import {
  applySplitSettlementChange,
  getExpenseSettlementStatus,
} from "@/modules/admin/pages/admin-transactions.utils";

describe("admin transaction settlement helpers", () => {
  it("marks a settled split back to unpaid", () => {
    const updated = applySplitSettlementChange(
      [
        {
          id: "split-1",
          computed_amount: 120000,
          is_settled: true,
          settled_amount: 120000,
        },
        {
          id: "split-2",
          computed_amount: 80000,
          is_settled: true,
          settled_amount: 80000,
        },
      ],
      "split-1",
      false,
    );

    expect(updated[0]).toMatchObject({
      is_settled: false,
      settled_amount: 0,
    });
    expect(updated[1]).toMatchObject({
      is_settled: true,
      settled_amount: 80000,
    });
  });

  it("computes the expense as pending when one split is reverted", () => {
    const nextSplits = applySplitSettlementChange(
      [
        {
          id: "split-1",
          computed_amount: 120000,
          is_settled: true,
          settled_amount: 120000,
        },
        {
          id: "split-2",
          computed_amount: 80000,
          is_settled: true,
          settled_amount: 80000,
        },
      ],
      "split-2",
      false,
    );

    expect(getExpenseSettlementStatus(nextSplits, true)).toBe(false);
  });

  it("falls back to the existing expense status when no split data is loaded", () => {
    expect(getExpenseSettlementStatus([], true)).toBe(true);
    expect(getExpenseSettlementStatus([], false)).toBe(false);
  });
});
