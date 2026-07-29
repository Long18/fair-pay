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

const ADD_EXPENSE_EN_RE =
  /\b(add|create|record|log)\b[\s\S]{0,40}\b(transaction|expense)\b/i;

const DATE_ISO_RE = /\b(?:dated|date)\s+(\d{4}-\d{2}-\d{2})\b/i;

const EN_TOTAL_AMOUNT_RE = /\btotal\s+amount\s*=\s*([\d,]+)/i;
const EN_UNIT_PRICE_RE = /\bunit\s+price\s*=\s*([\d,]+)/i;
const EN_QUANTITY_RE = /\bquantity\s*=\s*(\d+)/i;
const EN_PARTY_RE = /\b(?:buyer\/party|party|with)\s+(?:is\s+)?['"]([^'"]+)['"]/i;
const EN_ITEM_RE = /\bitem\s+(?:purchased\s+)?is\s+(.+?)(?=,|\s+quantity|\s+unit|\s+total|$)/i;

function parseEnglishExpenseFields(text: string): Partial<ParsedVietnameseExpenseIntent> {
  const trimmed = text.trim();
  const partial: Partial<ParsedVietnameseExpenseIntent> = {};

  if (ADD_EXPENSE_EN_RE.test(trimmed)) {
    partial.looks_like_add_expense = true;
  }

  const iso = DATE_ISO_RE.exec(trimmed);
  if (iso?.[1]) partial.expense_date = iso[1];

  const total = EN_TOTAL_AMOUNT_RE.exec(trimmed) ?? EN_UNIT_PRICE_RE.exec(trimmed);
  if (total?.[1]) {
    const parsed = normalizeAmountToken(total[1]);
    if (parsed !== null) partial.amount_vnd = parsed;
  }

  const qty = EN_QUANTITY_RE.exec(trimmed);
  if (qty?.[1]) partial.quantity = Number(qty[1]);

  const party = EN_PARTY_RE.exec(trimmed);
  if (party?.[1]) partial.member_name_hint = party[1].trim();

  const item = EN_ITEM_RE.exec(trimmed);
  if (item?.[1]) {
    const desc = item[1].trim();
    if (desc.length >= 2) partial.item_description = desc.slice(0, 120);
  }

  return partial;
}

function mergeExpenseIntent(
  base: ParsedVietnameseExpenseIntent,
  extra: Partial<ParsedVietnameseExpenseIntent>,
): ParsedVietnameseExpenseIntent {
  return {
    looks_like_add_expense: base.looks_like_add_expense || extra.looks_like_add_expense === true,
    amount_vnd: extra.amount_vnd ?? base.amount_vnd,
    expense_date: extra.expense_date ?? base.expense_date,
    quantity: extra.quantity ?? base.quantity,
    item_description: extra.item_description ?? base.item_description,
    member_name_hint: extra.member_name_hint ?? base.member_name_hint,
  };
}

export function parseExpenseIntent(text: string): ParsedVietnameseExpenseIntent {
  return mergeExpenseIntent(parseVietnameseExpenseIntent(text), parseEnglishExpenseFields(text));
}

export function shouldAutoStartExpenseWorkflow(
  intent: ParsedVietnameseExpenseIntent,
): boolean {
  return intent.looks_like_add_expense || intent.amount_vnd !== null;
}

function normalizeForEchoCompare(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[“”"']/g, "")
    .trim();
}

/** True when the model parrots the user instead of using tools / JSON contract. */
export function isEchoOfUserMessage(assistantText: string, userText: string): boolean {
  const assistant = normalizeForEchoCompare(assistantText);
  const user = normalizeForEchoCompare(userText);
  if (!assistant || !user) return false;
  if (assistant === user) return true;
  if (user.length >= 12 && assistant.includes(user)) return true;
  if (assistant.length >= 12 && user.includes(assistant) && assistant.length / user.length >= 0.85) {
    return true;
  }
  return false;
}

export function buildEchoRecoveryMessage(language?: string): string {
  const vi = (language ?? "").toLowerCase().startsWith("vi");
  if (vi) {
    return (
      "Mình không thể xử lý yêu cầu này với mô hình hiện tại (thường gặp với Llama 1B). " +
      "Hãy chọn **Hermes 3 · Llama 3.2 3B** trong bộ chọn model, rồi gửi lại kèm **tên nhóm** " +
      "(ví dụ: «Thêm chi tiêu nhóm Du lịch, 10.000 VND, mua chuối»). Chi tiêu nhóm cần thành viên Tuyến trong nhóm đó."
    );
  }
  return (
    "I could not process this with the current local model (common on Llama 1B). " +
    "Switch to **Hermes 3 · Llama 3.2 3B**, then retry with a **group name** " +
    '(e.g. "Add expense to Trip group: 10,000 VND, 1 banana, split with Tuyến").'
  );
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
