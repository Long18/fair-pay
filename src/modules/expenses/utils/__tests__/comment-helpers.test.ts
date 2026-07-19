import { describe, expect, it } from "vitest";
import {
  buildCommentParticipants,
  countCommentThread,
  flattenCommentThread,
} from "../comment-helpers";
import type { ExpenseComment } from "../../types/comments";

describe("buildCommentParticipants", () => {
  it("includes payer and unique split users", () => {
    const users = buildCommentParticipants(
      {
        profiles: {
          id: "payer-1",
          full_name: "Alice",
          avatar_url: null,
        },
      },
      [
        { user_id: "payer-1", profiles: { full_name: "Alice" } },
        { user_id: "bob", profiles: { full_name: "Bob", avatar_url: "/b.png" } },
        { user_id: "bob", profiles: { full_name: "Bob Dup" } },
      ],
    );

    expect(users).toEqual([
      { id: "payer-1", full_name: "Alice", avatar_url: null },
      { id: "bob", full_name: "Bob", avatar_url: "/b.png" },
    ]);
  });

  it("handles missing expense", () => {
    expect(buildCommentParticipants(null, [{ user_id: "u1" }])).toEqual([
      { id: "u1", full_name: "Unknown", avatar_url: null },
    ]);
  });
});

describe("countCommentThread / flattenCommentThread", () => {
  const sample: ExpenseComment[] = [
    {
      id: "c1",
      expense_id: "e1",
      user_id: "u1",
      parent_id: null,
      content: "Hi",
      is_edited: false,
      edited_at: null,
      created_at: "",
      updated_at: "",
      user: { id: "u1", full_name: "A", avatar_url: null },
      mentions: [],
      replies: [
        {
          id: "c2",
          expense_id: "e1",
          user_id: "u2",
          parent_id: "c1",
          content: "Reply",
          is_edited: false,
          edited_at: null,
          created_at: "",
          updated_at: "",
          user: { id: "u2", full_name: "B", avatar_url: null },
          mentions: [],
        },
      ],
    },
  ];

  it("counts roots and replies", () => {
    expect(countCommentThread(sample)).toBe(2);
  });

  it("flattens for display", () => {
    expect(flattenCommentThread(sample).map((c) => c.id)).toEqual(["c1", "c2"]);
  });
});
