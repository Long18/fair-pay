import { useList, useGetIdentity } from "@refinedev/core";
import { useMemo } from "react";
import { Profile } from "@/modules/profile/types";

export type ActivityType = "expense" | "payment";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  description: string;
  amount: number;
  currency: string;
  date: string;
  group_id?: string;
  group_name?: string;
  created_by_id: string;
  created_by_name: string;
  is_mine: boolean; // Whether current user created this activity
}

export interface RecentActivity {
  items: ActivityItem[];
  isLoading: boolean;
}

/**
 * Fetch and merge recent expenses and payments into a unified activity feed
 *
 * Returns the 20 most recent activities (expenses + payments) sorted by date
 */
export const useRecentActivity = (limit: number = 20): RecentActivity => {
  const { data: identity } = useGetIdentity<Profile>();

  // Fetch recent expenses
  const { query: expensesQuery } = useList({
    resource: "expenses",
    pagination: {
      pageSize: limit,
    },
    sorters: [
      {
        field: "created_at",
        order: "desc",
      },
    ],
    meta: {
      select: "*, groups!group_id(id, name), profiles!created_by(id, full_name)",
    },
  });

  // Fetch recent payments
  const { query: paymentsQuery } = useList({
    resource: "payments",
    pagination: {
      pageSize: limit,
    },
    sorters: [
      {
        field: "created_at",
        order: "desc",
      },
    ],
    meta: {
      select: "*, groups!group_id(id, name), profiles!created_by(id, full_name), from_profile:from_user(full_name), to_profile:to_user(full_name)",
    },
  });

  const expenses: any[] = expensesQuery.data?.data || [];
  const payments: any[] = paymentsQuery.data?.data || [];

  const activity = useMemo(() => {
    if (!identity?.id) {
      return {
        items: [],
        isLoading: expensesQuery.isLoading || paymentsQuery.isLoading,
      };
    }

    // Transform expenses into activity items
    const expenseItems: ActivityItem[] = expenses.map(expense => ({
      id: expense.id,
      type: "expense" as const,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency || "VND",
      date: expense.created_at,
      group_id: expense.group_id,
      group_name: expense.groups?.name,
      created_by_id: expense.created_by,
      created_by_name: expense.profiles?.full_name || "Unknown",
      is_mine: expense.created_by === identity.id,
    }));

    // Transform payments into activity items
    const paymentItems: ActivityItem[] = payments.map(payment => ({
      id: payment.id,
      type: "payment" as const,
      description: `${payment.from_profile?.full_name || "Unknown"} paid ${payment.to_profile?.full_name || "Unknown"}`,
      amount: payment.amount,
      currency: payment.currency || "VND",
      date: payment.created_at,
      group_id: payment.group_id,
      group_name: payment.groups?.name,
      created_by_id: payment.created_by,
      created_by_name: payment.profiles?.full_name || "Unknown",
      is_mine: payment.created_by === identity.id,
    }));

    // Merge and sort by date
    const allItems = [...expenseItems, ...paymentItems].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Take only the requested limit
    const items = allItems.slice(0, limit);

    return {
      items,
      isLoading: expensesQuery.isLoading || paymentsQuery.isLoading,
    };
  }, [identity, expenses, payments, limit, expensesQuery.isLoading, paymentsQuery.isLoading]);

  return activity;
};
