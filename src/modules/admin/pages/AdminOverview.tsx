import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart as RechartsBarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { supabaseClient } from "@/utility/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { LoadingBeam } from "@/components/ui/loading-beam";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  UsersIcon,
  GroupIcon,
  ReceiptIcon,
  CreditCardIcon,
  ActivityIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { AdminStats } from "../types";
import { AnimatedList } from "@/components/ui/animated-list";
import { AnimatedRow } from "@/components/ui/animated-row";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";

import { formatNumber } from "@/lib/locale-utils";
import { getCategoryMeta } from "@/modules/expenses";
import { themeIntentTones, type ThemeIntent } from "@/lib/theme-intents";
import { useAdminTranslation } from "../i18n";
import { useAdminAccess } from "../hooks/use-admin-access";
import { AdminPageHeader } from "../components/AdminPageHeader";

// ─── Latest Tracked Users ────────────────────────────────────────────

interface LatestTrackedUser {
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

function formatRelativeTime(value: string, tAdmin: ReturnType<typeof useAdminTranslation>["tAdmin"]): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return tAdmin("overview.relative.justNow");
  if (minutes < 60) return tAdmin("overview.relative.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tAdmin("overview.relative.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return tAdmin("overview.relative.daysAgo", { count: days });
}

const ACTIVITY_PAGE_SIZE = 5;
const ACTIVITY_FETCH_LIMIT = 50;

function useLatestTrackedUsers(enabled: boolean) {
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

// ─── Trend Indicator ────────────────────────────────────────────────

function TrendIndicator({ value, isPositive }: { value: number; isPositive: boolean }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        —
      </span>
    );
  }
  const Icon = isPositive ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        isPositive
          ? "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)]"
          : "bg-[var(--status-error-bg)] text-[var(--status-error-foreground)]"
      }`}
    >
      <Icon size={11} />
      {isPositive ? "+" : ""}
      {value}%
    </span>
  );
}

/** Compute percentage change between current and previous values. */
function calcTrendPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── Section Divider ────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
        <div className="flex flex-col gap-2">
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          <div className="h-7 w-16 bg-muted rounded animate-pulse" />
          <div className="h-3 w-12 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

// ─── Stat Card Config ───────────────────────────────────────────────

const STAT_CARDS = [
  { key: "totalUsers", labelKey: "overview.totalUsers", icon: UsersIcon, tone: "brand" as ThemeIntent },
  { key: "totalGroups", labelKey: "overview.totalGroups", icon: GroupIcon, tone: "chart2" as ThemeIntent },
  { key: "totalExpenses", labelKey: "overview.totalExpenses", icon: ReceiptIcon, tone: "accent" as ThemeIntent },
  { key: "totalPayments", labelKey: "overview.totalPayments", icon: CreditCardIcon, tone: "success" as ThemeIntent },
  { key: "activeUsersLast7Days", labelKey: "overview.activeUsers7d", icon: ActivityIcon, tone: "chart5" as ThemeIntent },
] as const;

// ─── Data Hooks ─────────────────────────────────────────────────────

function useAdminStats() {
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

function useExpenseTrend(locale: string, enabled: boolean, days: number) {
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

function useRegistrationTrend(locale: string, enabled: boolean) {
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

function useCategoryBreakdown(enabled: boolean) {
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

// ─── Chart Configs ──────────────────────────────────────────────────

type TrendPeriod = "7d" | "30d" | "90d";
const PERIOD_DAYS: Record<TrendPeriod, number> = { "7d": 7, "30d": 30, "90d": 90 };

export function AdminOverview() {
  const { tAdmin, locale } = useAdminTranslation();
  const { isModerator } = useAdminAccess();
  const showAdminOnlyWidgets = !isModerator;
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("30d");
  const [trendsOpen, setTrendsOpen] = useState(false);
  const [activityPage, setActivityPage] = useState(0);
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: expenseTrend, isLoading: trendLoading } = useExpenseTrend(locale, showAdminOnlyWidgets && trendsOpen, PERIOD_DAYS[trendPeriod]);
  const { data: registrations, isLoading: regLoading } = useRegistrationTrend(locale, showAdminOnlyWidgets && trendsOpen);
  const { data: categories, isLoading: catLoading } = useCategoryBreakdown(showAdminOnlyWidgets && trendsOpen);
  const { data: allLatestUsers, isLoading: latestLoading } = useLatestTrackedUsers(showAdminOnlyWidgets);

  const latestUsers = (allLatestUsers ?? []).slice(activityPage * ACTIVITY_PAGE_SIZE, (activityPage + 1) * ACTIVITY_PAGE_SIZE);
  const hasMoreActivity = (allLatestUsers ?? []).length > (activityPage + 1) * ACTIVITY_PAGE_SIZE;

  const { containerVariants: statVariants, rowVariants: statRowVariants, animationKey: statKey } = useStaggerAnimation([...STAT_CARDS]);

  // Build pie chart config dynamically
  const categoryChartConfig: ChartConfig = (categories ?? []).reduce(
    (cfg, item) => {
      const key = item.category.toLowerCase().replace(/[^a-z0-9]/g, "_");
      cfg[key] = {
        label: item.category,
        color: item.fill,
      };
      return cfg;
    },
    {} as ChartConfig,
  );

  const pieData = (categories ?? []).map((item) => ({
    category: item.category.toLowerCase().replace(/[^a-z0-9]/g, "_"),
    amount: item.amount,
    fill: item.fill,
  }));

  const expenseChartConfig = useMemo(() => ({
    total: {
      label: tAdmin("overview.expenseChartLabel"),
      color: "var(--chart-1)",
    },
  }) satisfies ChartConfig, [tAdmin]);

  const registrationChartConfig = useMemo(() => ({
    count: {
      label: tAdmin("overview.registrationChartLabel"),
      color: "var(--chart-positive)",
    },
  }) satisfies ChartConfig, [tAdmin]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={tAdmin("overview.title")}
        description={tAdmin("overview.subtitle")}
      />

      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionDivider label={tAdmin("overview.keyMetrics")} />
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 viewport-transition-grid"
          variants={statVariants}
          initial="hidden"
          animate="visible"
          key={statKey}
        >
          {statsLoading
            ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
            : STAT_CARDS.map((card, index) => {
                const Icon = card.icon;
                const value = stats?.[card.key] ?? 0;

                let trendPercent = 0;
                if (stats) {
                  switch (card.key) {
                    case "totalUsers":
                      trendPercent = calcTrendPercent(stats.totalUsers, stats.prevTotalUsers);
                      break;
                    case "totalGroups":
                      trendPercent = calcTrendPercent(stats.totalGroups, stats.prevTotalGroups);
                      break;
                    case "totalExpenses":
                      trendPercent = calcTrendPercent(stats.currExpenses30d, stats.prevExpenses30d);
                      break;
                    case "totalPayments":
                      trendPercent = calcTrendPercent(stats.currPayments30d, stats.prevPayments30d);
                      break;
                    case "activeUsersLast7Days":
                      trendPercent = calcTrendPercent(stats.activeUsersLast7Days, stats.prevActiveUsers7d);
                      break;
                  }
                }

                return (
                  <motion.div key={card.key} variants={statRowVariants} custom={index}>
                    <Card className="p-3 sm:p-4 transition-shadow hover:shadow-sm">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${themeIntentTones[card.tone].surface} ${themeIntentTones[card.tone].icon}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[11px] font-medium text-muted-foreground">
                            {tAdmin(card.labelKey)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold tabular-nums tracking-tight">
                              {formatNumber(value)}
                            </span>
                            <TrendIndicator
                              value={Math.abs(trendPercent)}
                              isPositive={trendPercent >= 0}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
        </motion.div>
      </div>

      {showAdminOnlyWidgets && (
        <>
      {/* ── Trends ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Collapsible open={trendsOpen} onOpenChange={setTrendsOpen}>
          <CollapsibleTrigger asChild>
            <button type="button" className="w-full flex items-center gap-3 cursor-pointer group">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                {tAdmin("overview.trends")}
              </span>
              <div className="flex-1 h-px bg-border/60" />
              <ChevronDownIcon
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${trendsOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{tAdmin("overview.expenseTrend")}</CardTitle>
              <CardDescription>
                {trendPeriod === "7d" ? tAdmin("overview.last7Days") : trendPeriod === "90d" ? tAdmin("overview.last90Days") : tAdmin("overview.last30Days")}
              </CardDescription>
            </div>
            <div className="flex items-center rounded-lg border bg-muted/50 p-1 gap-0.5">
              {(["7d", "30d", "90d"] as TrendPeriod[]).map((p) => (
                <button type="button"
                  key={p}
                  onClick={() => setTrendPeriod(p)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    trendPeriod === p
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <LoadingBeam text={tAdmin("overview.loadingChart")} className="py-8" />
            ) : (
              <ChartContainer config={expenseChartConfig} className="h-[300px] w-full">
                <AreaChart
                  data={expenseTrend ?? []}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-total)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--color-total)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    width={34}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <span className="font-medium">{formatNumber(Number(value))} ₫</span>
                        )}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-total)"
                    strokeWidth={2}
                    fill="url(#expenseGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
          <CardFooter className="border-t pt-3 pb-3">
            <Link to="/admin/transactions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {tAdmin("overview.viewTransactionDetails")} <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </CardFooter>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: New Registrations 12 weeks */}
        <Card>
          <CardHeader>
            <CardTitle>{tAdmin("overview.newRegistrations")}</CardTitle>
            <CardDescription>{tAdmin("overview.last12Weeks")}</CardDescription>
          </CardHeader>
          <CardContent>
            {regLoading ? (
              <LoadingBeam text={tAdmin("common.loading")} className="py-6" />
            ) : (
              <ChartContainer config={registrationChartConfig} className="h-[280px] w-full">
                <RechartsBarChart
                  data={registrations ?? []}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    width={30}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <span className="font-medium">{tAdmin("overview.usersCount", { count: Number(value) })}</span>
                        )}
                      />
                    }
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[4, 4, 0, 0]}
                  />
                </RechartsBarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart: Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>{tAdmin("overview.categoryBreakdown")}</CardTitle>
            <CardDescription>{tAdmin("overview.allExpensesByCategory")}</CardDescription>
          </CardHeader>
          <CardContent>
            {catLoading ? (
              <LoadingBeam text={tAdmin("common.loading")} className="py-6" />
            ) : (
              <div className="relative">
                <ChartContainer config={categoryChartConfig} className="h-[280px] w-full">
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelKey="category"
                          formatter={(value) => (
                            <span className="font-medium">{formatNumber(Number(value))} ₫</span>
                          )}
                        />
                      }
                    />
                    <Pie
                      data={pieData}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius="80%"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="category" />} />
                  </PieChart>
                </ChartContainer>
                {/* Center donut label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: "-12px" }}>
                  <span className="text-lg font-bold tabular-nums">
                    {formatNumber(pieData.reduce((sum, d) => sum + d.amount, 0))}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ── Recent Activity ──────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionDivider label={tAdmin("overview.recentActivity")} />
        <Card>
        <CardHeader>
          <CardTitle>{tAdmin("overview.latestTrackedUsers")}</CardTitle>
          <CardDescription>{tAdmin("overview.latestTrackedUsersDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {latestLoading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-6 py-3">
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : !latestUsers.length ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              {tAdmin("overview.noTrackingData")}
            </p>
          ) : (
            <AnimatedList items={latestUsers} className="relative px-6 py-2">
              {latestUsers.map((user, index) => {
                const initials = (user.full_name ?? user.email).charAt(0).toUpperCase();
                const isLast = index === latestUsers.length - 1;
                return (
                  <AnimatedRow key={user.user_id} index={index}>
                    <Link
                      to={`/admin/people/${user.user_id}/journey`}
                      className="group relative flex items-center gap-3 py-3 hover:bg-transparent transition-colors"
                    >
                      <div className="relative flex flex-col items-center shrink-0 self-stretch" style={{ width: 32 }}>
                        <Avatar className="h-8 w-8 z-10">
                          {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name ?? user.email} />}
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        {!isLast && (
                          <div className="absolute top-8 bottom-0 left-1/2 -translate-x-1/2 w-px bg-border/60" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none truncate group-hover:text-primary transition-colors">
                          {user.full_name ?? user.email}
                        </p>
                        {user.full_name && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                        )}
                        {user.last_page && (
                          <p className="text-xs text-muted-foreground/70 truncate mt-0.5 font-mono">
                            {user.last_page}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {user.device_type && (
                          <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                            {user.device_type}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {tAdmin("overview.sessions", { count: user.session_count })}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(user.last_seen_at, tAdmin)}
                        </span>
                      </div>
                    </Link>
                  </AnimatedRow>
                );
              })}
            </AnimatedList>
          )}
        </CardContent>
        <CardFooter className="border-t pt-3 pb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={activityPage === 0 || latestLoading}
              onClick={() => setActivityPage((p) => p - 1)}
              className="h-7 px-2 text-xs"
            >
              ← Prev
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">Page {activityPage + 1}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMoreActivity || latestLoading}
              onClick={() => setActivityPage((p) => p + 1)}
              className="h-7 px-2 text-xs"
            >
              Next →
            </Button>
          </div>
          <Link to="/admin/people" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {tAdmin("overview.viewAllUsers")} <ArrowRightIcon className="h-3 w-3" />
          </Link>
        </CardFooter>
      </Card>
      </div>
        </>
      )}

    </div>
  );
}
