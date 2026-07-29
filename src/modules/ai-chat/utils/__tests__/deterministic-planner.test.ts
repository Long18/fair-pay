import { describe, expect, it } from "vitest";
import { planDeterministicStep } from "../../orchestrator/deterministic-planner";
import { parseExpenseContext } from "../transaction-scope";

describe("planDeterministicStep", () => {
  it("returns final guidance for loan without calling list_groups", () => {
    const text = "Không phải group, là loan, 10.000 VND mua chuối";
    const ctx = parseExpenseContext(text);
    const step = planDeterministicStep(ctx, {}, { language: "vi", actorIdentityConfirmed: true });
    expect(step?.kind).toBe("final");
    expect(step && step.kind === "final" ? step.content : "").toContain("Friends");
  });

  it("starts group workflow with list_groups", () => {
    const ctx = parseExpenseContext("Thêm giao dịch mua chuối 10.000 VND");
    const step = planDeterministicStep(ctx, {}, { actorIdentityConfirmed: true });
    expect(step).toEqual({ kind: "tool", name: "fairpay_list_groups", arguments: {} });
  });
});
