import { useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "@/utility/supabaseClient";
import { Profile } from "@/modules/profile/types";
import { useEffect, useState, useCallback } from "react";

export interface SpendingComparison {
  current_total: number;
  previous_total: number;
  difference: number;
  percentage_change: number;
  trend: "increasing" | "decreasing" | "stable";
}

export interface UseSpendingComparisonOptions {
  currentStart: Date;
  currentEnd: Date;
  groupId?: string;
}

export const useSpendingComparison = (options: UseSpendingComparisonOptions) => {
  const { currentStart, currentEnd, groupId } = options;
  const { data: identity } = useGetIdentity<Profile>();
  const [data, setData] = useState<SpendingComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchComparison = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!identity?.id) {
        setData(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      const { data: result, error: rpcError } = await supabaseClient.rpc(
        "get_spending_comparison",
        {
          p_current_start: currentStart.toISOString().split("T")[0],
          p_current_end: currentEnd.toISOString().split("T")[0],
          p_group_id: groupId || null,
        }
      );

      if (rpcError) {
        console.error("Error fetching spending comparison:", rpcError);
        throw rpcError;
      }

      setData(result?.[0] || null);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch spending comparison:", err);
      setData(null);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [
    identity?.id,
    currentStart.toISOString(),
    currentEnd.toISOString(),
    groupId,
  ]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  return { data, isLoading, error, refetch: fetchComparison };
};
