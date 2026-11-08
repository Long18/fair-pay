import { describe, expect, it } from "vitest";
import { chatEntitySurfaceFromReadTool } from "../chat-entity-surface";

describe("chatEntitySurfaceFromReadTool", () => {
  it("builds groups surface from list payload", () => {
    const surface = chatEntitySurfaceFromReadTool("group_list", {
      groups: [{ id: "g1", name: "Trip" }],
    });
    expect(surface).toEqual({
      kind: "groups",
      groups: [{ id: "g1", name: "Trip" }],
    });
  });

  it("returns undefined when groups empty", () => {
    expect(chatEntitySurfaceFromReadTool("group_list", { groups: [] })).toBeUndefined();
  });

  it("builds expenses surface sorted by amount", () => {
    const surface = chatEntitySurfaceFromReadTool("recent_expenses", [
      { id: "e1", description: "Small", amount: 100, currency: "VND" },
      { id: "e2", description: "Big", amount: 500000, currency: "VND" },
    ]);
    expect(surface?.kind).toBe("expenses");
    if (surface?.kind === "expenses") {
      expect(surface.expenses[0]?.id).toBe("e2");
    }
  });

  it("builds comments surface for recent feed", () => {
    const surface = chatEntitySurfaceFromReadTool("recent_comments", [
      {
        id: "c1",
        content: "Hi",
        expense_id: "exp-1",
        profiles: { full_name: "An" },
      },
    ]);
    expect(surface).toEqual({
      kind: "comments",
      comments: [
        expect.objectContaining({ id: "c1", content: "Hi", expense_id: "exp-1" }),
      ],
    });
  });

  it("returns undefined for empty comments feed", () => {
    expect(chatEntitySurfaceFromReadTool("recent_comments", [])).toBeUndefined();
  });
});
