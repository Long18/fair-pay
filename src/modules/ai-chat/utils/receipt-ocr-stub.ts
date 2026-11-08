/**
 * MVP receipt "OCR": extract amount + description from an image filename
 * (and optional user prompt). No vision API / MCP commit tools.
 */

export interface ReceiptDraftFields {
  description: string;
  amount: number | null;
  sourceFilename: string;
  /** Truncated OCR excerpt included in the chat prompt (when present). */
  ocrText?: string;
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

function firstMeaningfulOcrLine(ocrText: string): string {
  for (const line of ocrText.split(/\n+/)) {
    const trimmed = line.replace(/\s+/g, " ").trim();
    if (trimmed.length >= 3 && !/^\d+$/.test(trimmed)) {
      return trimmed.slice(0, 120);
    }
  }
  return "";
}

function pickAmountFromText(...sources: string[]): number | null {
  for (const source of sources) {
    if (!source) continue;
    for (const pattern of AMOUNT_PATTERNS) {
      const match = source.match(pattern);
      if (!match) continue;
      const token = match[1] ?? match[0];
      const amount = normalizeAmountToken(token);
      if (amount !== null) return amount;
    }
    const loose = source.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,})/);
    if (loose) {
      const amount = normalizeAmountToken(loose[1] ?? loose[0]);
      if (amount !== null) return amount;
    }
  }
  return null;
}

export interface ExtractReceiptDraftOptions {
  userPrompt?: string;
  ocrText?: string;
}

/**
 * Pull amount + description from filename, optional user prompt, and optional OCR text.
 */
export function extractReceiptDraft(
  filename: string,
  options: ExtractReceiptDraftOptions = {},
): ReceiptDraftFields {
  const sourceFilename = filename.trim() || "receipt.jpg";
  const stem = stripExtension(sourceFilename);
  const prompt = options.userPrompt?.trim() ?? "";
  const ocrText = options.ocrText?.trim() ?? "";

  const amount = pickAmountFromText(prompt, ocrText, stem);

  const fromFile = humanizeFilenameStem(stem);
  const fromOcr = firstMeaningfulOcrLine(ocrText);
  const description =
    prompt.replace(/(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s*(?:vnd|đ)?/gi, "").trim() ||
    fromOcr ||
    fromFile ||
    "Receipt expense";

  return {
    description,
    amount,
    sourceFilename,
    ...(ocrText ? { ocrText: ocrText.slice(0, 2_000) } : {}),
  };
}

/** @deprecated Prefer {@link extractReceiptDraft} */
export function extractReceiptDraftFromFilename(
  filename: string,
  userPrompt?: string,
): ReceiptDraftFields {
  return extractReceiptDraft(filename, { userPrompt });
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
  const ocrPart = draft.ocrText
    ? `On-device OCR excerpt: """${draft.ocrText.slice(0, 800)}""".`
    : "No reliable OCR text (used filename heuristics only).";
  return [
    `I attached a receipt image named "${draft.sourceFilename}".`,
    ocrPart,
    `Extracted draft: description "${draft.description}", ${amountPart}.`,
    "Please prepare a group expense preview for me to confirm in the UI.",
    "Ask for any missing group, payer, participants, or split details before calling fairpay_preview_expense.",
  ].join(" ");
}
