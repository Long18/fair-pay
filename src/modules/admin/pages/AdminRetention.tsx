import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { supabaseClient } from "@/utility/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingBeam } from "@/components/ui/loading-beam";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import {
  RepeatIcon,
  UsersIcon,
  ActivityIcon,
} from "@/components/ui/icons";
import { formatNumber } from "@/lib/locale-utils";
import { useAdminTranslation } from "../i18n";
import { useAdminAccess } from "../hooks/use-admin-access";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";

// ─── Types ──────────────────────────────────────────────────────────

interface OnboardingSteps {
  profile?: boolean;
  friend?: boolean;
  group?: boolean;
  expense?: boolean;
  settle?: boolean;
}

interface OnboardingRow {
  onboarding_steps: OnboardingSteps | null;
  onboarding_completed: boolean | null;
}

interface OnboardingFunnelStep {
  key: keyof OnboardingSteps;
  labelKey: string;
  count: number;
  total: number;
  pct: number;
}

interface StreakBucket {
  label: string;
  bucket: string;
  users: number;
}

interface DebtAgingSummary {
  usersWithOldDebt: number;
  totalPendingDebt: number;
  remindersSent: number;
}

// ─── Data Hooks ─────────────────────────────────────────────────────

function useOnboardingFunnel(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "onboarding-funnel"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("onboarding_steps, onboarding_completed");

      if (error) throw error;

      const rows = (data ?? []) as OnboardingRow[];
      const total = rows.length;
      if (total === 0) return { steps: [] as OnboardingFunnelStep[], total: 0, completedCount: 0 };

      const stepKeys: Array<keyof OnboardingSteps> = ["profile", "friend", "group", "expense", "settle"];
      const stepLabelKeys: Record<keyof OnboardingSteps, string> = {
        profile: "retention.stepProfile",
        friend: "retention.stepFriend",
        group: "retention.stepGroup",
        expense: "retention.stepExpense",
        settle: "retention.stepSettle",
      };

      const counts: Record<keyof OnboardingSteps, number> = {
        profile: 0,
        friend: 0,
        group: 0,
        expense: 0,
        settle: 0,
      };

      let completedCount = 0;
      for (const row of rows) {
        if (row.onboarding_completed) completedCount++;
        for (const key of stepKeys) {
          if (row.onboarding_steps?.[key]) counts[key]++;
        }
      }

      const steps: OnboardingFunnelStep[] = stepKeys.map((key) => ({
        key,
        labelKey: stepLabelKeys[key],
        count: counts[key],
        total,
        pct: total > 0 ? Math.round((counts[key] / total) * 100) : 0,
      }));

      return { steps, total, completedCount };
    },
    enabled,
    staleTime: 60_000,
  });
}

function useStreakDistribution(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "streak-distribution"],
    queryFn: async () => {
      // Fetch page view events per user in last 60 days to approximate streaks
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data, error } = await supabaseClient
        .from("user_journey_events")
        .select("user_id, created_at")
        .eq("event_type", "page_view")
        .gte("created_at", sixtyDaysAgo.toISOString());

      if (error) throw error;

      // Group distinct days per user
      const userDays: Record<string, Set<string>> = {};
      for (const row of data ?? []) {
        const day = (row.created_at as string).slice(0, 10);
        if (!userDays[row.user_id]) userDays[row.user_id] = new Set();
        userDays[row.user_id].add(day);
      }

      // Compute max consecutive streak per user
      const buckets = { "0": 0, "1-3": 0, "4-7": 0, "8-14": 0, "15+": 0 };

      for (const days of Object.values(userDays)) {
        const sorted = Array.from(days).sort();
        let maxStreak = 1;
        let currentStreak = 1;
        for (let i = 1; i < sorted.length; i++) {
          const prev = new Date(sorted[i - 1]);
          const curr = new Date(sorted[i]);
          const diff = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
          if (diff === 1) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
          } else if (diff > 1) {
            currentStreak = 1;
          }
        }

        if (maxStreak === 0) buckets["0"]++;
        else if (maxStreak <= 3) buckets["1-3"]++;
        else if (maxStreak <= 7) buckets["4-7"]++;
        else if (maxStreak <= 14) buckets["8-14"]++;
        else buckets["15+"]++;
      }

      // Users with zero activity
      const { count: totalUsers } = await supabaseClient
        .from("profiles")
        .select("id", { count: "exact", head: true });
      const activeCount = Object.values(userDays).length;
      buckets["0"] += Math.max(0, (totalUsers ?? 0) - activeCount);

      return [
        { label: "0d", bucket: "0", users: buckets["0"] },
        { label: "1-3d", bucket: "1-3", users: buckets["1-3"] },
        { label: "4-7d", bucket: "4-7", users: buckets["4-7"] },
        { label: "8-14d", bucket: "8-14", users: buckets["8-14"] },
        { label: "15+d", bucket: "15+", users: buckets["15+"] },
      ] as StreakBucket[];
    },
    enabled,
    staleTime: 120_000,
  });
}

