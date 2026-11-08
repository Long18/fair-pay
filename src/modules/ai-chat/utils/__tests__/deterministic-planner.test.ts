import { describe, expect, it } from "vitest";
import {
  isPlannerOnlyUserMessage,
  planDeterministicStep,
  planGroupListStep,
  planRecentExpenseCommentsStep,
  looksLikeDebtQuery,
  looksLikeGroupListQuery,
  looksLikeFriendsQuery,
  looksLikeRecentExpensesQuery,
  looksLikeRecentCommentsQuery,
  planFriendsListStep,
  planRecentExpensesStep,
} from "../../orchestrator/deterministic-planner";
import { parseExpenseContext } from "../transaction-scope";

describe("planDeterministicStep", () => {
  it("returns final guidance for loan without calling list_groups", () => {
    const text = "Không phải group, là loan, 10.000 VND mua chuối";
    const ctx = parseExpenseContext(text);
    const step = planDeterministicStep(ctx, {}, { language: "vi", actorIdentityConfirmed: true });
    expect(step?.kind).toBe("final");
    expect(step && step.kind === "final" ? step.content : "").toContain("Friends");
  });

  it("detects debt and group list as planner-only", () => {
    expect(looksLikeDebtQuery("ai đang nợ tôi bao nhiêu")).toBe(true);
    expect(looksLikeGroupListQuery("liệt kê các nhóm của tôi")).toBe(true);
    expect(isPlannerOnlyUserMessage("ai đang nợ tôi bao nhiêu")).toBe(true);
    expect(isPlannerOnlyUserMessage("hello")).toBe(false);
  });

  it("detects recent comment questions", () => {
    expect(looksLikeRecentCommentsQuery("bình luận mới gần đây")).toBe(true);
    const step = planRecentExpenseCommentsStep("recent comments", undefined, { language: "en" });
    expect(step).toEqual({
      kind: "tool",
      name: "get_recent_expense_comments",
      arguments: { limit: 15 },
    });
  });

  it("plans fairpay_list_groups for group list questions", () => {
    const step = planGroupListStep("which groups am I in?", undefined, { language: "en" });
    expect(step).toEqual({ kind: "tool", name: "fairpay_list_groups", arguments: {} });
  });

  it("matches Vietnamese group / friends / expense questions from screenshot", () => {
    expect(looksLikeGroupListQuery("tôi đang tham gia nhóm nào?")).toBe(true);
    expect(looksLikeFriendsQuery("tôi có những bạn nào")).toBe(true);
    expect(looksLikeRecentExpensesQuery("top 3 thu chi")).toBe(true);
    expect(isPlannerOnlyUserMessage("top 3 thu chi")).toBe(true);

    expect(planFriendsListStep("tôi có những bạn nào")).toEqual({
      kind: "tool",
      name: "get_friends",
      arguments: {},
    });
    expect(planRecentExpensesStep("top 3 thu chi")).toEqual({
      kind: "tool",
      name: "get_expenses",
      arguments: { limit: 10 },
    });
  });

  it("starts group workflow with list_groups", () => {
    const ctx = parseExpenseContext("Thêm giao dịch mua chuối 10.000 VND");
    const step = planDeterministicStep(ctx, {}, { actorIdentityConfirmed: true });
    expect(step).toEqual({ kind: "tool", name: "fairpay_list_groups", arguments: {} });
  });
});
