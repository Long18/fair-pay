import { useList } from "@refinedev/core";
import { useMemo } from "react";

interface ExpenseSplit {
  user_id: string;
  expense: {
    created_at: string;
  };
}

export function useTopTransactionPartners(
  currentUserId: string | undefined,
  contextType: "group" | "friend",
  contextId: string | undefined,
  limit: number = 3
): string[] {
  const { query } = useList<ExpenseSplit>({
    resource: "expense_splits",
    filters: [
      {
        field: contextType === "group" ? "expense.group_id" : "expense.friendship_id",
        operator: "eq",
        value: contextId,
      },
    ],
    meta: {
      select: "user_id, expense:expenses!inner(created_at)",
    },
    pagination: {
      mode: "off",
    },
    queryOptions: {
      enabled: !!currentUserId && !!contextId,
    },
  });

  const topPartners = useMemo(() => {
    if (!query.data?.data || !currentUserId) return [];

    const userTransactionCounts = query.data.data.reduce((acc: Record<string, number>, split: ExpenseSplit) => {
      if (split.user_id !== currentUserId) {
        acc[split.user_id] = (acc[split.user_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const sortedUsers = Object.entries(userTransactionCounts)
      .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
      .slice(0, limit)
      .map(([userId]) => userId);

    return sortedUsers;
  }, [query.data, currentUserId, limit]);

  return topPartners;
}
