import { useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "@/utility/supabaseClient";
import { Profile } from "@/modules/profile/types";
import { useEffect, useState, useCallback } from "react";

export interface TopSpender {
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  total_spent: number;
  expense_count: number;
  percentage: number;
}

export interface UseTopSpendersOptions {
  groupId: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export const useTopSpenders = (options: UseTopSpendersOptions) => {
  const {
    groupId,
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate = new Date(),
    limit = 10,
  } = options;

  const { data: identity } = useGetIdentity<Profile>();
  const [data, setData] = useState<TopSpender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTopSpenders = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!identity?.id || !groupId) {
        setData([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      const { data: result, error: rpcError } = await supabaseClient.rpc(
        "get_top_spenders",
        {
          p_group_id: groupId,
          p_start_date: startDate.toISOString().split("T")[0],
          p_end_date: endDate.toISOString().split("T")[0],
          p_limit: limit,
        }
      );

      if (rpcError) {
        console.error("Error fetching top spenders:", rpcError);
        throw rpcError;
      }

      setData(result || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch top spenders:", err);
      setData([]);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [identity?.id, groupId, startDate, endDate, limit]);

  useEffect(() => {
    fetchTopSpenders();
  }, [fetchTopSpenders]);

  return { data, isLoading, error, refetch: fetchTopSpenders };
};

