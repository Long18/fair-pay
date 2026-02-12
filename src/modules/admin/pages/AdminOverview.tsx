import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  LineChart,
  Line,
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
import { supabaseClient } from "@/utility/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import type { AdminStats } from "../types";

interface RecentActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  actor_email: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}
import { formatNumber } from "@/lib/locale-utils";

// ─── Trend Indicator ────────────────────────────────────────────────

function TrendIndicator({ value, isPositive }: { value: number; isPositive: boolean }) {
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

// ─── Stat Card Skeleton ─────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </Card>
  );
}

// ─── Activity Skeleton ──────────────────────────────────────────────

function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-3 py-3">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex flex-col gap-1.5 flex-1">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
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
      // RPC returns snake_case keys, map to camelCase
      const raw = data as Record<string, number>;
      return {
        totalUsers: raw.total_users ?? 0,
        totalGroups: raw.total_groups ?? 0,
        totalExpenses: raw.total_expenses ?? 0,
        totalPayments: raw.total_payments ?? 0,
        activeUsersLast7Days: raw.active_users_7d ?? 0,
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
        .is("deleted_at", null)
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
        .select("category, amount")
        .is("deleted_at", null);

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

function useRecentActivity() {
  return useQuery<RecentActivityItem[]>({
    queryKey: ["admin", "recent-activity"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("read_audit_trail", {
        p_limit: 5,
      });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id as string,
        action: row.action_type as string,
        entity_type: row.entity_type as string,
        entity_id: row.entity_id as string,
        actor_id: row.actor as string,
        actor_email: (row.actor_email ?? row.actor_name ?? null) as string | null,
        metadata: row.metadata as Record<string, unknown> | undefined,
        created_at: (row.action_timestamp ?? row.created_at) as string,
      }));
    },
    staleTime: 30_000,
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
  const { data: activities, isLoading: actLoading } = useRecentActivity();

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
                      {/* Trend placeholder — real trend requires historical comparison */}
                      <TrendIndicator value={0} isPositive={true} />
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
            <Skeleton className="h-[300px] w-full rounded-lg" />
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
              <Skeleton className="h-[280px] w-full rounded-lg" />
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
              <Skeleton className="h-[280px] w-full rounded-lg" />
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

      {/* ── Recent Activity ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Hoạt động gần đây</CardTitle>
          <CardDescription>5 hoạt động mới nhất trong hệ thống</CardDescription>
        </CardHeader>
        <CardContent>
          {actLoading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <ActivitySkeleton key={i} />
              ))}
            </div>
          ) : (activities ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Chưa có hoạt động nào
            </p>
          ) : (
            <div className="divide-y">
              {(activities ?? []).map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">
                      {(item.actor_email ?? "?")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-sm leading-snug">
                      <span className="font-medium">{item.actor_email ?? "System"}</span>{" "}
                      <span className="text-muted-foreground">
                        {item.action} {item.entity_type}
                      </span>
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(item.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="pt-4 border-t mt-4">
            <Link
              to="/admin/audit-logs"
              className="text-sm font-medium text-primary hover:underline"
            >
              Xem tất cả →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}
