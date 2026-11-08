import { describe, expect, it } from "vitest";
import {
  guessReadIntentId,
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

  it("maps quick-action style prompts to intents", () => {
    expect(matchReadIntent("Tôi đang tham gia nhóm nào?")?.id).toBe("group_list");
    expect(matchReadIntent("Top 5 expenses by amount")?.id).toBe("recent_expenses");
    expect(matchReadIntent("Who are my FairPay friends?")?.id).toBe("friends_list");
  });

  it("plans group details as list then get_group_details then final", () => {
    const text = "chi tiết nhóm Du lịch";
    expect(matchReadIntent(text)?.id).toBe("group_details");

    const first = planReadIntentStep(text);
    expect(first).toEqual({ kind: "tool", name: "fairpay_list_groups", arguments: {} });

    const groupId = "b0000000-0000-4000-8000-000000000002";
    const second = planReadIntentStep(text, {
      lastToolName: "fairpay_list_groups",
      lastToolData: { groups: [{ id: groupId, name: "Du lịch" }] },
    });
    expect(second).toEqual({
      kind: "tool",
      name: "get_group_details",
      arguments: { group_id: groupId },
    });

    const third = planReadIntentStep(text, {
      lastToolName: "get_group_details",
      lastToolData: {
        group: { name: "Du lịch" },
        members: [{ profiles: { full_name: "Lan" } }],
        recent_expenses: [{ description: "Ăn", amount: 200000, currency: "VND" }],
      },
    });
    expect(third?.kind).toBe("final");
    if (third?.kind === "final") {
      expect(third.content).toContain("Du lịch");
      expect(third.content).toContain("Lan");
    }
  });

  it("keeps plain group list separate from named group details", () => {
    expect(matchReadIntent("Which groups am I in?")?.id).toBe("group_list");
    expect(matchReadIntent("group Travel members and expenses")?.id).toBe("group_details");
  });

  it("guess returns debt for owe questions without exact regex", () => {
    expect(guessReadIntentId("tình hình balance của tôi")).toBe("debt_summary");
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
