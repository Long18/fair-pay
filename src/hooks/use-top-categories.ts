import { useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "@/utility/supabaseClient";
import { Profile } from "@/modules/profile/types";
import { useEffect, useState, useCallback } from "react";

export interface TopCategory {
  category: string;
  total_amount: number;
  expense_count: number;
  percentage: number;
}

export interface UseTopCategoriesOptions {
  startDate?: Date;
  endDate?: Date;
  groupId?: string;
  limit?: number;
}

export const useTopCategories = (options: UseTopCategoriesOptions = {}) => {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate = new Date(),
    groupId,
    limit = 10,
  } = options;

  const { data: identity } = useGetIdentity<Profile>();
  const [data, setData] = useState<TopCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTopCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!identity?.id) {
        setData([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      const { data: result, error: rpcError } = await supabaseClient.rpc(
        "get_top_categories",
        {
          p_start_date: startDate.toISOString().split("T")[0],
          p_end_date: endDate.toISOString().split("T")[0],
          p_group_id: groupId || null,
          p_limit: limit,
        }
      );

      if (rpcError) {
        console.error("Error fetching top categories:", rpcError);
        throw rpcError;
      }

      setData(result || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch top categories:", err);
      setData([]);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [identity?.id, startDate, endDate, groupId, limit]);

  useEffect(() => {
    fetchTopCategories();
  }, [fetchTopCategories]);

  return { data, isLoading, error, refetch: fetchTopCategories };
};

