import { formatDebtSummaryResponse } from "./format-debt-summary";
import { formatGroupListResponse } from "./format-group-list";
import { formatFriendsListResponse } from "./format-friends-list";
import { formatRecentExpensesResponse } from "./format-expenses-list";
import { formatRecentExpenseComments } from "./format-expense-comments";

export interface ReadDigestBag {
  debt?: unknown;
  groups?: unknown;
  friends?: unknown;
  expenses?: unknown;
  comments?: unknown;
}

export function formatReadDigest(
  bag: ReadDigestBag,
  options?: { language?: string; viewerUserId?: string },
): string {
  const vi = options?.language?.startsWith("vi") ?? false;
  const sections: string[] = [
    vi ? "## Tổng hợp FairPay" : "## FairPay summary",
  ];

  if (bag.debt !== undefined) {
    sections.push(formatDebtSummaryResponse(bag.debt, options?.language));
  }
  if (bag.groups !== undefined) {
    sections.push(formatGroupListResponse(bag.groups, options?.language));
  }
  if (bag.friends !== undefined) {
    sections.push(
      formatFriendsListResponse(
        bag.friends,
        options?.viewerUserId ?? "",
        options?.language,
      ),
    );
  }
  if (bag.expenses !== undefined) {
    sections.push(
      formatRecentExpensesResponse(bag.expenses, {
        language: options?.language,
        topN: 5,
      }),
    );
  }
  if (bag.comments !== undefined) {
    sections.push(formatRecentExpenseComments(bag.comments, options?.language));
  }

  return sections.join("\n\n");
}
