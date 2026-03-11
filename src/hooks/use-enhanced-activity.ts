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
  profiles?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
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
  userId?: string; // Filter to show only transactions where user is payer or participant
  enabled?: boolean; // When false, skips all data fetching (defaults to true)
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
  const { limit = 50, groupId, friendshipId, userId, enabled } = options;
  const { data: identity } = useGetIdentity<Profile>();

  // Build filters
  const filters: any[] = [];
  if (groupId) {
    filters.push({ field: "group_id", operator: "eq", value: groupId });
  }
  if (friendshipId) {
    filters.push({ field: "friendship_id", operator: "eq", value: friendshipId });
  }
  // Note: userId filter is applied post-fetch since we need to check both paid_by_user_id and expense_splits

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
        profiles!paid_by_user_id(id, full_name, avatar_url),
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
      enabled: (enabled !== false) && !!identity?.id,
    },
  });

  const { data, isLoading, isRefetching, error } = expensesQuery.query;
  
  // Create stable reference for expenses array to prevent infinite loops
  // Apply userId filter: only include expenses where user is payer or participant
  const expenses = useMemo(() => {
    const allExpenses = data?.data || [];
    if (!userId) return allExpenses;
    
    return allExpenses.filter((expense: any) => {
      // User is the payer
      if (expense.paid_by_user_id === userId) return true;
      // User is a participant in splits
      const splits = expense.expense_splits || [];
      return splits.some((split: any) => split.user_id === userId);
    });
  }, [data?.data, userId]);

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
          // Priority: Check if user is the payer first, then check if they have a split
          const currentUserSplit = splits.find((s: any) => s.user_id === identity.id);
          let oweStatus: {
            direction: "owe" | "owed" | "neutral";
            amount: number;
          };

          if (expense.paid_by_user_id === identity.id) {
            // Current user is the payer - calculate how much others owe them
            // (excluding their own split if they have one)
            const totalOwed = splits
              .filter((s: any) => s.user_id !== identity.id)
              .reduce((sum: any, s: any) => sum + (s.computed_amount - (s.settled_amount || 0)), 0);
            oweStatus = {
              direction: totalOwed > 0 ? "owed" : "neutral",
              amount: totalOwed,
            };
          } else if (currentUserSplit) {
            // Current user is NOT the payer but has a split - they owe the payer
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
          } else {
            oweStatus = {
              direction: "neutral",
              amount: 0,
            };
          }

          // Get payment events
          const paymentEvents = [...(paymentEventsMap.get(expense.id) || [])].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          const activityDate = paymentEvents[0]?.created_at || expense.expense_date || expense.created_at;

          const seenPayers = new Set<string>();
          const payingParticipants = paymentEvents.reduce<Array<{ id: string; name: string; avatar?: string }>>(
            (participants, event) => {
              if (seenPayers.has(event.from_user_id)) {
                return participants;
              }
              seenPayers.add(event.from_user_id);
              participants.push({
                id: event.from_user_id,
                name: event.from_user_name,
                avatar: event.from_user_avatar,
              });
              return participants;
            },
            []
          );

          const settlementProgressPct =
            paymentState === "paid"
              ? 100
              : paymentState === "partial"
                ? (partialPercentage ?? 0)
                : 0;

          return {
            id: expense.id,
            type: "expense" as const,
            description: expense.description,
            amount: expense.amount,
            currency: expense.currency as any,
            date: expense.expense_date || expense.created_at,
            activityDate,
            paymentState,
            partialPercentage,
            settlementProgressPct,
            oweStatus,
            participantCount: splits.length,
            groupName: expense.groups?.name,
            payingParticipants,
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
