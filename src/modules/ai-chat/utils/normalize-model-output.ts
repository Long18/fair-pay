/**
 * Normalize raw local-model text before JSON directive parsing.
 * Strips reasoning tags, code fences, and extracts embedded JSON objects.
 */
function stripReasoningBlocks(text: string): string {
  const tags: Array<[string, string]> = [
    ["\u003cthink\u003e", "\u003c/think\u003e"],
    ["\u003credacted_thinking\u003e", "\u003c/redacted_thinking\u003e"],
  ];
  let result = text;
  for (const [open, close] of tags) {
    while (true) {
      const start = result.indexOf(open);
      if (start === -1) break;
      const end = result.indexOf(close, start + open.length);
      if (end === -1) {
        result = result.slice(0, start).trim();
        break;
      }
      result = (result.slice(0, start) + result.slice(end + close.length)).trim();
    }
  }
  return result;
}

export function normalizeModelOutput(raw: string): string {
  let text = raw.trim();
  if (!text) return text;

  text = stripReasoningBlocks(text);
  text = stripCodeFence(text);

  return text;
}

function stripCodeFence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/**
 * Try to extract a JSON object containing "type":"final" or "type":"tool_call".
 */
export function extractDirectiveJson(raw: string): string | null {
  const normalized = normalizeModelOutput(raw);
  if (!normalized) return null;

  // Fast path: whole string is JSON
  if (normalized.startsWith("{")) {
    try {
      JSON.parse(normalized);
      return normalized;
    } catch {
      // fall through to embedded extraction
    }
  }

  // Find embedded {"type":"final"|"tool_call",...} object
  const match = normalized.match(
    /\{[\s\S]*?"type"\s*:\s*"(?:final|tool_call)"[\s\S]*\}/,
  );
  if (!match) return null;

  try {
    JSON.parse(match[0]);
    return match[0];
  } catch {
    return null;
  }
}
