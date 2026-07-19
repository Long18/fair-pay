import { useMemo, useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUpIcon,
  UsersIcon,
  ActivityIcon,
  ArrowLeftIcon,
  RepeatIcon,
  MailIcon,
} from "@/components/ui/icons";
import { useAdminTranslation } from "../i18n";
import { useAdminAccess } from "../hooks/use-admin-access";
import { formatNumber } from "@/lib/locale-utils";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminTabs, AdminTabsContent } from "../components/AdminTabs";
import { AdminMetricCard, AdminMetricGrid } from "../components/AdminMetricCard";
import { useAdminTabParam } from "../hooks/use-admin-tab-param";
import type { ThemeIntent } from "@/lib/theme-intents";

// ─── Types ───────────────────────────────────────────────────────────

// Growth types
interface ReferralStats {
  totalCodes: number;
  totalSignups: number;
  totalClicks: number;
  activeReferrers: number;
}

interface ShareDataPoint {
  date: string;
  label: string;
  zalo: number;
  facebook: number;
  copy: number;
  download: number;
}

interface TopReferrer {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  invite_count: number;
  signup_count: number;
}

// Retention types
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

interface ActivationFunnel {
  cohort_days: number;
  signups: number;
  first_expense: number;
  active_7d: number;
  signup_to_expense_rate: number;
  signup_to_active_rate: number;
  expense_to_active_rate: number;
}

// Emails types
interface EmailStats {
  totalSent: number;
  sentLast7Days: number;
  pending: number;
}

interface SentEmail {
  id: string;
  user_id: string;
  type: string;
  email_sent_at: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UserEmailGroup {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  emails: SentEmail[];
  lastSent: string;
}

interface TypeEmailGroup {
  type: string;
  count: number;
  lastSent: string;
}

interface DayEmailPoint {
  date: string;
  label: string;
  count: number;
}

// ─── Growth Data Hooks ────────────────────────────────────────────────

function useReferralStats(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "referral-stats"],
    queryFn: async () => {
      const [codesRes, eventsRes] = await Promise.all([
        supabaseClient.from("referral_codes").select("id, user_id", { count: "exact", head: false }),
        supabaseClient.from("referral_events").select("referrer_id, event_type"),
      ]);

      if (codesRes.error) throw codesRes.error;
      if (eventsRes.error) throw eventsRes.error;

      const codes = codesRes.data ?? [];
      const events = eventsRes.data ?? [];

      const totalCodes = codes.length;
      const totalClicks = events.filter((e) => e.event_type === "click").length;
      const totalSignups = events.filter((e) => e.event_type === "signup").length;

      const activeReferrerSet = new Set(
        events.reduce<typeof events[number]["referrer_id"][]>((acc, e) => {
          if (e.event_type === "signup") acc.push(e.referrer_id);
          return acc;
        }, []),
      );
      const activeReferrers = activeReferrerSet.size;

      return {
        totalCodes,
        totalClicks,
        totalSignups,
        activeReferrers,
      } satisfies ReferralStats;
    },
    enabled,
    staleTime: 60_000,
  });
}

function useShareActivity(locale: string, enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "share-activity-30d", locale],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabaseClient
        .from("user_journey_events")
        .select("created_at, event_type")
        .like("event_type", "share_%")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      const grouped: Record<string, { zalo: number; facebook: number; copy: number; download: number }> = {};

      for (const row of data ?? []) {
        const dateKey = row.created_at.split("T")[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = { zalo: 0, facebook: 0, copy: 0, download: 0 };
        }
        const platform = row.event_type.replace("share_", "") as keyof typeof grouped[string];
        if (platform in grouped[dateKey]) {
          grouped[dateKey][platform] += 1;
        }
      }

      return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, counts]) => ({
          date,
          label: new Date(date).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" }),
          ...counts,
        })) satisfies ShareDataPoint[];
    },
    enabled,
    staleTime: 60_000,
  });
}

