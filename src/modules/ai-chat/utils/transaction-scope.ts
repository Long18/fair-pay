import type { ParsedVietnameseExpenseIntent } from "./vietnamese-expense-intent";
import { parseExpenseIntent } from "./vietnamese-expense-intent";

export type TransactionScope = "group" | "personal" | "loan" | "unknown";

const FORCE_GROUP_RE =
  /\b(đổi|doi|chuyển|chuyen|switch)\b[\s\S]{0,40}\b(group\s*expense|chi\s*tiêu\s*nhóm|group)\b/i;

const EXPLICIT_GROUP_RE =
  /\b(nhóm|group|chi\s*tiêu\s*nhóm|group\s*expense)\b/i;

const PERSONAL_RE =
  /\b(cá\s*nhân|ca\s*nhan|personal|1-1|1\s*on\s*1|một\s*một|mot\s*mot|friends?)\b/i;

const NOT_GROUP_RE =
  /\b(không\s*phải\s*(nhóm|group)|not\s*a?\s*group|không\s*phải\s*chi\s*tiêu\s*nhóm)\b/i;

const LOAN_RE =
  /\b(vay|cho\s*vay|mượn|muon|loan|khoản\s*vay)\b/i;

const GROUP_NAME_VI_RE = /\bnhóm\s+([A-Za-zÀ-ỹ0-9][A-Za-zÀ-ỹ0-9\s_-]{0,60})/iu;
const GROUP_NAME_EN_RE = /\b(?:to|in)\s+([A-Za-z0-9][A-Za-z0-9\s_-]{0,60})\s+group\b/i;
const GROUP_NAME_SHORT_RE = /\bgroup\s+([A-Za-z0-9][A-Za-z0-9\s_-]{0,60})\b/i;

export interface ParsedExpenseContext {
  intent: ParsedVietnameseExpenseIntent;
  transaction_scope: TransactionScope;
  wants_group_expense_override: boolean;
  group_name_hint: string | null;
}

export function parseGroupNameHint(text: string): string | null {
  const trimmed = text.trim();
  const vi = GROUP_NAME_VI_RE.exec(trimmed);
  if (vi?.[1]) {
    const name = trimGroupNameHint(vi[1].trim());
    if (name.length >= 2) return name.slice(0, 120);
  }
  const en = GROUP_NAME_EN_RE.exec(trimmed) ?? GROUP_NAME_SHORT_RE.exec(trimmed);
  if (en?.[1]) {
    const name = trimGroupNameHint(en[1].trim());
    if (name.length >= 2) return name.slice(0, 120);
  }
  return null;
}

/** Strip trailing amount tokens (e.g. "Du lịch 10.000") from a captured group name. */
function trimGroupNameHint(name: string): string {
  return name
    .replace(/\s+[\d.,]+(?:\s*(?:k|nghìn|ngàn|triệu|tr|vnd|đ|d))?$/iu, "")
    .trim();
}

export function parseTransactionScope(text: string): TransactionScope {
  const trimmed = text.trim();
  if (FORCE_GROUP_RE.test(trimmed) || (EXPLICIT_GROUP_RE.test(trimmed) && !NOT_GROUP_RE.test(trimmed))) {
    if (LOAN_RE.test(trimmed) && NOT_GROUP_RE.test(trimmed)) {
      return "loan";
    }
    if (PERSONAL_RE.test(trimmed) && NOT_GROUP_RE.test(trimmed) && !EXPLICIT_GROUP_RE.test(trimmed)) {
      return "personal";
    }
    return "group";
  }

  if (NOT_GROUP_RE.test(trimmed) || (PERSONAL_RE.test(trimmed) && !EXPLICIT_GROUP_RE.test(trimmed))) {
    return LOAN_RE.test(trimmed) ? "loan" : "personal";
  }

  if (LOAN_RE.test(trimmed) && !EXPLICIT_GROUP_RE.test(trimmed)) {
    return "loan";
  }

  return "unknown";
}

export function parseExpenseContext(text: string): ParsedExpenseContext {
  const intent = parseExpenseIntent(text);
  const wants_group_expense_override = FORCE_GROUP_RE.test(text.trim());
  let transaction_scope = parseTransactionScope(text);
  if (wants_group_expense_override) {
    transaction_scope = "group";
  }
  return {
    intent,
    transaction_scope,
    wants_group_expense_override,
    group_name_hint: parseGroupNameHint(text),
  };
}

