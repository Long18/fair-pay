import { describe, expect, it } from "vitest";
import { extractDirectiveJson, normalizeModelOutput } from "../normalize-model-output";

describe("normalizeModelOutput", () => {
  it("strips closed reasoning blocks before JSON", () => {
    const raw = "\u003cthink\u003eLet me check.\u003c/think\u003e\n{\"type\":\"final\",\"content\":\"Done.\"}";
    expect(normalizeModelOutput(raw)).toBe('{"type":"final","content":"Done."}');
  });

  it("extracts embedded tool_call JSON from prose", () => {
    const raw = 'Sure! {"type":"tool_call","name":"get_debt_summary","arguments":{}}';
    expect(extractDirectiveJson(raw)).toBe(
      '{"type":"tool_call","name":"get_debt_summary","arguments":{}}',
    );
  });
});
