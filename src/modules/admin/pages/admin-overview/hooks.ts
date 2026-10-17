import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
import { getCategoryMeta } from "@/modules/expenses";
import type { AdminStats } from "../../types";
import type { useAdminTranslation } from "../../i18n";

export interface LatestTrackedUser {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  last_seen_at: string;
  last_page: string | null;
  entry_link: string | null;
  landing_source: string | null;
  device_type: string | null;
  session_count: number;
}

export type TrendPeriod = "7d" | "30d" | "90d";
export const PERIOD_DAYS: Record<TrendPeriod, number> = { "7d": 7, "30d": 30, "90d": 90 };

const ACTIVITY_FETCH_LIMIT = 50;

export function formatRelativeTime(
  value: string,
  tAdmin: ReturnType<typeof useAdminTranslation>["tAdmin"],
): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return tAdmin("overview.relative.justNow");
  if (minutes < 60) return tAdmin("overview.relative.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tAdmin("overview.relative.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return tAdmin("overview.relative.daysAgo", { count: days });
}

/** Compute percentage change between current and previous values. */
export function calcTrendPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function useLatestTrackedUsers(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "latest-tracked-users"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("admin_get_latest_tracked_users", {
        p_limit: ACTIVITY_FETCH_LIMIT,
      });
      if (error) throw error;
      return (data ?? []) as LatestTrackedUser[];
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("get_admin_stats");
      if (error) throw error;
      const raw = data as Record<string, number>;
      return {
        totalUsers: raw.total_users ?? 0,
        totalGroups: raw.total_groups ?? 0,
        totalExpenses: raw.total_expenses ?? 0,
        totalPayments: raw.total_payments ?? 0,
        activeUsersLast7Days: raw.active_users_7d ?? 0,
        prevTotalUsers: raw.prev_total_users ?? 0,
        prevTotalGroups: raw.prev_total_groups ?? 0,
        currExpenses30d: raw.curr_expenses_30d ?? 0,
        prevExpenses30d: raw.prev_expenses_30d ?? 0,
        currPayments30d: raw.curr_payments_30d ?? 0,
        prevPayments30d: raw.prev_payments_30d ?? 0,
        prevActiveUsers7d: raw.prev_active_7d ?? 0,
      } satisfies AdminStats;
    },
    staleTime: 60_000,
  });
}

export function useExpenseTrend(locale: string, enabled: boolean, days: number) {
  return useQuery({
    queryKey: ["admin", "expense-trend", locale, days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabaseClient
        .from("expenses")
        .select("expense_date, amount")
        .gte("expense_date", since.toISOString().split("T")[0])
        .order("expense_date", { ascending: true });

      if (error) throw error;

      const grouped: Record<string, number> = {};
      for (const row of data ?? []) {
        const date = row.expense_date;
        grouped[date] = (grouped[date] ?? 0) + Number(row.amount);
      }

      return Object.entries(grouped).map(([date, total]) => ({
        date,
        label: new Date(date).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" }),
        total,
      }));
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useRegistrationTrend(locale: string, enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "registration-trend-12w", locale],
    queryFn: async () => {
      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

      const { data, error } = await supabaseClient
        .from("profiles")
        .select("created_at")
        .gte("created_at", twelveWeeksAgo.toISOString());

      if (error) throw error;

      // Group by ISO week
      const grouped: Record<string, number> = {};
      for (const row of data ?? []) {
        const d = new Date(row.created_at);
        // Get Monday of the week
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        const weekKey = monday.toISOString().split("T")[0];
        grouped[weekKey] = (grouped[weekKey] ?? 0) + 1;
      }

      return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, count]) => ({
          week,
          label: new Date(week).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" }),
          count,
        }));
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useCategoryBreakdown(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "category-breakdown"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("expenses")
        .select("category, amount");

      if (error) throw error;

      const grouped: Record<string, number> = {};
      for (const row of data ?? []) {
        const cat = row.category || "Other";
        grouped[cat] = (grouped[cat] ?? 0) + Number(row.amount);
      }

      return Object.entries(grouped)
        .map(([category, amount]) => ({
          category,
          amount,
          fill: getCategoryMeta(category).chartColor,
        }))
        .sort((a, b) => b.amount - a.amount);
    },
    enabled,
    staleTime: 60_000,
  });
}