export function effectiveTransactionScope(ctx: ParsedExpenseContext): TransactionScope {
  if (ctx.wants_group_expense_override) return "group";
  return ctx.transaction_scope;
}

export function buildFriendsExpensePath(intent: ParsedVietnameseExpenseIntent, isLoan: boolean): string {
  const params = new URLSearchParams();
  if (intent.item_description) params.set("description", intent.item_description);
  if (intent.amount_vnd != null) params.set("amount", String(intent.amount_vnd));
  if (intent.expense_date) params.set("expense_date", intent.expense_date);
  if (isLoan) params.set("loan", "1");
  const qs = params.toString();
  return qs ? `/friends?${qs}` : "/friends";
}

export function buildPersonalOrLoanGuidance(
  scope: "personal" | "loan",
  intent: ParsedVietnameseExpenseIntent,
  language?: string,
): string {
  const vi = (language ?? "").toLowerCase().startsWith("vi");
  const path = buildFriendsExpensePath(intent, scope === "loan");
  const amount =
    intent.amount_vnd != null
      ? `${intent.amount_vnd.toLocaleString("vi-VN")} VND`
      : vi
        ? "(chưa có số tiền)"
        : "(amount not specified)";

  if (vi) {
    const kind = scope === "loan" ? "khoản vay (loan)" : "chi tiêu cá nhân / 1-1";
    return (
      `**Không thể tạo proposal nhóm** cho ${kind} qua agent hiện tại — API FairPay v1 chỉ hỗ trợ preview \`transaction_type: "group"\`.\n\n` +
      `Mình hiểu: ${intent.item_description ?? "chi tiêu"} · ${amount}` +
      (intent.expense_date ? ` · ngày ${intent.expense_date}` : "") +
      ".\n\n" +
      "**Bạn có thể:**\n" +
      "1. **Tiếp tục trên Friends** — mở FairPay → Bạn bè → tạo chi tiêu" +
      (scope === "loan" ? " và bật **Đây là khoản vay**" : "") +
      ` ([mở Friends](${path})).\n` +
      "2. **Đổi sang chi tiêu nhóm** — trả lời «Đổi sang group expense» kèm tên nhóm, payer, participants và cách chia (equal/exact).\n\n" +
      "«2 người» không tự động nghĩa là nhóm; loan là người mượn nợ **100%**, khác chia đều trong nhóm."
    );
  }

  const kind = scope === "loan" ? "a personal loan" : "a personal / 1-on-1 expense";
  return (
    `**Cannot create a group expense preview** for ${kind} — FairPay agent v1 only supports \`transaction_type: "group"\`.\n\n` +
    `Understood: ${intent.item_description ?? "expense"} · ${amount}` +
    (intent.expense_date ? ` · date ${intent.expense_date}` : "") +
    ".\n\n" +
    "**Options:**\n" +
    "1. **Continue in Friends** — create the expense there" +
    (scope === "loan" ? " with **Loan** enabled" : "") +
    ` ([open Friends](${path})).\n` +
    '2. **Switch to a group expense** — reply "Switch to group expense" with group name, payer, participants, and split method.\n\n' +
    '"Two people" alone does not imply a group; a loan means the borrower owes **100%**, not an equal group split.'
  );
}

export function buildMissingGroupNameMessage(language?: string): string {
  const vi = (language ?? "").toLowerCase().startsWith("vi");
  if (vi) {
    return (
      "Để tạo preview chi tiêu **nhóm**, bạn cho mình **tên nhóm** FairPay (ví dụ: «Thêm chi tiêu nhóm Du lịch, 10.000 VND, mua chuối, chia với Tuyến»).\n\n" +
      "Nếu đây là **loan/cá nhân**, nói rõ «không phải nhóm, là loan» — mình sẽ hướng dẫn qua Friends."
    );
  }
  return (
    "To preview a **group** expense, tell me the **FairPay group name** (e.g. \"Add expense to Trip group: 10,000 VND, bananas, split with Alex\").\n\n" +
    'If this is **personal/loan**, say so — I will guide you via Friends instead of forcing a group.'
  );
}
