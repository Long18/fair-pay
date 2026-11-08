import { describe, expect, it } from "vitest";
import { detectUserMessageLanguage, resolveResponseLanguage } from "../detect-user-message-language";

describe("detect-user-message-language", () => {
  it("detects Vietnamese diacritics and hints", () => {
    expect(detectUserMessageLanguage("Tổng hợp FairPay")).toBe("vi");
    expect(detectUserMessageLanguage("Who owes me")).toBe("en");
    expect(detectUserMessageLanguage("toi no bao nhieu")).toBe("vi");
  });

  it("falls back to UI locale when text empty", () => {
    expect(resolveResponseLanguage("", "vi")).toBe("vi");
    expect(resolveResponseLanguage("", "en-US")).toBe("en");
  });
});
