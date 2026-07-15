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

interface Payment {
  id: string;
  note?: string | null;
  amount: number;
  currency: string;
  payment_date: string;
  created_at: string;
  group_id?: string;
  friendship_id?: string;
  from_user: string;
  to_user: string;
  groups?: {
    id: string;
    name: string;
  };
  from_profile?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  };
  to_profile?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  };
}

interface ActivityLedgerRef {
  id: string;
  type: "expense" | "payment";
  date: string;
  created_at: string;
}

// =============================================
// Hook: useEnhancedActivity
// =============================================

export interface UseEnhancedActivityOptions {
  limit?: number | "all";
  groupId?: string;
  friendshipId?: string;
  userId?: string; // Optional profile scope; defaults to the viewer for product surfaces
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
  const viewerId = identity?.id;
  const sharedScopeUserId = userId && userId !== viewerId ? userId : undefined;

  const [ledgerRefs, setLedgerRefs] = useState<ActivityLedgerRef[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchLedgerRefs = async () => {
      if (enabled === false || !viewerId) {
        setLedgerRefs([]);
        setLedgerError(null);
        return;
      }

      setLedgerLoading(true);
      setLedgerRefs([]);

      try {
        const { data, error } = await supabaseClient.rpc("get_activity_ledger", {
          p_viewer_id: viewerId,
          p_shared_with_user_id: sharedScopeUserId || null,
          p_group_id: groupId || null,
          p_friendship_id: friendshipId || null,
          p_limit: limit === "all" ? null : limit,
          p_offset: 0,
        });

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setLedgerRefs((data || []) as ActivityLedgerRef[]);
          setLedgerError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLedgerRefs([]);
          setLedgerError(error);
        }
      } finally {
        if (!cancelled) {
          setLedgerLoading(false);
        }
      }
    };

    fetchLedgerRefs();

