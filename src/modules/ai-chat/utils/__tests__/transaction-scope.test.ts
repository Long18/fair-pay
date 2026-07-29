import { describe, expect, it } from "vitest";
import {
  effectiveTransactionScope,
  parseExpenseContext,
  parseTransactionScope,
} from "../transaction-scope";

describe("parseTransactionScope", () => {
  it("detects loan/personal when user rejects group", () => {
    expect(parseTransactionScope("Không phải group, là loan cá nhân thôi")).toBe("loan");
    expect(parseTransactionScope("personal 1-1 only")).toBe("personal");
  });

  it("detects explicit group expense", () => {
    expect(parseTransactionScope("Thêm chi tiêu nhóm Du lịch 10k")).toBe("group");
    expect(parseTransactionScope("Đổi sang group expense nhóm Trip")).toBe("group");
  });
});

describe("parseExpenseContext", () => {
  it("parses group name hint", () => {
    const ctx = parseExpenseContext("Thêm chi tiêu nhóm Du lịch 10.000 VND");
    expect(ctx.group_name_hint).toBe("Du lịch");
    expect(effectiveTransactionScope(ctx)).toBe("group");
  });
});
