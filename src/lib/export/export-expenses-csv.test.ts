import { describe, expect, it } from "vitest";
import { buildExpensesCsv } from "./export-expenses-csv";

describe("buildExpensesCsv", () => {
  it("builds a header row and escaped fields", () => {
    const csv = buildExpensesCsv([
      {
        id: "e1",
        description: 'Lunch, "nice"',
        amount: 120000,
        currency: "VND",
        category: "Food & Drink",
        expense_date: "2026-07-01",
        group_id: "g1",
        friendship_id: null,
      },
    ]);

    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "id,description,amount,currency,category,expense_date,group_id,friendship_id",
    );
    expect(lines[1]).toContain('"Lunch, ""nice"""');
    expect(lines[1]).toContain("120000");
    expect(lines[1]).toContain("Food & Drink");
    expect(lines[1]).toContain("g1");
  });

  it("returns headers only for empty input", () => {
    const csv = buildExpensesCsv([]);
    expect(csv).toBe(
      "id,description,amount,currency,category,expense_date,group_id,friendship_id",
    );
  });
});
