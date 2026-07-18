import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  resolveSystemPromptTier,
} from "../system-prompt";

describe("resolveSystemPromptTier", () => {
  it("uses compact for Llama 3.2 1B (low VRAM)", () => {
    expect(resolveSystemPromptTier("Llama-3.2-1B-Instruct-q4f16_1-MLC")).toBe("compact");
  });

  it("uses full for Hermes 3B", () => {
    expect(resolveSystemPromptTier("Hermes-3-Llama-3.2-3B-q4f16_1-MLC")).toBe("full");
  });

  it("defaults to full when model is unknown", () => {
    expect(resolveSystemPromptTier("not-a-real-model")).toBe("full");
    expect(resolveSystemPromptTier()).toBe("full");
  });
});

describe("buildSystemPrompt", () => {
  it("includes debt/group detail tools and deep-links in compact tier", () => {
    const prompt = buildSystemPrompt({
      tier: "compact",
      language: "en",
      userName: "Long",
      userEmail: "long@example.com",
    });

    expect(prompt).toContain("get_debt_details");
    expect(prompt).toContain("get_group_details");
    expect(prompt).toContain("/payments/create");
    expect(prompt).toContain("prefer one tool call");
    expect(prompt).toContain("Long");
    expect(prompt.length).toBeLessThan(buildSystemPrompt({ tier: "full" }).length);
  });

  it("includes full expense preview tooling in full tier", () => {
    const prompt = buildSystemPrompt({ tier: "full", language: "vi" });

    expect(prompt).toContain("fairpay_resolve_expense_context");
    expect(prompt).toContain("fairpay_check_expense_duplicates");
    expect(prompt).toContain("Vietnamese");
    expect(prompt).toContain("get_debt_details");
    expect(prompt).toContain("get_group_details");
  });
});
