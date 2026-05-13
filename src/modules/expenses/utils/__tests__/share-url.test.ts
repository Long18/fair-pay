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

    expect(result).toBe("https://long-pay.vercel.app/share/expenses/expense-123");
  });

  it("falls back to the route expense id when the object does not include one", () => {
    const result = buildExpenseShareUrl(
      {
        expense_date: "2026-04-21",
      },
      "https://long-pay.vercel.app/expenses/show/expense-456",
    );

    expect(result).toBe("https://long-pay.vercel.app/share/expenses/expense-456");
  });

  it("adds a compact ref when tracking context is provided", () => {
    const result = buildExpenseShareUrl(
      {
        id: "expense-123",
        updated_at: "2026-04-21T12:30:00.000Z",
      },
      "https://long-pay.vercel.app/expenses/show/expense-123?tab=details",
      {
        source: "Native Share",
        medium: "Social Share",
        content: "Expense Detail Share Button",
      },
    );

    const url = new URL(result);
    expect(url.pathname).toBe("/share/expenses/expense-123");
    expect(url.searchParams.has("utm_source")).toBe(false);
    expect(url.searchParams.has("utm_medium")).toBe(false);
    expect(url.searchParams.has("utm_campaign")).toBe(false);
    expect(url.searchParams.has("utm_content")).toBe(false);
    // native_share/social_share/expense_share/expense_detail_share_button → n=602 → "9i"
    expect(url.searchParams.get("ref")).toBe("9i");
  });
});