function useDebtAging(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "debt-aging"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Unsettled splits older than 7 days
      const { data: splits, error: splitsError } = await supabaseClient
        .from("payment_splits")
        .select("user_id, amount")
        .eq("settled", false)
        .lt("created_at", sevenDaysAgo.toISOString());

      if (splitsError) throw splitsError;

      const rows = splits ?? [];
      const uniqueUsers = new Set(rows.map((r) => r.user_id)).size;
      const totalDebt = rows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

      // Reminders sent in last 30 days — query pending_email table
      const { count: remindersSent, error: remindersError } = await supabaseClient
        .from("pending_email")
        .select("id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (remindersError) {
        // Non-critical — proceed with 0
        console.warn("Could not load reminders count:", remindersError);
      }

      return {
        usersWithOldDebt: uniqueUsers,
        totalPendingDebt: totalDebt,
        remindersSent: remindersSent ?? 0,
      } satisfies DebtAgingSummary;
    },
    enabled,
    staleTime: 60_000,
  });
}

// ─── Stat Card ───────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string | number;
  loading: boolean;
}

function RetentionStatCard({ icon: Icon, label, value, loading }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs text-muted-foreground">{label}</span>
          {loading ? (
            <div className="h-7 w-20 bg-muted rounded animate-pulse" />
          ) : (
            <span className="text-2xl font-semibold tabular-nums">{value}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export function AdminRetention() {
  const { tAdmin } = useAdminTranslation();
  const { canViewRetention } = useAdminAccess();

  const { data: funnel, isLoading: funnelLoading } = useOnboardingFunnel(canViewRetention);
  const { data: streaks, isLoading: streaksLoading } = useStreakDistribution(canViewRetention);
  const { data: debtAging, isLoading: debtLoading } = useDebtAging(canViewRetention);

  // Stagger for stat cards (3 items)
  const statItems = useMemo(() => [0, 1, 2], []);
  const { containerVariants, rowVariants, animationKey } = useStaggerAnimation(statItems);

  const streakChartConfig = useMemo(
    () =>
      ({
        users: {
          label: tAdmin("retention.users"),
          color: "var(--chart-2)",
        },
      }) satisfies ChartConfig,
    [tAdmin],
  );

  if (!canViewRetention) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">{tAdmin("common.accessDenied")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tAdmin("retention.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{tAdmin("retention.subtitle")}</p>
      </div>

      {/* ── Debt Aging Stat Cards ────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {tAdmin("retention.debtAging")}
        </p>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={animationKey}
        >
          <motion.div variants={rowVariants} custom={0}>
            <RetentionStatCard
              icon={UsersIcon}
              label={tAdmin("retention.usersWithOldDebt")}
              value={formatNumber(debtAging?.usersWithOldDebt ?? 0)}
              loading={debtLoading}
            />
          </motion.div>
          <motion.div variants={rowVariants} custom={1}>
            <RetentionStatCard
              icon={ActivityIcon}
              label={tAdmin("retention.remindersSent")}
              value={formatNumber(debtAging?.remindersSent ?? 0)}
              loading={debtLoading}
            />
          </motion.div>
          <motion.div variants={rowVariants} custom={2}>
            <RetentionStatCard
              icon={RepeatIcon}
              label={tAdmin("retention.completionRate")}
              value={
                funnel && funnel.total > 0
                  ? `${Math.round((funnel.completedCount / funnel.total) * 100)}%`
                  : "—"
              }
              loading={funnelLoading}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* ── Onboarding Funnel ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{tAdmin("retention.onboardingFunnel")}</CardTitle>
          <CardDescription>
            {funnel && funnel.total > 0
              ? `${tAdmin("retention.completionRate")}: ${Math.round((funnel.completedCount / funnel.total) * 100)}% (${formatNumber(funnel.completedCount)} / ${formatNumber(funnel.total)})`
              : tAdmin("retention.noData")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {funnelLoading ? (
            <LoadingBeam className="py-8" />
          ) : !funnel?.steps.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{tAdmin("retention.noData")}</p>
          ) : (
            <div className="space-y-4">
              {funnel.steps.map((step) => (
                <div key={step.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{tAdmin(step.labelKey)}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatNumber(step.count)} / {formatNumber(step.total)}
                      <span className="ml-2 font-semibold text-foreground">{step.pct}%</span>
                    </span>
                  </div>
                  <Progress value={step.pct} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Streak Distribution ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{tAdmin("retention.streakDistribution")}</CardTitle>
          <CardDescription>{tAdmin("retention.users")}</CardDescription>
        </CardHeader>
        <CardContent>
          {streaksLoading ? (
            <LoadingBeam className="py-8" />
          ) : !streaks?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{tAdmin("retention.noData")}</p>
          ) : (
            <ChartContainer config={streakChartConfig} className="h-[280px] w-full">
              <RechartsBarChart
                data={streaks}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  width={36}
                  allowDecimals={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <span className="font-medium">
                          {formatNumber(Number(value))} {tAdmin("retention.users").toLowerCase()}
                        </span>
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="users"
                  fill="var(--color-users)"
                  radius={[4, 4, 0, 0]}
                />
              </RechartsBarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
