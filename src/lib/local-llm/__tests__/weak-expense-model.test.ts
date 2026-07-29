import { describe, expect, it } from "vitest";
import { DEFAULT_WEB_LLM_MODEL, isWeakExpenseChatModel } from "../types";

describe("isWeakExpenseChatModel", () => {
  it("defaults to Hermes 3B for expense workflows", () => {
    expect(DEFAULT_WEB_LLM_MODEL).toBe("Hermes-3-Llama-3.2-3B-q4f16_1-MLC");
    expect(isWeakExpenseChatModel(DEFAULT_WEB_LLM_MODEL)).toBe(false);
  });

  it("flags Llama 3.2 1B as weak for expense chat", () => {
    expect(isWeakExpenseChatModel("Llama-3.2-1B-Instruct-q4f16_1-MLC")).toBe(true);
  });
});
