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
import { supabaseClient } from "@/utility/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { LoadingBeam } from "@/components/ui/loading-beam";
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
} from "@/components/ui/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { AdminStats } from "../types";

import { formatNumber } from "@/lib/locale-utils";

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

function formatRelativeTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function useLatestTrackedUsers() {
  return useQuery({
    queryKey: ["admin", "latest-tracked-users"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("admin_get_latest_tracked_users", { p_limit: 10 });
      if (error) throw error;
      return (data ?? []) as LatestTrackedUser[];
    },
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
  const colorClass = isPositive ? "text-emerald-600" : "text-red-500";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${colorClass}`}>
      <Icon size={12} />
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

// ─── Stat Card Skeleton ─────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
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
  { key: "totalUsers", label: "Tổng người dùng", icon: UsersIcon, color: "bg-blue-500/10 text-blue-500" },
  { key: "totalGroups", label: "Tổng nhóm", icon: GroupIcon, color: "bg-violet-500/10 text-violet-500" },
  { key: "totalExpenses", label: "Tổng chi phí", icon: ReceiptIcon, color: "bg-amber-500/10 text-amber-500" },
  { key: "totalPayments", label: "Tổng thanh toán", icon: CreditCardIcon, color: "bg-emerald-500/10 text-emerald-500" },
  { key: "activeUsersLast7Days", label: "Hoạt động 7 ngày", icon: ActivityIcon, color: "bg-pink-500/10 text-pink-500" },
] as const;

// ─── Chart Colors ───────────────────────────────────────────────────

const CATEGORY_COLORS = [
  "oklch(0.598 0.365 217.2)", // blue
  "oklch(0.65 0.15 160)",     // green
  "oklch(0.531 0.380 24.6)",  // orange
  "oklch(0.65 0.22 300)",     // purple
  "oklch(0.556 0 0)",         // gray
  "oklch(0.75 0.15 80)",      // yellow
  "oklch(0.65 0.22 340)",     // pink
  "oklch(0.577 0.245 27.325)",// red
];

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

function useExpenseTrend() {
  return useQuery({
    queryKey: ["admin", "expense-trend-30d"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabaseClient
        .from("expenses")
        .select("expense_date, amount")
        .gte("expense_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("expense_date", { ascending: true });

      if (error) throw error;

      // Group by date
      const grouped: Record<string, number> = {};
      for (const row of data ?? []) {
        const date = row.expense_date;
        grouped[date] = (grouped[date] ?? 0) + Number(row.amount);
      }

      return Object.entries(grouped).map(([date, total]) => ({
        date,
        label: new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        total,
      }));
    },
    staleTime: 60_000,
  });
}

function useRegistrationTrend() {
  return useQuery({
    queryKey: ["admin", "registration-trend-12w"],
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
          label: new Date(week).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
          count,
        }));
    },
    staleTime: 60_000,
  });
}

function useCategoryBreakdown() {
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
        .map(([category, amount], i) => ({
          category,
          amount,
          fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        }))
        .sort((a, b) => b.amount - a.amount);
    },
    staleTime: 60_000,
  });
}

// ─── Chart Configs ──────────────────────────────────────────────────

const expenseChartConfig = {
  total: {
    label: "Chi phí",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const registrationChartConfig = {
  count: {
    label: "Đăng ký mới",
    color: "oklch(0.65 0.15 160)", // success green
  },
} satisfies ChartConfig;

// ─── Main Component ─────────────────────────────────────────────────

export function AdminOverview() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: expenseTrend, isLoading: trendLoading } = useExpenseTrend();
  const { data: registrations, isLoading: regLoading } = useRegistrationTrend();
  const { data: categories, isLoading: catLoading } = useCategoryBreakdown();
  const { data: latestUsers, isLoading: latestLoading } = useLatestTrackedUsers();

  // Build pie chart config dynamically
  const categoryChartConfig: ChartConfig = (categories ?? []).reduce(
    (cfg, item, i) => {
      const key = item.category.toLowerCase().replace(/[^a-z0-9]/g, "_");
      cfg[key] = {
        label: item.category,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
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

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statsLoading
          ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          : STAT_CARDS.map((card) => {
              const Icon = card.icon;
              const value = stats?.[card.key] ?? 0;

              // Compute trend % based on comparison period
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
                <Card key={card.key} className="p-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-muted-foreground">{card.label}</span>
                      <span className="text-2xl font-bold">{formatNumber(value)}</span>
                      <TrendIndicator value={Math.abs(trendPercent)} isPositive={trendPercent >= 0} />
                    </div>
                  </div>
                </Card>
              );
            })}
      </div>

      {/* ── Line Chart: Expense Trend 30 days ──────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Xu hướng chi phí</CardTitle>
          <CardDescription>30 ngày gần nhất</CardDescription>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <LoadingBeam text="Đang tải biểu đồ..." className="py-8" />
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
      </Card>

      {/* ── Bar + Pie Charts ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: New Registrations 12 weeks */}
        <Card>
          <CardHeader>
            <CardTitle>Đăng ký mới</CardTitle>
            <CardDescription>12 tuần gần nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {regLoading ? (
              <LoadingBeam text="Đang tải..." className="py-6" />
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
                          <span className="font-medium">{Number(value)} người dùng</span>
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
            <CardTitle>Phân bổ danh mục</CardTitle>
            <CardDescription>Tất cả chi phí theo danh mục</CardDescription>
          </CardHeader>
          <CardContent>
            {catLoading ? (
              <LoadingBeam text="Đang tải..." className="py-6" />
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Latest Tracked Users ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Người dùng truy cập gần đây</CardTitle>
          <CardDescription>Người dùng được theo dõi gần nhất</CardDescription>
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
          ) : !latestUsers?.length ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              Chưa có dữ liệu theo dõi
            </p>
          ) : (
            <div className="divide-y">
              {latestUsers.map((user) => {
                const initials = (user.full_name ?? user.email).charAt(0).toUpperCase();
                return (
                  <Link
                    key={user.user_id}
                    to={`/admin/people/${user.user_id}/journey`}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name ?? user.email} />}
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">
                        {user.full_name ?? user.email}
                      </p>
                      {user.full_name && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                      )}
                      {user.last_page && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{user.last_page}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {user.device_type && (
                        <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                          {user.device_type}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {user.session_count} phiên
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(user.last_seen_at)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-3 pb-3">
          <Link to="/admin/people" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Xem tất cả →
          </Link>
        </CardFooter>
      </Card>

    </div>
  );
}
