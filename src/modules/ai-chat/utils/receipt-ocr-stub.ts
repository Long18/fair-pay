/**
 * MVP receipt "OCR": extract amount + description from an image filename
 * (and optional user prompt). No vision API / MCP commit tools.
 */

export interface ReceiptDraftFields {
  description: string;
  amount: number | null;
  sourceFilename: string;
}

const AMOUNT_PATTERNS: RegExp[] = [
  // 150000vnd, 150.000đ, 150,000 VND
  /(\d{1,3}(?:[.,]\d{3})+|\d{4,})(?:\s*)(?:vnd|đ|dongs?)?/i,
  // amount_150000 / amt-150000
  /(?:amount|amt|total)[_-]?(\d{4,})/i,
];

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function normalizeAmountToken(raw: string): number | null {
  const digits = raw.replace(/[.,\s]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  const value = Number(digits);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function humanizeFilenameStem(stem: string): string {
  return stem
    .replace(/[_-]+/g, " ")
    .replace(/\d{1,3}(?:[.,]\d{3})+|\d{4,}/g, " ")
    .replace(/\b(?:vnd|đ|dong|receipt|bill|img|image|photo|scan)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pull a VND-ish integer amount and a short description from a receipt filename.
 * Optional `userPrompt` overrides description when non-empty.
 */
export function extractReceiptDraftFromFilename(
  filename: string,
  userPrompt?: string,
): ReceiptDraftFields {
  const sourceFilename = filename.trim() || "receipt.jpg";
  const stem = stripExtension(sourceFilename);
  const prompt = userPrompt?.trim() ?? "";

  let amount: number | null = null;
  for (const pattern of AMOUNT_PATTERNS) {
    const match = stem.match(pattern) ?? prompt.match(pattern);
    if (!match) continue;
    const token = match[1] ?? match[0];
    amount = normalizeAmountToken(token);
    if (amount !== null) break;
  }

  // Prompt-only amount e.g. "lunch 85000"
  if (amount === null && prompt) {
    const promptAmount = prompt.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,})/);
    if (promptAmount) {
      amount = normalizeAmountToken(promptAmount[1] ?? promptAmount[0]);
    }
  }

  const fromFile = humanizeFilenameStem(stem);
  const description =
    prompt.replace(/(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s*(?:vnd|đ)?/gi, "").trim() ||
    fromFile ||
    "Receipt expense";

  return { description, amount, sourceFilename };
}

/**
 * Build a chat user message that steers the orchestrator toward
 * `fairpay_preview_expense` (UI confirm card) without inventing commit tools.
 */
export function buildReceiptDraftPrompt(draft: ReceiptDraftFields): string {
  const amountPart =
    draft.amount !== null
      ? `amount ${draft.amount.toLocaleString("vi-VN")} VND`
      : "amount unknown (ask me)";
  return [
    `I attached a receipt image named "${draft.sourceFilename}".`,
    `Extracted draft: description "${draft.description}", ${amountPart}.`,
    "Please prepare a group expense preview for me to confirm in the UI.",
    "Ask for any missing group, payer, participants, or split details before calling fairpay_preview_expense.",
  ].join(" ");
}