    return () => {
      cancelled = true;
    };
  }, [enabled, friendshipId, groupId, limit, sharedScopeUserId, viewerId]);

  const expenseIds = useMemo(
    () =>
      ledgerRefs.reduce<(typeof ledgerRefs)[number]["id"][]>((acc, activity) => {
        if (activity.type === "expense") acc.push(activity.id);
        return acc;
      }, []),
    [ledgerRefs]
  );
  const paymentIds = useMemo(
    () =>
      ledgerRefs.reduce<(typeof ledgerRefs)[number]["id"][]>((acc, activity) => {
        if (activity.type === "payment") acc.push(activity.id);
        return acc;
      }, []),
    [ledgerRefs]
  );

  // Fetch expenses with splits
  const expensesQuery = useList<Expense>({
    resource: "expenses",
    pagination: { mode: "off" },
    sorters: [
      {
        field: "expense_date",
        order: "desc",
      },
    ],
    filters: [
      {
        field: "id",
        operator: "in",
        value: expenseIds,
      },
    ],
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
      enabled: (enabled !== false) && !!identity?.id && expenseIds.length > 0,
    },
  });

  const paymentsQuery = useList<Payment>({
    resource: "payments",
    pagination: { mode: "off" },
    sorters: [
      {
        field: "payment_date",
        order: "desc",
      },
    ],
    filters: [
      {
        field: "id",
        operator: "in",
        value: paymentIds,
      },
    ],
    meta: {
      select: `
        *,
        groups!group_id(id, name),
        from_profile:profiles!from_user(id, full_name, avatar_url),
        to_profile:profiles!to_user(id, full_name, avatar_url)
      `,
    },
    queryOptions: {
      enabled: (enabled !== false) && !!identity?.id && paymentIds.length > 0,
    },
  });

  const {
    data: expensesData,
    isLoading: expensesLoading,
    isRefetching: expensesRefetching,
    error: expensesError,
  } = expensesQuery.query;
  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    isRefetching: paymentsRefetching,
    error: paymentsError,
  } = paymentsQuery.query;
  
  // Create stable references for ledger rows.
  // Product surfaces are viewer-scoped by default; profile views for another user
  // become a shared-scope intersection instead of exposing that user's full ledger.
  const expenses = useMemo(() => {
    const allExpenses = expensesData?.data || [];
    if (!viewerId || expenseIds.length === 0) return [];
    
    return allExpenses.filter((expense: any) => {
      const splits = expense.expense_splits || [];
      const viewerIsParticipant =
        expense.paid_by_user_id === viewerId ||
        splits.some((split: any) => split.user_id === viewerId);
      const sharedScopeMatches =
        !sharedScopeUserId ||
        expense.paid_by_user_id === sharedScopeUserId ||
        splits.some((split: any) => split.user_id === sharedScopeUserId);

      return viewerIsParticipant && sharedScopeMatches;
    });
  }, [expenseIds.length, expensesData?.data, sharedScopeUserId, viewerId]);

  const payments = useMemo(() => {
    const allPayments = paymentsData?.data || [];
    if (!viewerId || paymentIds.length === 0) return [];

    return allPayments.filter((payment: any) => {
      const viewerIsParticipant =
        payment.from_user === viewerId || payment.to_user === viewerId;
      const sharedScopeMatches =
        !sharedScopeUserId ||
        payment.from_user === sharedScopeUserId ||
        payment.to_user === sharedScopeUserId;

      return viewerIsParticipant && sharedScopeMatches;
    });
  }, [paymentIds.length, paymentsData?.data, sharedScopeUserId, viewerId]);

  // State for resolved activities
  const [resolvedActivities, setResolvedActivities] = useState<EnhancedActivityItem[]>([]);
  const [isTransforming, setIsTransforming] = useState(false);

  // Transform expenses into EnhancedActivityItem format
  useEffect(() => {
    const transformActivities = async () => {
      if (!identity?.id || (expenses.length === 0 && payments.length === 0)) {
        setResolvedActivities([]);
        return;
      }

      setIsTransforming(true);

      try {
        // Fetch payment events for all expenses in batch
        const expenseIds = expenses.map((e: any) => e.id);
        const paymentEventsMap = new Map<string, PaymentEvent[]>();
        if (expenseIds.length > 0) {
          const { data: paymentEventsData } = await supabaseClient.rpc(
            "get_expenses_with_payment_events",
            { p_expense_ids: expenseIds }
          );

          if (paymentEventsData) {
            paymentEventsData.forEach((item: any) => {
              paymentEventsMap.set(item.expense_id, item.payment_events || []);
            });
          }
        }

        // Transform each expense
        const expenseActivities: EnhancedActivityItem[] = expenses.map((expense: any) => {
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
            totalAmount: expense.amount,
            userAmount: currentUserSplit?.computed_amount || 0,
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

        const paymentActivities: EnhancedActivityItem[] = payments.map((payment: any) => {
          const isViewerSender = payment.from_user === identity.id;
          const counterparty = isViewerSender ? payment.to_profile : payment.from_profile;
          const payingParticipants = payment.from_profile
            ? [{
                id: payment.from_profile.id,
                name: payment.from_profile.full_name,
                avatar: payment.from_profile.avatar_url || undefined,
              }]
            : [];

          return {
            id: payment.id,
            type: "payment" as const,
            description:
              payment.note ||
              (isViewerSender
                ? `Payment to ${counterparty?.full_name || "Unknown"}`
                : `Payment from ${counterparty?.full_name || "Unknown"}`),
            amount: payment.amount,
            totalAmount: payment.amount,
            userAmount: payment.amount,
            currency: payment.currency as any,
            date: payment.payment_date || payment.created_at,
            activityDate: payment.payment_date || payment.created_at,
            paymentState: "paid",
            partialPercentage: undefined,
            settlementProgressPct: 100,
            oweStatus: {
              direction: "neutral",
              amount: 0,
            },
            participantCount: 2,
            groupName: payment.groups?.name,
            payingParticipants,
            paymentEvents: [],
            originalPayment: payment,
          };
        });

        const transformed = [...expenseActivities, ...paymentActivities].sort(
          (a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime()
        );

        setResolvedActivities(transformed);
      } catch (err) {
        console.error("Error transforming activities:", err);
        setResolvedActivities([]);
      } finally {
        setIsTransforming(false);
      }
    };

    transformActivities();
  }, [expenses, payments, identity?.id]);

  const isLoading = ledgerLoading || expensesLoading || paymentsLoading || isTransforming;
  const isRefetching = expensesRefetching || paymentsRefetching;
  const error = ledgerError || expensesError || paymentsError;

  return {
    activities: resolvedActivities,
    isLoading,
    isRefetching,
    error,
  };
};
