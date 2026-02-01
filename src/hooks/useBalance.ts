import { useCustom, useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "@/utility/supabaseClient";

interface BalanceData {
  total_owed_to_me: number;
  total_i_owe: number;
  net_balance: number;
}

interface UseBalanceOptions {
  dateRange?: { start: Date; end: Date };
}

/**
 * Centralized hook for fetching user balance
 *
 * This is the SINGLE SOURCE OF TRUTH for balance calculations.
 * All other components should use this hook instead of calculating balances client-side.
 *
 * Uses the `get_user_balance()` RPC function which performs server-side aggregation
 * for optimal performance and consistency.
 *
 * @returns Balance data including what user owes and is owed
 */
export const useBalance = (options?: UseBalanceOptions) => {
  const { data: identity } = useGetIdentity<{ id: string }>();
  const dateRange = options?.dateRange;

  const result = useCustom<BalanceData>({
    url: "",
    method: "get",
    config: { query: {} },
    queryOptions: {
      queryKey: ["balance", identity?.id, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
      queryFn: async () => {
        if (!identity?.id) throw new Error("User not authenticated");

        const rpcParams: Record<string, string> = { p_user_id: identity.id };
        if (dateRange) {
          rpcParams.p_start_date = dateRange.start.toISOString();
          rpcParams.p_end_date = dateRange.end.toISOString();
        }

        const { data, error } = await supabaseClient.rpc(
          'get_user_balance',
          rpcParams
        );

        if (error) throw new Error(error.message);
        return { data: data?.[0] as BalanceData };
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
      enabled: !!identity?.id,
    },
  });

  const balanceData = result.query.data?.data;

  return {
    balance: balanceData,
    isLoading: result.query.isLoading,
    error: result.query.error,
    refetch: result.query.refetch,
    // Convenience properties
    totalOwedToMe: balanceData?.total_owed_to_me ?? 0,
    totalIOwe: balanceData?.total_i_owe ?? 0,
    netBalance: balanceData?.net_balance ?? 0,
  };
};

export default useBalance;
