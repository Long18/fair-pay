import { describe, expect, it } from "vitest";
import {
  looksLikeCapabilitiesQuery,
  looksLikeReadDigestQuery,
  planAssistantMetaStep,
} from "../assistant-meta";

describe("assistant-meta", () => {
  it("answers capabilities without tools", () => {
    expect(looksLikeCapabilitiesQuery("bạn có thể làm gì")).toBe(true);
    const step = planAssistantMetaStep("những khả năng bạn có thể làm trong fairpay nè", undefined, {
      language: "vi",
    });
    expect(step?.kind).toBe("final");
    expect(step && step.kind === "final" ? step.content : "").toContain("FairPay Assistant");
  });

  it("starts digest with debt tool", () => {
    expect(looksLikeReadDigestQuery("làm 10 thứ ở trên đi")).toBe(true);
    const step = planAssistantMetaStep("Tổng hợp FairPay", { readDigestActive: true, digestBag: {} });
    expect(step).toEqual({ kind: "tool", name: "get_debt_summary", arguments: {} });
  });

  it("detects pasted multi-topic list as digest", () => {
    const paste =
      "Tạo giao dịch nhóm. Tìm giao dịch gần đây. Xem nợ đối tác. Xem nhóm. Xem bình luận giao dịch.";
    expect(looksLikeReadDigestQuery(paste)).toBe(true);
  });
});
