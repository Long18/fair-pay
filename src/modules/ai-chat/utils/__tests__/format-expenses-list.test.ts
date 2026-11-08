import { describe, expect, it } from "vitest";
import { formatRecentExpensesResponse } from "../format-expenses-list";

describe("formatRecentExpensesResponse", () => {
  it("sorts by amount and limits top N", () => {
    const text = formatRecentExpensesResponse(
      [
        { description: "Coffee", amount: 50_000, currency: "VND" },
        { description: "Rent", amount: 5_000_000, currency: "VND" },
        { description: "Snack", amount: 20_000, currency: "VND" },
      ],
      { language: "vi", topN: 2 },
    );
    expect(text).toContain("Top 2");
    expect(text.indexOf("Rent")).toBeLessThan(text.indexOf("Coffee"));
  });
});
