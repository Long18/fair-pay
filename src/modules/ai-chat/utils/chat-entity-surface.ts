import type { Balance } from "@/components/dashboard/balance/balance-types";
import { debtRows } from "./format-debt-summary";
import { extractGroups, type GroupListRow } from "./format-group-list";
import { friendsFromPayload, type FriendRow } from "./format-friends-list";
import { rowsFromData, type ExpenseListRow } from "./format-expenses-list";
import type { ReadIntentId } from "../orchestrator/read-intent-registry";
import { extractFeedRows } from "./format-expense-comments";
import type { ExpenseCommentRow } from "./format-expense-comments";

function amountNumber(amount: number | string | undefined): number {
  if (amount === undefined || amount === null) return 0;
  const n = typeof amount === "number" ? amount : Number(String(amount).replace(/[.,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function topExpensesFromPayload(data: unknown, topN = 10): ExpenseListRow[] {
  return rowsFromData(data)
    .slice()
    .sort((a, b) => amountNumber(b.amount) - amountNumber(a.amount))
    .slice(0, topN);
}

export type ChatEntitySurface =
  | { kind: "groups"; groups: GroupListRow[] }
  | { kind: "friends"; friends: FriendRow[]; viewerUserId?: string }
  | { kind: "balances"; balances: Balance[] }
  | { kind: "expenses"; expenses: ExpenseListRow[]; currency?: string }
  | { kind: "comments"; comments: ExpenseCommentRow[] };

function debtToBalance(
  row: ReturnType<typeof debtRows>[number],
): Balance | null {
  const amount = Number(row.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const name = row.counterparty_name?.trim();
  if (!name) return null;
  return {
    counterparty_id: row.counterparty_id ?? null,
    counterparty_name: name,
    amount,
    currency: row.currency ?? "VND",
    i_owe_them: Boolean(row.i_owe_them),
  };
}

export function chatEntitySurfaceFromReadTool(
  intentId: ReadIntentId,
  data: unknown,
  viewerUserId?: string,
): ChatEntitySurface | undefined {
  if (intentId === "group_list") {
    const groups = extractGroups(data);
    if (groups.length > 0) return { kind: "groups", groups };
    return undefined;
  }
  if (intentId === "friends_list") {
    const friends = friendsFromPayload(data, viewerUserId ?? "");
    if (friends.length > 0) {
      return { kind: "friends", friends, viewerUserId };
    }
    return undefined;
  }
  if (intentId === "debt_summary") {
    const balances = debtRows(data)
      .map(debtToBalance)
      .filter((b): b is Balance => b !== null);
    if (balances.length > 0) return { kind: "balances", balances };
    return undefined;
  }
  if (intentId === "recent_expenses") {
    const expenses = topExpensesFromPayload(data, 10);
    if (expenses.length > 0) {
      const currency = expenses.find((e) => e.currency)?.currency ?? "VND";
      return { kind: "expenses", expenses, currency };
    }
    return undefined;
  }
  if (intentId === "recent_comments") {
    const comments = extractFeedRows(data);
    if (comments.length > 0) return { kind: "comments", comments };
    return undefined;
  }
  return undefined;
}
