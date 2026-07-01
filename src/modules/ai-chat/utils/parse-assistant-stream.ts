export interface ParsedAssistantStream {
  /** Content of the last <think>...</think> block, or null if none found */
  reasoning: string | null;
  /** True when a <think> tag opened but no matching </think> has arrived yet */
  isReasoningOpen: boolean;
  /** Clean user-facing text (extracted from JSON contract or raw fallback) */
  displayContent: string;
  /** True only when the {"type":"final","content":"..."} JSON was fully parsed */
  isFinalParsed: boolean;
}

/**
 * Parses raw streamed model output into structured display data.
 * Safe to call on every render, including mid-stream partial content.
 */
export function parseAssistantStream(raw: string): ParsedAssistantStream {
  if (!raw) {
    return { reasoning: null, isReasoningOpen: false, displayContent: "", isFinalParsed: false };
  }

  let reasoning: string | null = null;
  let isReasoningOpen = false;
  let remainder = raw;

  // Extract the LAST <think>...</think> block (multiple rounds accumulate into one message)
  const lastThinkOpen = raw.lastIndexOf("<think>");
  if (lastThinkOpen !== -1) {
    const closeTag = raw.indexOf("</think>", lastThinkOpen);
    if (closeTag !== -1) {
      // Fully closed reasoning block
      reasoning = raw.slice(lastThinkOpen + 7, closeTag);
      remainder = raw.slice(closeTag + 8).trim();
    } else {
      // Still streaming reasoning (no close tag yet)
      reasoning = raw.slice(lastThinkOpen + 7);
      isReasoningOpen = true;
      remainder = "";
    }
  }

  // Parse the remainder as the final answer
  const { displayContent, isFinalParsed } = extractDisplayContent(remainder);

  return { reasoning, isReasoningOpen, displayContent, isFinalParsed };
}

function extractDisplayContent(text: string): { displayContent: string; isFinalParsed: boolean } {
  if (!text) {
    return { displayContent: "", isFinalParsed: false };
  }

  // Strip code fences: ```json ... ``` or ``` ... ```
  const stripped = stripCodeFences(text);

  // Try full JSON parse first
  try {
    const parsed = JSON.parse(stripped);
    if (parsed && parsed.type === "final" && typeof parsed.content === "string") {
      return { displayContent: parsed.content, isFinalParsed: true };
    }
  } catch {
    // Not valid JSON yet — try partial extraction
  }

  // Partial JSON extraction: look for "content" field value being streamed
  const partialMatch = stripped.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/);
  if (partialMatch) {
    const rawValue = partialMatch[1];
    // Try to unescape properly
    try {
      const unescaped = JSON.parse(`"${rawValue}"`);
      return { displayContent: unescaped, isFinalParsed: false };
    } catch {
      // Fallback: use raw captured value with basic unescaping
      return { displayContent: rawValue.replace(/\\n/g, "\n").replace(/\\"/g, '"'), isFinalParsed: false };
    }
  }

  // Check if it looks like it's starting a JSON object but hasn't reached "content" yet
  if (/^\s*\{?\s*"?t/.test(stripped) && stripped.length < 30) {
    // Very early JSON streaming — show nothing yet rather than raw JSON fragments
    return { displayContent: "", isFinalParsed: false };
  }

  // Fallback: not JSON at all, render as-is (non-conforming output)
  return { displayContent: text, isFinalParsed: false };
}

function stripCodeFences(text: string): string {
  // Match ```json ... ``` or ``` ... ``` (with optional language tag)
  const fenceMatch = text.match(/^```(?:\w+)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return text;
}
