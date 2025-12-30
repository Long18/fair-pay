import { useCustom } from "@refinedev/core";
import { supabaseClient } from "@/utility/supabaseClient";

export interface SimplifiedDebt {
  from_user_id: string;
  to_user_id: string;
  amount: number;
  from_user_name: string;
  to_user_name: string;
  from_user_avatar: string | null;
  to_user_avatar: string | null;
}

interface UseSimplifiedDebtsProps {
  groupId?: string;
  enabled?: boolean;
}

/**
 * Hook to fetch simplified debts for a group using Min-Cost Max-Flow algorithm
 *
 * This reduces complex multi-party transactions into minimal direct payments.
 * Example: Instead of A→B $10, B→C $15, C→A $5, returns: B→C $5 (67% reduction)
 *
 * @param groupId - The group ID to simplify debts for
 * @param enabled - Whether to enable the query (default: true if groupId exists)
 * @returns Simplified debt list with loading/error states
 */
export const useSimplifiedDebts = ({
  groupId,
  enabled = true,
}: UseSimplifiedDebtsProps) => {
  const result = useCustom<SimplifiedDebt[]>({
    url: "",
    method: "get",
    config: { query: {} },
    queryOptions: {
      queryKey: ["simplified-debts", groupId],
      queryFn: async () => {
        if (!groupId) {
          return { data: [] };
        }

        const { data, error } = await supabaseClient.rpc("simplify_group_debts", {
          p_group_id: groupId,
        });

        if (error) {
          console.error("Error fetching simplified debts:", error);
          throw new Error(error.message);
        }

        return { data: (data as SimplifiedDebt[]) || [] };
      },
      enabled: enabled && !!groupId,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    },
  });

  const simplifiedDebts = result.query.data?.data || [];

  return {
    simplifiedDebts,
    isLoading: result.query.isLoading,
    error: result.query.error,
    refetch: result.query.refetch,
    // Convenience properties
    transactionCount: simplifiedDebts.length,
    totalAmount: simplifiedDebts.reduce((sum, debt) => sum + debt.amount, 0),
  };
};

export default useSimplifiedDebts;