function useTopReferrers(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "top-referrers"],
    queryFn: async () => {
      const { data: events, error: eventsError } = await supabaseClient
        .from("referral_events")
        .select("referrer_id, event_type");

      if (eventsError) throw eventsError;

      const referrerMap: Record<string, { invites: number; signups: number }> = {};
      for (const ev of events ?? []) {
        if (!referrerMap[ev.referrer_id]) {
          referrerMap[ev.referrer_id] = { invites: 0, signups: 0 };
        }
        if (ev.event_type === "click") referrerMap[ev.referrer_id].invites += 1;
        if (ev.event_type === "signup") referrerMap[ev.referrer_id].signups += 1;
      }

      const topIds = Object.entries(referrerMap)
        .sort(([, a], [, b]) => b.invites - a.invites)
        .slice(0, 10)
        .map(([id]) => id);

      if (!topIds.length) return [];

      const { data: profiles, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", topIds);

      if (profilesError) throw profilesError;

      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

      return topIds.map((id) => ({
        user_id: id,
        full_name: profileMap[id]?.full_name ?? null,
        avatar_url: profileMap[id]?.avatar_url ?? null,
        invite_count: referrerMap[id].invites,
        signup_count: referrerMap[id].signups,
      })) satisfies TopReferrer[];
    },
    enabled,
    staleTime: 60_000,
  });
}

// ─── Retention Data Hooks ─────────────────────────────────────────────

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

const activationRpc = supabaseClient.rpc.bind(supabaseClient) as unknown as (
  fn: string,
  args?: Record<string, unknown>
) => PromiseLike<{ data: unknown; error: Error | null }>;

function useActivationFunnel(enabled: boolean, cohortDays = 30) {
  return useQuery({
    queryKey: ["admin", "activation-funnel", cohortDays],
    queryFn: async () => {
      const { data, error } = await activationRpc("admin_get_activation_funnel", {
        p_cohort_days: cohortDays,
      });
      if (error) throw error;
      return (data ?? {
        cohort_days: cohortDays,
        signups: 0,
        first_expense: 0,
        active_7d: 0,
        signup_to_expense_rate: 0,
        signup_to_active_rate: 0,
        expense_to_active_rate: 0,
      }) as ActivationFunnel;
    },
    enabled,
    staleTime: 60_000,
  });
}

function useStreakDistribution(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "streak-distribution"],
    queryFn: async () => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data, error } = await supabaseClient
        .from("user_journey_events")
        .select("user_id, created_at")
        .eq("event_type", "page_view")
        .gte("created_at", sixtyDaysAgo.toISOString());

      if (error) throw error;

      const userDays: Record<string, Set<string>> = {};
      for (const row of data ?? []) {
        const day = (row.created_at as string).slice(0, 10);
        if (!userDays[row.user_id]) userDays[row.user_id] = new Set();
        userDays[row.user_id].add(day);
      }

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

      const { data: splits, error: splitsError } = await supabaseClient
        .from("payment_splits")
        .select("user_id, amount")
        .eq("settled", false)
        .lt("created_at", sevenDaysAgo.toISOString());

      if (splitsError) throw splitsError;

      const rows = splits ?? [];
      const uniqueUsers = new Set(rows.map((r) => r.user_id)).size;
      const totalDebt = rows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

      const { count: remindersSent, error: remindersError } = await supabaseClient
        .from("pending_email")
        .select("id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (remindersError) {
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

// ─── Subscriptions Data Hook ──────────────────────────────────────────

interface SubscriptionStats {
  freeUsers: number;
  proUsers: number;
}

function useSubscriptionStats(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "subscription-stats"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("subscriptions")
        .select("plan");

      if (error) throw error;

      const rows = data ?? [];
      const proUsers = rows.filter((r) => r.plan === "pro").length;
      const freeUsers = rows.filter((r) => r.plan === "free").length;

      return { freeUsers, proUsers } satisfies SubscriptionStats;
    },
    enabled,
    staleTime: 60_000,
  });
}

// ─── Experiments Data Hooks ───────────────────────────────────────────

interface Experiment {
  id: string;
  key: string;
  description: string | null;
  variants: string[];
  is_active: boolean;
  created_at: string;
}

interface ExperimentAssignment {
  experiment_key: string;
  variant: string;
}

function useExperiments(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "experiments"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("experiments")
        .select("id, key, description, variants, is_active, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Experiment[];
    },
    enabled,
    staleTime: 60_000,
  });
}

function useExperimentAssignments(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "experiment-assignments"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("experiment_assignments")
        .select("experiment_key, variant");

      if (error) throw error;
      return (data ?? []) as ExperimentAssignment[];
    },
    enabled,
    staleTime: 60_000,
  });
}

// ─── Emails Data Hooks ────────────────────────────────────────────────

