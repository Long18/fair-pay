import { describe, expect, it } from "vitest";
import type { Conversation } from "./chat-storage";
import { filterConversations, groupConversations } from "./group-conversations";

function conv(partial: Partial<Conversation> & Pick<Conversation, "id" | "updatedAt">): Conversation {
  return {
    title: partial.title ?? "Chat",
    createdAt: partial.createdAt ?? partial.updatedAt,
    messages: partial.messages ?? [],
    history: partial.history ?? [],
    ...partial,
  };
}

describe("groupConversations", () => {
  const now = new Date("2026-07-17T15:00:00.000Z");

  it("buckets into today / yesterday / previous 7 days / older", () => {
    const conversations = [
      conv({ id: "1", updatedAt: "2026-07-17T10:00:00.000Z", title: "Today" }),
      conv({ id: "2", updatedAt: "2026-07-16T10:00:00.000Z", title: "Yesterday" }),
      conv({ id: "3", updatedAt: "2026-07-12T10:00:00.000Z", title: "Week" }),
      conv({ id: "4", updatedAt: "2026-06-01T10:00:00.000Z", title: "Old" }),
    ];

    const groups = groupConversations(conversations, now);
    expect(groups.map((g) => g.key)).toEqual([
      "today",
      "yesterday",
      "previous7Days",
      "older",
    ]);
    expect(groups.find((g) => g.key === "today")?.conversations[0].id).toBe("1");
    expect(groups.find((g) => g.key === "older")?.conversations[0].id).toBe("4");
  });

  it("omits empty groups", () => {
    const groups = groupConversations(
      [conv({ id: "1", updatedAt: "2026-07-17T10:00:00.000Z" })],
      now,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("today");
  });
});

describe("filterConversations", () => {
  it("matches title and message content", () => {
    const list = [
      conv({
        id: "1",
        updatedAt: "2026-07-17T10:00:00.000Z",
        title: "Dinner split",
        messages: [{ id: "m1", role: "user", content: "hello", created_at: "2026-07-17T10:00:00.000Z" }],
      }),
      conv({
        id: "2",
        updatedAt: "2026-07-17T10:00:00.000Z",
        title: "Other",
        messages: [
          {
            id: "m2",
            role: "assistant",
            content: "Your balances look good",
            created_at: "2026-07-17T10:00:00.000Z",
          },
        ],
      }),
    ];

    expect(filterConversations(list, "dinner")).toHaveLength(1);
    expect(filterConversations(list, "balances")).toHaveLength(1);
    expect(filterConversations(list, "xyz")).toHaveLength(0);
  });
});
