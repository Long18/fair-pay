import { describe, expect, it } from "vitest";
import {
  matchReadIntent,
  planReadIntentStep,
  READ_INTENT_REGISTRY,
} from "../read-intent-registry";

describe("read-intent-registry", () => {
  it("picks expense thread over recent feed when UUID present", () => {
    const id = "a0000000-0000-4000-8000-000000000001";
    const intent = matchReadIntent(`bình luận expense ${id}`);
    expect(intent?.id).toBe("expense_comments_thread");
  });

  it("plans tool then formatted final", () => {
    const first = planReadIntentStep("which groups am I in?");
    expect(first).toEqual({ kind: "tool", name: "fairpay_list_groups", arguments: {} });

    const second = planReadIntentStep("which groups am I in?", {
      lastToolName: "fairpay_list_groups",
      lastToolData: { groups: [] },
    });
    expect(second?.kind).toBe("final");
  });

  it("does not treat confirm/add expense as expense list reads", () => {
    expect(matchReadIntent("Please confirm the expense")).toBeNull();
    expect(matchReadIntent("Add expense")).toBeNull();
    expect(matchReadIntent("top 3 thu chi")?.id).toBe("recent_expenses");
  });

  it("registry entries have unique ids and stable tool names", () => {
    const ids = new Set(READ_INTENT_REGISTRY.map((e) => e.id));
    expect(ids.size).toBe(READ_INTENT_REGISTRY.length);
    for (const entry of READ_INTENT_REGISTRY) {
      expect(entry.toolName.length).toBeGreaterThan(0);
      expect(entry.priority).toBeGreaterThan(0);
    }
  });
});