function useEmailStats(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "email-stats"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [totalRes, recentRes, pendingRes] = await Promise.all([
        supabaseClient
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .not("email_sent_at", "is", null),
        supabaseClient
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .not("email_sent_at", "is", null)
          .gte("email_sent_at", sevenDaysAgo.toISOString()),
        supabaseClient
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .is("email_sent_at", null),
      ]);

      if (totalRes.error) throw totalRes.error;
      if (recentRes.error) throw recentRes.error;
      if (pendingRes.error) throw pendingRes.error;

      return {
        totalSent: totalRes.count ?? 0,
        sentLast7Days: recentRes.count ?? 0,
        pending: pendingRes.count ?? 0,
      } satisfies EmailStats;
    },
    enabled,
    staleTime: 60_000,
  });
}

function useSentEmails(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "sent-emails"],
    queryFn: async () => {
      const { data: notifications, error } = await supabaseClient
        .from("notifications")
        .select("id, user_id, type, email_sent_at")
        .not("email_sent_at", "is", null)
        .order("email_sent_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const rows = notifications ?? [];
      if (!rows.length) return [] as SentEmail[];

      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: profiles, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

      return rows.map((n) => ({
        id: n.id,
        user_id: n.user_id,
        type: n.type,
        email_sent_at: n.email_sent_at,
        full_name: profileMap[n.user_id]?.full_name ?? null,
        avatar_url: profileMap[n.user_id]?.avatar_url ?? null,
      })) satisfies SentEmail[];
    },
    enabled,
    staleTime: 60_000,
  });
}

// ─── Shared Sub-components ────────────────────────────────────────────

const SHARE_CHART_CONFIG = {
  zalo: { label: "Zalo", color: "var(--chart-1)" },
  facebook: { label: "Facebook", color: "var(--chart-2)" },
  copy: { label: "Copy link", color: "var(--chart-3)" },
  download: { label: "Download", color: "var(--chart-4)" },
} satisfies ChartConfig;

const FUNNEL_CARDS = [
  { key: "totalCodes" as const, labelKey: "growth.totalCodes", icon: TrendingUpIcon, intent: "brand" as ThemeIntent },
  { key: "totalSignups" as const, labelKey: "growth.totalSignups", icon: UsersIcon, intent: "info" as ThemeIntent },
  { key: "activeReferrers" as const, labelKey: "growth.activeReferrers", icon: ActivityIcon, intent: "success" as ThemeIntent },
] as const;

function ActivationFunnelSection({ enabled }: { enabled: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const { data, isLoading } = useActivationFunnel(enabled);
  const cards = useMemo(() => [0, 1, 2], []);
  const { containerVariants, rowVariants, animationKey } = useStaggerAnimation(cards);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {tAdmin("retention.activationFunnel")}
        </p>
        <p className="text-xs text-muted-foreground">
          {tAdmin("retention.activationCohort", { days: data?.cohort_days ?? 30 })}
        </p>
      </div>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={animationKey}
      >
        <AdminMetricGrid columns={3}>
          <motion.div variants={rowVariants} custom={0}>
            <AdminMetricCard
              icon={UsersIcon}
              label={tAdmin("retention.activationSignups")}
              value={formatNumber(data?.signups ?? 0)}
              loading={isLoading}
              intent="info"
            />
          </motion.div>
          <motion.div variants={rowVariants} custom={1}>
            <AdminMetricCard
              icon={ActivityIcon}
              label={tAdmin("retention.activationFirstExpense")}
              value={formatNumber(data?.first_expense ?? 0)}
              loading={isLoading}
              intent="brand"
              description={
                data
                  ? tAdmin("retention.activationRate", { rate: data.signup_to_expense_rate })
                  : undefined
              }
            />
          </motion.div>
          <motion.div variants={rowVariants} custom={2}>
            <AdminMetricCard
              icon={RepeatIcon}
              label={tAdmin("retention.activationActive7d")}
              value={formatNumber(data?.active_7d ?? 0)}
              loading={isLoading}
              intent="success"
              description={
                data
                  ? tAdmin("retention.activationRate", { rate: data.signup_to_active_rate })
                  : undefined
              }
            />
          </motion.div>
        </AdminMetricGrid>
      </motion.div>
    </div>
  );
}

// ─── Tab: Growth ──────────────────────────────────────────────────────

