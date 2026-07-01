import { describe, expect, it } from "vitest";
import { parseAssistantStream } from "../parse-assistant-stream";

describe("parseAssistantStream", () => {
  // ── Empty / trivial ─────────────────────────────────────────────────────────

  it("returns empty result for empty string", () => {
    const r = parseAssistantStream("");
    expect(r.reasoning).toBeNull();
    expect(r.isReasoningOpen).toBe(false);
    expect(r.displayContent).toBe("");
    expect(r.isFinalParsed).toBe(false);
  });

  // ── No contract (plain text fallback) ───────────────────────────────────────

  it("returns raw text as displayContent when no <think> or JSON contract present", () => {
    const r = parseAssistantStream("Hello there!");
    expect(r.reasoning).toBeNull();
    expect(r.displayContent).toBe("Hello there!");
    expect(r.isFinalParsed).toBe(false);
  });

  // ── Fully streamed: <think> + valid JSON ─────────────────────────────────────

  it("extracts reasoning and content from a complete message", () => {
    const raw = `<think>I should greet the user.</think>{"type":"final","content":"Xin chào!"}`;
    const r = parseAssistantStream(raw);
    expect(r.reasoning).toBe("I should greet the user.");
    expect(r.isReasoningOpen).toBe(false);
    expect(r.displayContent).toBe("Xin chào!");
    expect(r.isFinalParsed).toBe(true);
  });

  it("strips code fences around the JSON block", () => {
    const raw = "<think>reasoning</think>\n```json\n{\"type\":\"final\",\"content\":\"hi\"}\n```";
    const r = parseAssistantStream(raw);
    expect(r.displayContent).toBe("hi");
    expect(r.isFinalParsed).toBe(true);
  });

  // ── Still-open reasoning block ───────────────────────────────────────────────

  it("sets isReasoningOpen when </think> has not arrived yet", () => {
    const raw = "<think>Still reasoning about this...";
    const r = parseAssistantStream(raw);
    expect(r.reasoning).toBe("Still reasoning about this...");
    expect(r.isReasoningOpen).toBe(true);
    expect(r.displayContent).toBe("");
    expect(r.isFinalParsed).toBe(false);
  });

  // ── Partial JSON streaming ───────────────────────────────────────────────────

  it("extracts partial content from incomplete JSON", () => {
    const raw = `<think>done</think>{"type":"final","content":"partial ans`;
    const r = parseAssistantStream(raw);
    expect(r.isFinalParsed).toBe(false);
    expect(r.displayContent).toBe("partial ans");
  });

  it("unescapes \\n in partial content", () => {
    const raw = `<think>x</think>{"type":"final","content":"line1\\nline2`;
    const r = parseAssistantStream(raw);
    expect(r.displayContent).toBe("line1\nline2");
  });

  it("unescapes \\\" in partial content", () => {
    const raw = `<think>x</think>{"type":"final","content":"say \\"hi\\"`;
    const r = parseAssistantStream(raw);
    expect(r.displayContent).toBe(`say "hi"`);
  });

  // ── Multiple <think> rounds ──────────────────────────────────────────────────

  it("uses the LAST <think> block when multiple are present", () => {
    const raw =
      `<think>first round reasoning</think>tool_result\n` +
      `<think>second round reasoning</think>{"type":"final","content":"done"}`;
    const r = parseAssistantStream(raw);
    expect(r.reasoning).toBe("second round reasoning");
    expect(r.displayContent).toBe("done");
    expect(r.isFinalParsed).toBe(true);
  });

  // ── No <think> block, only JSON ──────────────────────────────────────────────

  it("parses final JSON without a reasoning block", () => {
    const raw = `{"type":"final","content":"Direct answer."}`;
    const r = parseAssistantStream(raw);
    expect(r.reasoning).toBeNull();
    expect(r.displayContent).toBe("Direct answer.");
    expect(r.isFinalParsed).toBe(true);
  });

  // ── Acceptance criteria coverage ────────────────────────────────────────────

  // AC 5: plain text with no contract renders as-is
  it("AC5: non-conforming output renders as-is without reasoning block", () => {
    const raw = "Here is a plain response with no JSON wrapper.";
    const r = parseAssistantStream(raw);
    expect(r.reasoning).toBeNull();
    expect(r.displayContent).toBe(raw);
    expect(r.isFinalParsed).toBe(false);
  });

  // AC 6: multiple <think> → only last shown
  it("AC6: only last <think> block is surfaced across tool rounds", () => {
    const raw = "<think>round1</think>intermediate<think>round2</think>final text";
    const r = parseAssistantStream(raw);
    expect(r.reasoning).toBe("round2");
  });
});
