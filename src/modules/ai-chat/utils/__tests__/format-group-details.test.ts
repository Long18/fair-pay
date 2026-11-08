import { describe, expect, it } from "vitest";

import { formatGroupDetailsResponse } from "../format-group-details";

describe("formatGroupDetailsResponse", () => {
  it("formats members and recent expenses in Vietnamese", () => {
    const text = formatGroupDetailsResponse(
      {
        group: { name: "Du lịch" },
        members: [
          { profiles: { full_name: "Lan" } },
          { profiles: { full_name: "Minh" } },
        ],
        recent_expenses: [
          {
            description: "Khách sạn",
            amount: 1500000,
            currency: "VND",
            expense_date: "2025-01-02",
          },
        ],
      },
      "vi",
    );
    expect(text).toContain("Du lịch");
    expect(text).toContain("Thành viên (2)");
    expect(text).toContain("Lan");
    expect(text).toContain("Khách sạn");
    expect(text).toContain("1.500.000 VND");
  });

  it("handles empty expenses in English", () => {
    const text = formatGroupDetailsResponse(
      {
        group: { name: "Travel" },
        members: [{ profiles: { full_name: "Alex" } }],
        recent_expenses: [],
      },
      "en",
    );
    expect(text).toContain("Members (1)");
    expect(text).toContain("No recent group expenses");
  });
});
