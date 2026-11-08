import { describe, expect, it } from "vitest";
import {
  formatExpenseCommentsThread,
  formatRecentExpenseComments,
} from "../format-expense-comments";

describe("formatExpenseCommentsThread", () => {
  it("formats threaded comments", () => {
    const text = formatExpenseCommentsThread(
      [
        {
          content: "Paid already",
          created_at: "2026-01-01T10:00:00Z",
          user: { full_name: "An" },
          replies: [{ content: "Thanks", user: { full_name: "Binh" } }],
        },
      ],
      "en",
    );
    expect(text).toContain("An");
    expect(text).toContain("Paid already");
    expect(text).toContain("Binh");
  });
});

describe("formatRecentExpenseComments", () => {
  it("formats feed rows", () => {
    const text = formatRecentExpenseComments(
      [
        {
          content: "Nice split",
          created_at: "2026-01-02T08:00:00Z",
          profiles: { full_name: "Chi" },
          expenses: { description: "Lunch team" },
        },
      ],
      "vi",
    );
    expect(text).toContain("Lunch team");
    expect(text).toContain("Chi");
  });
});