function GrowthTab({ enabled, locale }: { enabled: boolean; locale: string }) {
  const { tAdmin } = useAdminTranslation();

  const { data: referralStats, isLoading: referralLoading } = useReferralStats(enabled);
  const { data: shareData, isLoading: shareLoading } = useShareActivity(locale, enabled);
  const { data: topReferrers, isLoading: referrersLoading } = useTopReferrers(enabled);
  const { data: subscriptionStats, isLoading: subscriptionLoading } = useSubscriptionStats(enabled);

  const { containerVariants, rowVariants, animationKey } = useStaggerAnimation([...FUNNEL_CARDS]);
  const shareChartConfig = useMemo(() => SHARE_CHART_CONFIG, []);

  return (
    <div className="space-y-6">
      <ActivationFunnelSection enabled={enabled} />

      {/* ── Referral Funnel ────────────────────────────────────── */}
      <div className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {tAdmin("growth.referralFunnel")}
        </p>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={animationKey}
        >
          <AdminMetricGrid columns={3}>
            {FUNNEL_CARDS.map((card, index) => {
              const value = referralStats?.[card.key] ?? 0;
              return (
                <motion.div key={card.key} variants={rowVariants} custom={index}>
                  <AdminMetricCard
                    icon={card.icon}
                    label={tAdmin(card.labelKey)}
                    value={formatNumber(value)}
                    loading={referralLoading}
                    variant="accent"
                    intent={card.intent}
                  />
                </motion.div>
              );
            })}
          </AdminMetricGrid>
        </motion.div>
      </div>

      {/* ── Share Activity Chart ────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {tAdmin("growth.shareActivity")}
        </p>
        <Card>
          <CardHeader>
            <CardTitle>{tAdmin("growth.shareActivity")}</CardTitle>
            <CardDescription>Zalo · Facebook · Copy link · Download</CardDescription>
          </CardHeader>
          <CardContent>
            {shareLoading ? (
              <LoadingBeam className="py-8" />
            ) : !shareData?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {tAdmin("growth.noData")}
              </p>
            ) : (
              <ChartContainer config={shareChartConfig} className="h-[280px] w-full">
                <RechartsBarChart
                  data={shareData}
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
                  <YAxis tickLine={false} axisLine={false} tickMargin={4} width={30} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="zalo" fill="var(--color-zalo)" radius={[3, 3, 0, 0]} stackId="share" />
                  <Bar dataKey="facebook" fill="var(--color-facebook)" radius={[0, 0, 0, 0]} stackId="share" />
                  <Bar dataKey="copy" fill="var(--color-copy)" radius={[0, 0, 0, 0]} stackId="share" />
                  <Bar dataKey="download" fill="var(--color-download)" radius={[3, 3, 0, 0]} stackId="share" />
                </RechartsBarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Subscriptions Stats ─────────────────────────────────── */}
      <div className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {tAdmin("marketing.subscriptions")}
        </p>
        <AdminMetricGrid columns={2}>
          <AdminMetricCard
            icon={UsersIcon}
            label={tAdmin("marketing.freeUsers")}
            value={formatNumber(subscriptionStats?.freeUsers ?? 0)}
            loading={subscriptionLoading}
          />
          <AdminMetricCard
            icon={ActivityIcon}
            label={tAdmin("marketing.proUsers")}
            value={formatNumber(subscriptionStats?.proUsers ?? 0)}
            loading={subscriptionLoading}
          />
        </AdminMetricGrid>
      </div>

      {/* ── Top Referrers Table ─────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {tAdmin("growth.topReferrers")}
        </p>
        <Card>
          <CardHeader>
            <CardTitle>{tAdmin("growth.topReferrers")}</CardTitle>
            <CardDescription>Top 10 users by referrals</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {referrersLoading ? (
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-3">
                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : !topReferrers?.length ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                {tAdmin("growth.noData")}
              </p>
            ) : (
              <div className="divide-y">
                <div className="flex items-center gap-3 px-6 py-2 text-xs font-medium text-muted-foreground">
                  <div className="h-8 w-8 shrink-0" />
                  <div className="flex-1">{tAdmin("common.user")}</div>
                  <div className="w-20 text-right">{tAdmin("growth.inviteCount")}</div>
                  <div className="w-20 text-right">{tAdmin("growth.signupCount")}</div>
                </div>
                {topReferrers.map((referrer, index) => {
                  const initials = (referrer.full_name ?? referrer.user_id).charAt(0).toUpperCase();
                  return (
                    <motion.div
                      key={referrer.user_id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.2 }}
                      className="flex items-center gap-3 px-6 py-3"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        {referrer.avatar_url && (
                          <AvatarImage src={referrer.avatar_url} alt={referrer.full_name ?? referrer.user_id} />
                        )}
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none truncate">
                          {referrer.full_name ?? referrer.user_id}
                        </p>
                      </div>
                      <div className="w-20 text-right tabular-nums text-sm">
                        {formatNumber(referrer.invite_count)}
                      </div>
                      <div className="w-20 text-right tabular-nums text-sm text-muted-foreground">
                        {formatNumber(referrer.signup_count)}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: Retention ───────────────────────────────────────────────────

function RetentionTab({ enabled }: { enabled: boolean }) {
  const { tAdmin } = useAdminTranslation();

  const { data: funnel, isLoading: funnelLoading } = useOnboardingFunnel(enabled);
  const { data: streaks, isLoading: streaksLoading } = useStreakDistribution(enabled);
  const { data: debtAging, isLoading: debtLoading } = useDebtAging(enabled);

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

  return (
    <div className="space-y-6">
      <ActivationFunnelSection enabled={enabled} />

      {/* ── Debt Aging Stat Cards ────────────────────────────────── */}
      <div className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {tAdmin("retention.debtAging")}
        </p>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={animationKey}
        >
          <AdminMetricGrid columns={3}>
            <motion.div variants={rowVariants} custom={0}>
              <AdminMetricCard
                icon={UsersIcon}
                label={tAdmin("retention.usersWithOldDebt")}
                value={formatNumber(debtAging?.usersWithOldDebt ?? 0)}
                loading={debtLoading}
              />
            </motion.div>
            <motion.div variants={rowVariants} custom={1}>
              <AdminMetricCard
                icon={ActivityIcon}
                label={tAdmin("retention.remindersSent")}
                value={formatNumber(debtAging?.remindersSent ?? 0)}
                loading={debtLoading}
              />
            </motion.div>
            <motion.div variants={rowVariants} custom={2}>
              <AdminMetricCard
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
          </AdminMetricGrid>
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

// ─── Tab: Emails ──────────────────────────────────────────────────────

type EmailViewMode = "users" | "types" | "timeline";

function EmailsTab({ enabled }: { enabled: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const [viewMode, setViewMode] = useState<EmailViewMode>("users");
  const [selectedUser, setSelectedUser] = useState<UserEmailGroup | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const { data: emailStats, isLoading: statsLoading } = useEmailStats(enabled);
  const { data: sentEmails, isLoading: emailsLoading } = useSentEmails(enabled);

  const statItems = useMemo(() => [0, 1, 2], []);
  const { containerVariants, rowVariants, animationKey } = useStaggerAnimation(statItems);

  const groupedByUser = useMemo((): UserEmailGroup[] => {
    if (!sentEmails) return [];
    const map = new Map<string, UserEmailGroup>();
    for (const email of sentEmails) {
      if (!map.has(email.user_id)) {
        map.set(email.user_id, { user_id: email.user_id, full_name: email.full_name, avatar_url: email.avatar_url, emails: [], lastSent: email.email_sent_at });
      }
      const g = map.get(email.user_id)!;
      g.emails.push(email);
      if (email.email_sent_at > g.lastSent) g.lastSent = email.email_sent_at;
    }
    return Array.from(map.values()).sort((a, b) => b.emails.length - a.emails.length);
  }, [sentEmails]);

  const groupedByType = useMemo((): TypeEmailGroup[] => {
    if (!sentEmails) return [];
    const map = new Map<string, TypeEmailGroup>();
    for (const email of sentEmails) {
      if (!map.has(email.type)) map.set(email.type, { type: email.type, count: 0, lastSent: email.email_sent_at });
      const g = map.get(email.type)!;
      g.count++;
      if (email.email_sent_at > g.lastSent) g.lastSent = email.email_sent_at;
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [sentEmails]);

  const timelineData = useMemo((): DayEmailPoint[] => {
    if (!sentEmails) return [];
    const map: Record<string, number> = {};
    for (const email of sentEmails) {
      const day = email.email_sent_at.slice(0, 10);
      map[day] = (map[day] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        label: new Date(date).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" }),
        count,
      }));
  }, [sentEmails]);

  const timelineChartConfig = useMemo(() => ({
    count: { label: "Emails sent", color: "var(--chart-1)" },
  }) satisfies ChartConfig, []);

  // ── User detail view ──
  if (selectedUser) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSelectedUser(null)} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          <span className="text-muted-foreground">/</span>
          <Avatar className="h-5 w-5">
            {selectedUser.avatar_url && <AvatarImage src={selectedUser.avatar_url} />}
            <AvatarFallback className="text-xs">{(selectedUser.full_name ?? "?").charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{selectedUser.full_name ?? selectedUser.user_id}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <AdminMetricCard icon={MailIcon} label="Total emails" value={selectedUser.emails.length} loading={false} />
          <AdminMetricCard icon={ActivityIcon} label="Last sent" value={new Date(selectedUser.lastSent).toLocaleDateString()} loading={false} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Email History</CardTitle>
            <CardDescription>All emails sent to {selectedUser.full_name ?? selectedUser.user_id}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {selectedUser.emails.map((email, i) => (
                <motion.div key={email.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 px-6 py-3">
                  <Badge variant="secondary" className="text-xs font-mono shrink-0">{email.type}</Badge>
                  <div className="flex-1" />
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {new Date(email.email_sent_at).toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Type detail view ──
  if (selectedType) {
    const typeEmails = sentEmails?.filter((e) => e.type === selectedType) ?? [];
    const typeCount = groupedByType.find((g) => g.type === selectedType)?.count ?? 0;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSelectedType(null)} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          <span className="text-muted-foreground">/</span>
          <Badge variant="secondary" className="font-mono">{selectedType}</Badge>
        </div>
        <AdminMetricCard icon={MailIcon} label="Total sent" value={formatNumber(typeCount)} loading={false} />
        <Card>
          <CardHeader>
            <CardTitle>Recipients</CardTitle>
            <CardDescription>{typeCount} emails of type <span className="font-mono">{selectedType}</span></CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {typeEmails.map((email, i) => {
                const initials = (email.full_name ?? email.user_id).charAt(0).toUpperCase();
                return (
                  <motion.div key={email.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 px-6 py-3">
                    <Avatar className="h-7 w-7 shrink-0">
                      {email.avatar_url && <AvatarImage src={email.avatar_url} />}
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <p className="flex-1 text-sm font-medium truncate">{email.full_name ?? email.user_id}</p>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {new Date(email.email_sent_at).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main list view ──
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4" variants={containerVariants} initial="hidden" animate="visible" key={animationKey}>
        <motion.div variants={rowVariants} custom={0}>
          <AdminMetricCard icon={MailIcon} label={tAdmin("marketing.emailsSent")} value={formatNumber(emailStats?.totalSent ?? 0)} loading={statsLoading} />
        </motion.div>
        <motion.div variants={rowVariants} custom={1}>
          <AdminMetricCard icon={ActivityIcon} label={tAdmin("marketing.emailsSentRecently")} value={formatNumber(emailStats?.sentLast7Days ?? 0)} loading={statsLoading} />
        </motion.div>
        <motion.div variants={rowVariants} custom={2}>
          <AdminMetricCard icon={RepeatIcon} label={tAdmin("marketing.emailsPending")} value={formatNumber(emailStats?.pending ?? 0)} loading={statsLoading} />
        </motion.div>
      </motion.div>

      {/* View switcher */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold">{tAdmin("marketing.recentEmailsTitle")}</h3>
        <div className="flex w-full rounded-xl border bg-muted/40 p-1 gap-1 sm:w-auto">
          {(["users", "types", "timeline"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              type="button"
              className={cn(
                "inline-flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none",
                viewMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "users" ? <UsersIcon className="h-3.5 w-3.5" aria-hidden="true" /> : mode === "types" ? <MailIcon className="h-3.5 w-3.5" aria-hidden="true" /> : <ActivityIcon className="h-3.5 w-3.5" aria-hidden="true" />}
              {mode === "users" ? "By User" : mode === "types" ? "By Type" : "Timeline"}
            </button>
          ))}
        </div>
      </div>

      {/* By User */}
      {viewMode === "users" && (
        <Card>
          <CardContent className="p-0">
            {emailsLoading ? (
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-3">
                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5"><div className="h-3 w-32 bg-muted rounded animate-pulse" /></div>
                    <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : !groupedByUser.length ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">{tAdmin("marketing.noEmailsSent")}</p>
            ) : (
              <div className="divide-y">
                {groupedByUser.map((group, i) => {
                  const initials = (group.full_name ?? group.user_id).charAt(0).toUpperCase();
                  return (
                    <motion.button
                      key={group.user_id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedUser(group)}
                      className="group flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        {group.avatar_url && <AvatarImage src={group.avatar_url} />}
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{group.full_name ?? group.user_id}</p>
                        <p className="text-xs text-muted-foreground">Last: {new Date(group.lastSent).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="tabular-nums">{group.emails.length}</Badge>
                        <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-sm">→</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* By Type */}
      {viewMode === "types" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {emailsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5 space-y-3">
                <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                <div className="h-8 w-14 bg-muted rounded animate-pulse" />
              </Card>
            ))
          ) : !groupedByType.length ? (
            <Card className="col-span-3">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">{tAdmin("marketing.noEmailsSent")}</p>
              </CardContent>
            </Card>
          ) : (
            groupedByType.map((group, i) => (
              <motion.div key={group.type} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card
                  className="group cursor-pointer rounded-lg transition-all hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setSelectedType(group.type)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setSelectedType(group.type);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="secondary" className="font-mono text-xs">{group.type}</Badge>
                      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </div>
                    <p className="text-2xl font-semibold tabular-nums">{formatNumber(group.count)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Last: {new Date(group.lastSent).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Timeline */}
      {viewMode === "timeline" && (
        <Card>
          <CardHeader>
            <CardTitle>Email Timeline</CardTitle>
            <CardDescription>Daily send volume (last 50 emails)</CardDescription>
          </CardHeader>
          <CardContent>
            {emailsLoading ? (
              <LoadingBeam className="py-8" />
            ) : !timelineData.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{tAdmin("marketing.noEmailsSent")}</p>
            ) : (
              <ChartContainer config={timelineChartConfig} className="h-[280px] w-full">
                <RechartsBarChart data={timelineData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} tickMargin={4} width={30} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Experiments ─────────────────────────────────────────────────

function ExperimentsTab({ enabled }: { enabled: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const [selectedExp, setSelectedExp] = useState<Experiment | null>(null);

  const { data: experiments, isLoading: experimentsLoading } = useExperiments(enabled);
  const { data: assignments, isLoading: assignmentsLoading } = useExperimentAssignments(enabled);

  const assignmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of assignments ?? []) {
      counts[a.experiment_key] = (counts[a.experiment_key] ?? 0) + 1;
    }
    return counts;
  }, [assignments]);

  const variantSummary = useMemo(() => {
    const result: Record<string, Array<{ variant: string; count: number; pct: number }>> = {};
    const perExp: Record<string, Record<string, number>> = {};
    for (const a of assignments ?? []) {
      if (!perExp[a.experiment_key]) perExp[a.experiment_key] = {};
      perExp[a.experiment_key][a.variant] = (perExp[a.experiment_key][a.variant] ?? 0) + 1;
    }
    for (const [expKey, varCounts] of Object.entries(perExp)) {
      const total = Object.values(varCounts).reduce((s, c) => s + c, 0);
      result[expKey] = Object.entries(varCounts).map(([variant, count]) => ({
        variant,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
    }
    return result;
  }, [assignments]);

  const isLoading = experimentsLoading || assignmentsLoading;

  // ── Detail view ──
  if (selectedExp) {
    const variants = variantSummary[selectedExp.key] ?? [];
    const totalAssignments = assignmentCounts[selectedExp.key] ?? 0;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => setSelectedExp(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {tAdmin("common.back") ?? "Back"}
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-mono font-medium">{selectedExp.key}</span>
          <Badge variant={selectedExp.is_active ? "default" : "outline"} className="text-xs ml-1">
            {selectedExp.is_active ? tAdmin("status.active") : tAdmin("status.inactive")}
          </Badge>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <AdminMetricCard icon={ActivityIcon} label={tAdmin("marketing.experimentAssignments")} value={formatNumber(totalAssignments)} loading={isLoading} />
          <AdminMetricCard icon={UsersIcon} label={tAdmin("marketing.experimentVariants")} value={selectedExp.variants.length} loading={false} />
          <Card className="p-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">{tAdmin("marketing.experimentKey")}</span>
              <span className="font-mono text-sm font-semibold break-all">{selectedExp.key}</span>
              <span className="text-xs text-muted-foreground mt-1">
                {new Date(selectedExp.created_at).toLocaleDateString()}
              </span>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Variant Distribution</CardTitle>
            <CardDescription>
              {selectedExp.description ?? selectedExp.key} · {formatNumber(totalAssignments)} users assigned
            </CardDescription>
          </CardHeader>
          <CardContent>
            {variants.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No assignments yet — experiment awaiting users</p>
            ) : (
              <div className="space-y-5">
                {variants.map((v) => (
                  <div key={v.variant} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs px-2">{v.variant}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <span className="text-muted-foreground tabular-nums">{formatNumber(v.count)} users</span>
                        <span className="font-bold tabular-nums w-10 text-right">{v.pct}%</span>
                      </div>
                    </div>
                    <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full w-full origin-left rounded-full bg-primary"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: v.pct / 100 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Experiment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Description</p>
                <p>{selectedExp.description ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Created</p>
                <p>{new Date(selectedExp.created_at).toLocaleDateString()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">All variants</p>
                <div className="flex flex-wrap gap-1">
                  {selectedExp.variants.map((v) => (
                    <Badge key={v} variant="secondary" className="font-mono text-xs">{v}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{tAdmin("marketing.experimentsTitle")}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{tAdmin("marketing.experimentsSubtitle")}</p>
        </div>
        <Badge variant="secondary">{experiments?.length ?? 0} experiments</Badge>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-5 space-y-3">
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-3 w-48 bg-muted rounded animate-pulse" />
              <div className="h-2 w-full bg-muted rounded animate-pulse mt-4" />
            </Card>
          ))}
        </div>
      ) : !experiments?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">{tAdmin("marketing.noExperiments")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {experiments.map((exp, index) => {
            const total = assignmentCounts[exp.key] ?? 0;
            const variants = variantSummary[exp.key] ?? [];
            return (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.25 }}
              >
                <Card
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
                  onClick={() => setSelectedExp(exp)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold truncate">{exp.key}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {exp.description ?? "No description"}
                        </p>
                      </div>
                      <Badge variant={exp.is_active ? "default" : "outline"} className="shrink-0 text-xs">
                        {exp.is_active ? tAdmin("status.active") : tAdmin("status.inactive")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatNumber(total)} users assigned</span>
                      <span>{exp.variants.length} variants</span>
                    </div>
                    {variants.length > 0 ? (
                      <div className="space-y-1.5">
                        {variants.map((v) => (
                          <div key={v.variant} className="flex items-center gap-2">
                            <span className="text-xs font-mono w-16 shrink-0 text-muted-foreground truncate">{v.variant}</span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className="h-full w-full origin-left bg-primary rounded-full"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: v.pct / 100 }}
                                transition={{ duration: 0.5, delay: index * 0.06 + 0.2 }}
                              />
                            </div>
                            <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{v.pct}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {exp.variants.map((v) => (
                          <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(exp.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        View details →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── AdminMarketing Page ──────────────────────────────────────────────

const MARKETING_TABS = ["growth", "retention", "emails", "experiments"] as const;

export function AdminMarketing() {
  const { tAdmin, locale } = useAdminTranslation();
  const { canViewGrowth } = useAdminAccess();
  const [activeTab, setActiveTab] = useAdminTabParam("growth", MARKETING_TABS);

  if (!canViewGrowth) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">{tAdmin("common.accessDenied")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={tAdmin("marketing.title")}
        description={tAdmin("marketing.subtitle")}
      />

      <AdminTabs
        value={activeTab}
        onValueChange={setActiveTab}
        listClassName="sm:grid-cols-4"
        items={[
          { value: "growth", label: tAdmin("marketing.tabGrowth") },
          { value: "retention", label: tAdmin("marketing.tabRetention") },
          { value: "emails", label: tAdmin("marketing.tabEmails") },
          { value: "experiments", label: tAdmin("marketing.tabExperiments") },
        ]}
      >
        <AdminTabsContent value="growth" className="mt-6">
          <GrowthTab enabled={canViewGrowth && activeTab === "growth"} locale={locale} />
        </AdminTabsContent>

        <AdminTabsContent value="retention" className="mt-6">
          <RetentionTab enabled={canViewGrowth && activeTab === "retention"} />
        </AdminTabsContent>

        <AdminTabsContent value="emails" className="mt-6">
          <EmailsTab enabled={canViewGrowth && activeTab === "emails"} />
        </AdminTabsContent>

        <AdminTabsContent value="experiments" className="mt-6">
          <ExperimentsTab enabled={canViewGrowth && activeTab === "experiments"} />
        </AdminTabsContent>
      </AdminTabs>
    </div>
  );
}
