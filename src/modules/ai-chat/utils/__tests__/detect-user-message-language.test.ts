import { describe, expect, it } from "vitest";
import {
  detectUserMessageLanguage,
  resolveResponseLanguage,
} from "../detect-user-message-language";

describe("detectUserMessageLanguage", () => {
  it("detects Vietnamese from diacritics", () => {
    expect(detectUserMessageLanguage("ai đang nợ tôi bao nhiêu")).toBe("vi");
  });

  it("detects Vietnamese from common words without diacritics", () => {
    expect(detectUserMessageLanguage("cho toi xem cac nhom")).toBe("vi");
  });

  it("defaults to English for Latin ASCII questions", () => {
    expect(detectUserMessageLanguage("how much do I owe?")).toBe("en");
  });
});

describe("resolveResponseLanguage", () => {
  it("falls back to UI language when text is empty", () => {
    expect(resolveResponseLanguage("", "vi")).toBe("vi");
    expect(resolveResponseLanguage("   ", "en-US")).toBe("en");
  });
});
