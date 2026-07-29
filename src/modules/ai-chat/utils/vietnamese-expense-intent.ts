/**
 * Lightweight Vietnamese expense intent parsing before the local LLM runs.
 * Reduces mistakes like reading "10.000" as 1.000 or re-asking for quantity.
 */

export interface ParsedVietnameseExpenseIntent {
  looks_like_add_expense: boolean;
  amount_vnd: number | null;
  expense_date: string | null;
  quantity: number | null;
  item_description: string | null;
  member_name_hint: string | null;
}

const ADD_EXPENSE_RE =
  /\b(thêm|tao|tạo|ghi|giao\s*dịch|chi\s*tiêu|mua|preview)\b/i;

const DATE_RE = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/;

const QUANTITY_RE = /(?:^|\s)(\d+)\s*(?:quả|cái|chai|lon|hộp|phần|suất|người|tô|ly|cốc)/iu;

const WITH_MEMBER_RE = /\bvới\s+([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ\s]{0,40}?)(?=\s+(?:hôm|ngày|mua|chi|vào|,|$))/iu;

const AMOUNT_RE =
  /\b(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s*(?:vnd|đ|dong|d)\b|\b(\d+(?:\.\d+)?)\s*k\b|\b(\d{1,3}(?:[.,]\d{3})+|\d{4,})\b(?=\s*(?:vnd|đ|$))/gi;

function normalizeAmountToken(raw: string): number | null {
  const lower = raw.toLowerCase().trim().replace(/\s/g, "");
  const kMatch = /^(\d+(?:[.,]\d+)?)k$/.exec(lower);
  if (kMatch) {
    const base = Number(kMatch[1].replace(",", "."));
    if (Number.isFinite(base) && base > 0) return Math.round(base * 1000);
  }

  const digits = raw.replace(/[.,\s]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  const value = Number(digits);
  if (!Number.isFinite(value) || value <= 0 || value > 9_999_999_999) return null;
  return value;
}

function parseExpenseDate(text: string): string | null {
  const match = DATE_RE.exec(text);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const iso = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  const parsed = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return iso;
}

function parseAmountVnd(text: string): number | null {
  const kMatch = text.match(/(\d+(?:[.,]\d+)?)\s*k\b/i);
  if (kMatch?.[1]) {
    const fromK = normalizeAmountToken(`${kMatch[1]}k`);
    if (fromK !== null) return fromK;
  }

  const matches = [...text.matchAll(AMOUNT_RE)];
  let best: number | null = null;
  for (const match of matches) {
    const token = match[1] ?? match[2] ?? match[3];
    if (!token) continue;
    const value = normalizeAmountToken(token);
    if (value !== null) best = value;
  }
  return best;
}

function parseItemDescription(text: string): string | null {
  const mua = text.match(/\bmua\s+(.+?)(?=\s+\d|\s+với|\s+ngày|$)/iu);
  if (mua?.[1]) {
    const desc = mua[1].replace(/\d+\s*(?:quả|cái).*/iu, "").trim();
    if (desc.length >= 2) return desc.slice(0, 120);
  }
  return null;
}

function parseMemberHint(text: string): string | null {
  const match = WITH_MEMBER_RE.exec(text);
  if (!match?.[1]) return null;
  const name = match[1].trim();
  return name.length >= 2 ? name : null;
}

export function parseVietnameseExpenseIntent(text: string): ParsedVietnameseExpenseIntent {
  const trimmed = text.trim();
  return {
    looks_like_add_expense: ADD_EXPENSE_RE.test(trimmed),
    amount_vnd: parseAmountVnd(trimmed),
    expense_date: parseExpenseDate(trimmed),
    quantity: (() => {
      const q = QUANTITY_RE.exec(trimmed);
      return q ? Number(q[1]) : null;
    })(),
    item_description: parseItemDescription(trimmed),
    member_name_hint: parseMemberHint(trimmed),
  };
}

export function intentHasStructuredHints(intent: ParsedVietnameseExpenseIntent): boolean {
  return (
    intent.looks_like_add_expense ||
    intent.amount_vnd !== null ||
    intent.expense_date !== null ||
    intent.quantity !== null ||
    intent.item_description !== null ||
    intent.member_name_hint !== null
  );
}

/**
 * Appends a machine-readable block the system prompt tells the model to trust.
 */
export function appendExpenseIntentToUserMessage(
  userText: string,
  intent: ParsedVietnameseExpenseIntent,
): string {
  if (!intentHasStructuredHints(intent)) return userText;
  const payload = {
    ...intent,
    note:
      "amount_vnd is integer VND (10.000 VND => 10000). For line-item expenses, use amount_vnd as the total; quantity is descriptive only unless user asked per-unit pricing.",
    default_transaction_type: "group",
  };
  return `${userText.trim()}\n\n[FairPay parsed hints — use when consistent with the user message]\n${JSON.stringify(payload)}`;
}
