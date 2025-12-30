import { useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "@/utility/supabaseClient";
import { Profile } from "@/modules/profile/types";
import { useEffect, useState, useCallback } from "react";

export interface BalanceHistoryPoint {
  snapshot_date: string;
  total_owed: number;
  total_lent: number;
  net_balance: number;
  currency: string;
}

export interface UseBalanceHistoryOptions {
  startDate?: Date;
  endDate?: Date;
  currency?: string;
  userId?: string;
}

export const useBalanceHistory = (options: UseBalanceHistoryOptions = {}) => {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate = new Date(),
    currency = "USD",
    userId: providedUserId,
  } = options;

  const { data: identity } = useGetIdentity<Profile>();
  const [data, setData] = useState<BalanceHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalanceHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const userId = providedUserId || identity?.id;

      if (!userId) {
        setData([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      const { data: result, error: rpcError } = await supabaseClient.rpc(
        "get_balance_history",
        {
          p_user_id: userId,
          p_start_date: startDate.toISOString().split("T")[0],
          p_end_date: endDate.toISOString().split("T")[0],
          p_currency: currency,
        }
      );

      if (rpcError) {
        console.error("Error fetching balance history:", rpcError);
        throw rpcError;
      }

      setData(result || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch balance history:", err);
      setData([]);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [identity?.id, providedUserId, startDate, endDate, currency]);

  useEffect(() => {
    fetchBalanceHistory();
  }, [fetchBalanceHistory]);

  return { data, isLoading, error, refetch: fetchBalanceHistory };
};
