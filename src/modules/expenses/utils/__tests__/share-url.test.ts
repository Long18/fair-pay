import { describe, expect, it } from "vitest";

import { buildExpenseShareUrl } from "../share-url";

describe("buildExpenseShareUrl", () => {
  it("uses the explicit expense id when provided", () => {
    const result = buildExpenseShareUrl(
      {
        id: "expense-123",
        updated_at: "2026-04-21T12:30:00.000Z",
      },
      "https://long-pay.vercel.app/expenses/show/ignored",
    );

    expect(result).toBe(
      "https://long-pay.vercel.app/api/share/expense?id=expense-123&v=1776774600",
    );
  });

  it("falls back to the route expense id when the object does not include one", () => {
    const result = buildExpenseShareUrl(
      {
        expense_date: "2026-04-21",
      },
      "https://long-pay.vercel.app/expenses/show/expense-456",
    );

    expect(result).toBe(
      "https://long-pay.vercel.app/api/share/expense?id=expense-456&v=1776729600",
    );
  });
});
