import { useGetIdentity } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
import { Profile } from "@/modules/profile/types";
import { currentYearMonth } from "../budget-vs-actual";

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  currency: string;
  period: string;
  year_month: string;
}

export function useBudgets(yearMonth: string = currentYearMonth()) {
  const { data: identity } = useGetIdentity<Profile>();
  const userId = identity?.id;

  const query = useQuery({
    queryKey: ["budgets", userId, yearMonth],
    enabled: !!userId,
    queryFn: async (): Promise<Budget[]> => {
      if (!userId) return [];
      const { data, error } = await supabaseClient
        .from("budgets")
        .select("id, user_id, category, amount, currency, period, year_month")
        .eq("user_id", userId)
        .eq("year_month", yearMonth)
        .order("category");
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => ({
        ...row,
        amount: Number(row.amount),
      }));
    },
  });

  const refetch = async () => {
    await query.refetch();
  };

  const upsertBudget = async (category: string, amount: number) => {
    if (!userId) throw new Error("Not signed in");
    const { error } = await supabaseClient.from("budgets").upsert(
      {
        user_id: userId,
        category: category.trim(),
        amount,
        currency: "VND",
        period: "month",
        year_month: yearMonth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,category,year_month" },
    );
    if (error) throw new Error(error.message);
    await query.refetch();
  };

  const deleteBudget = async (id: string) => {
    const { error } = await supabaseClient.from("budgets").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await query.refetch();
  };

  return {
    budgets: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refetch,
    upsertBudget,
    deleteBudget,
    yearMonth,
  };
}
