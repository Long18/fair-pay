import { useGetIdentity } from "@refinedev/core";
import { useState, useEffect, useCallback } from "react";
import { Profile } from "@/modules/profile/types";
import { supabaseClient } from "@/utility/supabaseClient";
import { ActivityItem } from "./use-recent-activity";
import { PaginationMetadata } from "@/components/ui/pagination-controls";

interface UsePaginatedActivitiesProps {
  pageSize?: number;
  initialPage?: number;
}

interface PaginatedActivitiesResult {
  items: ActivityItem[];
  metadata: PaginationMetadata;
  isLoading: boolean;
  isRefetching: boolean;
  currentPage: number;
  setPage: (page: number) => void;
  refetch: () => void;
}

/**
 * Hook for paginated activities with backend support
 * Supports both authenticated and unauthenticated users
 */
export const usePaginatedActivities = ({
  pageSize = 10,
  initialPage = 1,
}: UsePaginatedActivitiesProps = {}): PaginatedActivitiesResult => {
  const { data: identity } = useGetIdentity<Profile>();
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);

  const fetchActivities = useCallback(async () => {
    const isInitialLoad = items.length === 0;
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsRefetching(true);
    }

    try {
      // Calculate offset based on current page
      const offset = (currentPage - 1) * pageSize;

      if (!identity?.id) {
        // For unauthenticated users: use RPC function
        // Fetch total count by querying all expenses
        const [dataResult, countResult] = await Promise.all([
          supabaseClient.rpc("get_public_recent_activities", {
            p_limit: pageSize,
            p_offset: offset,
          }),
          supabaseClient
            .from("expenses")
            .select("id", { count: "exact", head: true })
            .eq("is_payment", false)
            .not("group_id", "is", null),
        ]);

        if (dataResult.error) {
          console.error("Error fetching public activities:", dataResult.error);
          setItems([]);
          setTotalItems(0);
        } else {
          const activities: ActivityItem[] = (dataResult.data || []).map((item: any) => ({
            id: item.id,
            type: item.type as "expense" | "payment",
            description: item.description,
            amount: item.amount,
            currency: item.currency || "VND",
            date: item.date,
            group_id: item.group_id,
            group_name: item.group_name,
            created_by_id: item.created_by_id,
            created_by_name: item.created_by_name || "Unknown",
            created_by_avatar_url: item.created_by_avatar_url,
            is_mine: false,
          }));
          setItems(activities);
          setTotalItems(countResult.count || 0);
        }
      } else {
        // For authenticated users: query expenses and payments with pagination
        const [expensesResult, paymentsResult] = await Promise.all([
          supabaseClient
            .from("expenses")
            .select(
              "*, groups!group_id(id, name), profiles!created_by(id, full_name, avatar_url)",
              { count: "exact" }
            )
            .order("created_at", { ascending: false })
            .range(offset, offset + pageSize - 1),
          supabaseClient
            .from("payments")
            .select(
              "*, groups!group_id(id, name), profiles!created_by(id, full_name, avatar_url), from_profile:profiles!from_user(full_name), to_profile:profiles!to_user(full_name)",
              { count: "exact" }
            )
            .order("created_at", { ascending: false })
            .range(offset, offset + pageSize - 1),
        ]);

        if (expensesResult.error || paymentsResult.error) {
          console.error(
            "Error fetching activities:",
            expensesResult.error || paymentsResult.error
          );
          setItems([]);
          setTotalItems(0);
        } else {
          const expenses = expensesResult.data || [];
          const payments = paymentsResult.data || [];

          // Transform expenses
          const expenseItems: ActivityItem[] = expenses.map((expense: any) => ({
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
            created_by_avatar_url: expense.profiles?.avatar_url,
            is_mine: expense.created_by === identity.id,
          }));

          // Transform payments
          const paymentItems: ActivityItem[] = payments.map((payment: any) => ({
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
            created_by_avatar_url: payment.profiles?.avatar_url,
            is_mine: payment.created_by === identity.id,
          }));

          // Merge and sort
          const allItems = [...expenseItems, ...paymentItems].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          setItems(allItems);
          setTotalItems((expensesResult.count || 0) + (paymentsResult.count || 0));
        }
      }
    } catch (error) {
      console.error("Unexpected error fetching activities:", error);
      setItems([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [identity?.id, currentPage, pageSize]);

  // Fetch activities when page or identity changes
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const totalPages = Math.ceil(totalItems / pageSize);

  const metadata: PaginationMetadata = {
    totalItems,
    totalPages: totalPages || 1,
    currentPage,
    pageSize,
  };

  const setPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return {
    items,
    metadata,
    isLoading,
    isRefetching,
    currentPage,
    setPage,
    refetch: fetchActivities,
  };
};
