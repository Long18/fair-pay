import { describe, expect, it } from "vitest";
import { formatDebtSummaryResponse } from "../format-debt-summary";
import { planDebtSummaryStep } from "../../orchestrator/deterministic-planner";

describe("formatDebtSummaryResponse", () => {
  it("formats Vietnamese debt rows", () => {
    const text = formatDebtSummaryResponse(
      [
        { counterparty_name: "Tuyến", amount: 50000, currency: "VND", i_owe_them: false },
        { counterparty_name: "Lan", amount: 20000, currency: "VND", i_owe_them: true },
      ],
      "vi",
    );
    expect(text).toContain("Tuyến nợ bạn");
    expect(text).toContain("Bạn nợ Lan");
  });

  it("returns settled message for empty data", () => {
    expect(formatDebtSummaryResponse([], "vi")).toContain("không có khoản nợ");
  });
});

describe("planDebtSummaryStep", () => {
  it("detects Vietnamese debt query and calls get_debt_summary", () => {
    const step = planDebtSummaryStep("Có những ai đang nợ tôi khoảng nào?");
    expect(step).toEqual({ kind: "tool", name: "get_debt_summary", arguments: {} });
  });

  it("formats debt summary without delegating to LLM", () => {
    const step = planDebtSummaryStep(
      "Có những ai đang nợ tôi khoảng nào?",
      {
        lastToolName: "get_debt_summary",
        lastToolData: [
          { counterparty_name: "Alex", amount: 100000, currency: "VND", i_owe_them: false },
        ],
      },
      { language: "vi" },
    );
    expect(step?.kind).toBe("final");
    if (step?.kind === "final") {
      expect(step.content).toContain("Alex nợ bạn");
    }
  });
});
