import type { Balance } from "@/components/dashboard/balance/balance-types";
import { debtRows, type DebtSummaryRow } from "./format-debt-summary";
import { extractGroups, type GroupListRow } from "./format-group-list";
import { friendsFromPayload, type FriendRow } from "./format-friends-list";
import { rowsFromData, type ExpenseListRow } from "./format-expenses-list";
import { extractFeedRows, type ExpenseCommentRow } from "./format-expense-comments";
import type { ReadDigestBag } from "./format-read-digest";

function amountNumber(amount: number | string | undefined): number {
  if (amount === undefined || amount === null) return 0;
  const n = typeof amount === "number" ? amount : Number(String(amount).replace(/[.,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function debtToBalance(row: DebtSummaryRow): Balance | null {
  const amount = amountNumber(row.amount);
  if (amount <= 0) return null;
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

export interface ReadDigestViewModel {
  currency: string;
  owedToYouTotal: number;
  youOweTotal: number;
  net: number;
  balances: Balance[];
  groups: GroupListRow[];
  friends: FriendRow[];
  expenses: ExpenseListRow[];
  comments: ExpenseCommentRow[];
}

export function buildReadDigestViewModel(
  bag: ReadDigestBag,
  viewerUserId = "",
): ReadDigestViewModel {
  const balances = debtRows(bag.debt)
    .map(debtToBalance)
    .filter((b): b is Balance => b !== null);

  const currency = balances[0]?.currency ?? "VND";
  let owedToYouTotal = 0;
  let youOweTotal = 0;
  for (const b of balances) {
    const amt = amountNumber(b.amount);
    if (b.i_owe_them) youOweTotal += amt;
    else owedToYouTotal += amt;
  }

  const expenses = rowsFromData(bag.expenses)
    .slice()
    .sort((a, b) => amountNumber(b.amount) - amountNumber(a.amount))
    .slice(0, 5);

  const friends = friendsFromPayload(bag.friends, viewerUserId);
  const seen = new Set<string>();
  const uniqueFriends = friends.filter((f) => {
    if (seen.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });

  return {
    currency,
    owedToYouTotal,
    youOweTotal,
    net: owedToYouTotal - youOweTotal,
    balances,
    groups: extractGroups(bag.groups),
    friends: uniqueFriends,
    expenses,
    comments: extractFeedRows(bag.comments),
  };
}
