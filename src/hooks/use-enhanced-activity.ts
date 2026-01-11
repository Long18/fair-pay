import { useList, useGetIdentity } from "@refinedev/core";
import { useMemo, useEffect, useState } from "react";
import type { Profile } from "@/modules/profile/types";
import type { EnhancedActivityItem, PaymentEvent } from "@/types/activity";
import { supabaseClient } from "@/utility/supabaseClient";

// =============================================
// Types
// =============================================

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  created_at: string;
  paid_by_user_id: string;
  group_id?: string;
  groups?: {
    id: string;
    name: string;
  };
  expense_splits: Array<{
    id: string;
    user_id: string;
    computed_amount: number;
    is_settled: boolean;
    settled_amount: number;
  }>;
}

// =============================================
// Hook: useEnhancedActivity
// =============================================

export interface UseEnhancedActivityOptions {
  limit?: number;
  groupId?: string;
  friendshipId?: string;
}

export interface UseEnhancedActivityResult {
  activities: EnhancedActivityItem[];
  isLoading: boolean;
  isRefetching: boolean;
  error: any;
}

/**
 * Fetch and transform expenses into EnhancedActivityItem format
 * with payment events for the Activity List
 */
export const useEnhancedActivity = (
  options: UseEnhancedActivityOptions = {}
): UseEnhancedActivityResult => {
  const { limit = 50, groupId, friendshipId } = options;
  const { data: identity } = useGetIdentity<Profile>();

  // Build filters
  const filters: any[] = [];
  if (groupId) {
    filters.push({ field: "group_id", operator: "eq", value: groupId });
  }
  if (friendshipId) {
    filters.push({ field: "friendship_id", operator: "eq", value: friendshipId });
  }

  // Fetch expenses with splits
  const expensesQuery = useList<Expense>({
    resource: "expenses",
    pagination: {
      pageSize: limit,
    },
    sorters: [
      {
        field: "expense_date",
        order: "desc",
      },
    ],
    filters: filters.length > 0 ? filters : undefined,
    meta: {
      select: `
        *,
        groups!group_id(id, name),
        expense_splits(
          id,
          user_id,
          computed_amount,
          is_settled,
          settled_amount
        )
      `,
    },
    queryOptions: {
      enabled: !!identity?.id,
    },
  });

  const { data, isLoading, isRefetching, error } = expensesQuery.query;
  
  // Create stable reference for expenses array to prevent infinite loops
  const expenses = useMemo(() => data?.data || [], [data?.data]);

  // State for resolved activities
  const [resolvedActivities, setResolvedActivities] = useState<EnhancedActivityItem[]>([]);
  const [isTransforming, setIsTransforming] = useState(false);

  // Transform expenses into EnhancedActivityItem format
  useEffect(() => {
    const transformActivities = async () => {
      if (!identity?.id || expenses.length === 0) {
        setResolvedActivities([]);
        return;
      }

      setIsTransforming(true);

      try {
        // Fetch payment events for all expenses in batch
        const expenseIds = expenses.map((e: any) => e.id);
        const { data: paymentEventsData } = await supabaseClient.rpc(
          "get_expenses_with_payment_events",
          { p_expense_ids: expenseIds }
        );

        const paymentEventsMap = new Map<string, PaymentEvent[]>();
        if (paymentEventsData) {
          paymentEventsData.forEach((item: any) => {
            paymentEventsMap.set(item.expense_id, item.payment_events || []);
          });
        }

        // Transform each expense
        const transformed: EnhancedActivityItem[] = expenses.map((expense: any) => {
          // Calculate payment state
          const splits = expense.expense_splits || [];
          const totalSplits = splits.length;
          const settledSplits = splits.filter((s: any) => s.is_settled).length;
          const partiallySplits = splits.filter(
            (s: any) => s.is_settled && s.settled_amount < s.computed_amount
          ).length;

          let paymentState: "paid" | "unpaid" | "partial";
          let partialPercentage: number | undefined;

          if (settledSplits === totalSplits && partiallySplits === 0) {
            paymentState = "paid";
          } else if (settledSplits === 0) {
            paymentState = "unpaid";
          } else {
            paymentState = "partial";
            // Calculate percentage
            const totalAmount = splits.reduce((sum: any, s: any) => sum + s.computed_amount, 0);
            const settledAmount = splits.reduce((sum: any, s: any) => sum + (s.settled_amount || 0), 0);
            partialPercentage = Math.round((settledAmount / totalAmount) * 100);
          }

          // Calculate owe status for current user
          const currentUserSplit = splits.find((s: any) => s.user_id === identity.id);
          let oweStatus: {
            direction: "owe" | "owed" | "neutral";
            amount: number;
          };

          if (currentUserSplit) {
            const owedAmount = currentUserSplit.computed_amount - (currentUserSplit.settled_amount || 0);
            if (owedAmount > 0) {
              oweStatus = {
                direction: "owe",
                amount: owedAmount,
              };
            } else {
              oweStatus = {
                direction: "neutral",
                amount: 0,
              };
            }
          } else if (expense.paid_by_user_id === identity.id) {
            // Current user is the payer, calculate how much is owed to them
            const totalOwed = splits
              .filter((s: any) => s.user_id !== identity.id)
              .reduce((sum: any, s: any) => sum + (s.computed_amount - (s.settled_amount || 0)), 0);
            oweStatus = {
              direction: totalOwed > 0 ? "owed" : "neutral",
              amount: totalOwed,
            };
          } else {
            oweStatus = {
              direction: "neutral",
              amount: 0,
            };
          }

          // Get payment events
          const paymentEvents = paymentEventsMap.get(expense.id) || [];

          return {
            id: expense.id,
            type: "expense" as const,
            description: expense.description,
            amount: expense.amount,
            currency: expense.currency as any,
            date: expense.expense_date || expense.created_at,
            paymentState,
            partialPercentage,
            oweStatus,
            participantCount: splits.length,
            groupName: expense.groups?.name,
            paymentEvents,
            originalExpense: expense,
          };
        });

        setResolvedActivities(transformed);
      } catch (err) {
        console.error("Error transforming activities:", err);
        setResolvedActivities([]);
      } finally {
        setIsTransforming(false);
      }
    };

    transformActivities();
  }, [expenses, identity?.id]);

  return {
    activities: resolvedActivities,
    isLoading: isLoading || isTransforming,
    isRefetching,
    error,
  };
};
