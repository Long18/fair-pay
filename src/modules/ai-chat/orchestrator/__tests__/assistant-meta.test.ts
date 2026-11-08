import { describe, expect, it } from "vitest";
import {
  looksLikeCapabilitiesQuery,
  looksLikeReadDigestQuery,
  planAssistantMetaStep,
} from "../assistant-meta";
import { buildCapabilitiesMessage } from "../../utils/assistant-capabilities-copy";

describe("assistant-meta", () => {
  it("answers capabilities without tools", () => {
    expect(looksLikeCapabilitiesQuery("bạn có thể làm gì")).toBe(true);
    const step = planAssistantMetaStep("những khả năng bạn có thể làm trong fairpay nè", undefined, {
      language: "vi",
    });
    expect(step?.kind).toBe("final");
    expect(step && step.kind === "final" ? step.content : "").toContain("FairPay Assistant");
    if (step?.kind === "final") {
      expect(step.assistantCapabilities).toBe(true);
    }
  });

  it("starts digest with debt tool", () => {
    expect(looksLikeReadDigestQuery("làm 10 thứ ở trên đi")).toBe(true);
    const step = planAssistantMetaStep("Tổng hợp FairPay", { readDigestActive: true, digestBag: {} });
    expect(step).toEqual({ kind: "tool", name: "get_debt_summary", arguments: {} });
  });

  it("attaches readDigestBag when digest tools are complete", () => {
    const step = planAssistantMetaStep(
      "Tổng hợp FairPay",
      {
        readDigestActive: true,
        digestBag: {
          debt: [],
          groups: [],
          friends: [],
          expenses: [],
          comments: [],
        },
      },
      { language: "vi" },
    );
    expect(step?.kind).toBe("final");
    if (step?.kind === "final") {
      expect(step.readDigestBag).toBeDefined();
      expect(step.content).toContain("Tổng hợp FairPay");
    }
  });

  it("capabilities copy follows message language", () => {
    expect(buildCapabilitiesMessage("en")).toContain("what I can do");
    expect(buildCapabilitiesMessage("vi")).toContain("việc tôi làm được");
  });

  it("classifies English digest and capabilities", () => {
    expect(looksLikeReadDigestQuery("FairPay summary")).toBe(true);
    expect(looksLikeCapabilitiesQuery("what can you do")).toBe(true);
  });

  it("detects pasted multi-topic list as digest", () => {
    const paste =
      "Tạo giao dịch nhóm. Tìm giao dịch gần đây. Xem nợ đối tác. Xem nhóm. Xem bình luận giao dịch.";
    expect(looksLikeReadDigestQuery(paste)).toBe(true);
  });
});
