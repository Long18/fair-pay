import { useMemo } from "react";
import { useSearchParams } from "react-router";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUpIcon,
  UsersIcon,
  ActivityIcon,
  RepeatIcon,
  MailIcon,
} from "@/components/ui/icons";
import { useAdminTranslation } from "../i18n";
import { useAdminAccess } from "../hooks/use-admin-access";
import { formatNumber } from "@/lib/locale-utils";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import { themeIntentTones } from "@/lib/theme-intents";

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
        events.filter((e) => e.event_type === "signup").map((e) => e.referrer_id),
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
        .select("experiment_key");

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
  { key: "totalCodes" as const, labelKey: "growth.totalCodes", icon: TrendingUpIcon, tone: "brand" as const },
  { key: "totalSignups" as const, labelKey: "growth.totalSignups", icon: UsersIcon, tone: "chart2" as const },
  { key: "activeReferrers" as const, labelKey: "growth.activeReferrers", icon: ActivityIcon, tone: "success" as const },
] as const;

const STAT_ACCENT_VARS: Record<string, string> = {
  brand: "var(--primary)",
  chart2: "var(--chart-2)",
  success: "var(--status-success-foreground)",
};

function StatCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
        <div className="flex flex-col gap-2">
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          <div className="h-7 w-16 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

interface SimpleStatCardProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string | number;
  loading: boolean;
}

function SimpleStatCard({ icon: Icon, label, value, loading }: SimpleStatCardProps) {
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
      {/* ── Referral Funnel ────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {tAdmin("growth.referralFunnel")}
        </p>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={animationKey}
        >
          {referralLoading
            ? Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
            : FUNNEL_CARDS.map((card, index) => {
                const Icon = card.icon;
                const value = referralStats?.[card.key] ?? 0;
                const accentColor = STAT_ACCENT_VARS[card.tone] ?? "var(--primary)";
                return (
                  <motion.div key={card.key} variants={rowVariants} custom={index}>
                    <Card className="p-5 border-l-4" style={{ borderLeftColor: accentColor }}>
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${themeIntentTones[card.tone].surface} ${themeIntentTones[card.tone].icon}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-xs text-muted-foreground truncate">
                            {tAdmin(card.labelKey)}
                          </span>
                          <span className="text-2xl font-semibold tabular-nums">
                            {formatNumber(value)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
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
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {tAdmin("marketing.subscriptions")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SimpleStatCard
            icon={UsersIcon}
            label={tAdmin("marketing.freeUsers")}
            value={formatNumber(subscriptionStats?.freeUsers ?? 0)}
            loading={subscriptionLoading}
          />
          <SimpleStatCard
            icon={ActivityIcon}
            label={tAdmin("marketing.proUsers")}
            value={formatNumber(subscriptionStats?.proUsers ?? 0)}
            loading={subscriptionLoading}
          />
        </div>
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
            <SimpleStatCard
              icon={UsersIcon}
              label={tAdmin("retention.usersWithOldDebt")}
              value={formatNumber(debtAging?.usersWithOldDebt ?? 0)}
              loading={debtLoading}
            />
          </motion.div>
          <motion.div variants={rowVariants} custom={1}>
            <SimpleStatCard
              icon={ActivityIcon}
              label={tAdmin("retention.remindersSent")}
              value={formatNumber(debtAging?.remindersSent ?? 0)}
              loading={debtLoading}
            />
          </motion.div>
          <motion.div variants={rowVariants} custom={2}>
            <SimpleStatCard
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

// ─── Tab: Emails ──────────────────────────────────────────────────────

function EmailsTab({ enabled }: { enabled: boolean }) {
  const { tAdmin } = useAdminTranslation();

  const { data: emailStats, isLoading: statsLoading } = useEmailStats(enabled);
  const { data: sentEmails, isLoading: emailsLoading } = useSentEmails(enabled);

  const statItems = useMemo(() => [0, 1, 2], []);
  const { containerVariants, rowVariants, animationKey } = useStaggerAnimation(statItems);

  return (
    <div className="space-y-6">
      {/* ── Email Stat Cards ─────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={animationKey}
      >
        <motion.div variants={rowVariants} custom={0}>
          <SimpleStatCard
            icon={MailIcon}
            label={tAdmin("marketing.emailsSent")}
            value={formatNumber(emailStats?.totalSent ?? 0)}
            loading={statsLoading}
          />
        </motion.div>
        <motion.div variants={rowVariants} custom={1}>
          <SimpleStatCard
            icon={ActivityIcon}
            label={tAdmin("marketing.emailsSentRecently")}
            value={formatNumber(emailStats?.sentLast7Days ?? 0)}
            loading={statsLoading}
          />
        </motion.div>
        <motion.div variants={rowVariants} custom={2}>
          <SimpleStatCard
            icon={RepeatIcon}
            label={tAdmin("marketing.emailsPending")}
            value={formatNumber(emailStats?.pending ?? 0)}
            loading={statsLoading}
          />
        </motion.div>
      </motion.div>

      {/* ── Sent Emails Table ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{tAdmin("marketing.recentEmailsTitle")}</CardTitle>
          <CardDescription>Last 50 sent emails</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {emailsLoading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-6 py-3">
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : !sentEmails?.length ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              {tAdmin("marketing.noEmailsSent")}
            </p>
          ) : (
            <div className="divide-y">
              {/* Header row */}
              <div className="flex items-center gap-3 px-6 py-2 text-xs font-medium text-muted-foreground">
                <div className="h-8 w-8 shrink-0" />
                <div className="flex-1">{tAdmin("marketing.recipient")}</div>
                <div className="w-36 text-left">{tAdmin("marketing.notificationType")}</div>
                <div className="w-36 text-right">{tAdmin("marketing.sentAt")}</div>
              </div>
              {sentEmails.map((email, index) => {
                const initials = (email.full_name ?? email.user_id).charAt(0).toUpperCase();
                const sentDate = new Date(email.email_sent_at).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });
                return (
                  <motion.div
                    key={email.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    className="flex items-center gap-3 px-6 py-3"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      {email.avatar_url && (
                        <AvatarImage src={email.avatar_url} alt={email.full_name ?? email.user_id} />
                      )}
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">
                        {email.full_name ?? email.user_id}
                      </p>
                    </div>
                    <div className="w-36">
                      <Badge variant="secondary" className="text-xs">
                        {email.type}
                      </Badge>
                    </div>
                    <div className="w-36 text-right tabular-nums text-sm text-muted-foreground">
                      {sentDate}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Experiments ─────────────────────────────────────────────────

function ExperimentsTab({ enabled }: { enabled: boolean }) {
  const { tAdmin } = useAdminTranslation();

  const { data: experiments, isLoading: experimentsLoading } = useExperiments(enabled);
  const { data: assignments, isLoading: assignmentsLoading } = useExperimentAssignments(enabled);

  const assignmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of assignments ?? []) {
      counts[a.experiment_key] = (counts[a.experiment_key] ?? 0) + 1;
    }
    return counts;
  }, [assignments]);

  const isLoading = experimentsLoading || assignmentsLoading;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tAdmin("marketing.experimentsTitle")}</CardTitle>
          <CardDescription>{tAdmin("marketing.experimentsSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingBeam className="py-8" />
          ) : !experiments?.length ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              {tAdmin("marketing.noExperiments")}
            </p>
          ) : (
            <div className="divide-y">
              <div className="flex items-center gap-3 px-6 py-2 text-xs font-medium text-muted-foreground">
                <div className="flex-1">{tAdmin("marketing.experimentKey")}</div>
                <div className="flex-1">{tAdmin("marketing.experimentDescription")}</div>
                <div className="w-36">{tAdmin("marketing.experimentVariants")}</div>
                <div className="w-20 text-center">{tAdmin("marketing.experimentActive")}</div>
                <div className="w-24 text-right">{tAdmin("marketing.experimentAssignments")}</div>
              </div>
              {experiments.map((exp, index) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.2 }}
                  className="flex items-center gap-3 px-6 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium truncate">{exp.key}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground truncate">
                      {exp.description ?? "—"}
                    </p>
                  </div>
                  <div className="w-36 flex flex-wrap gap-1">
                    {(Array.isArray(exp.variants) ? exp.variants : []).map((v) => (
                      <Badge key={v} variant="secondary" className="text-xs">
                        {v}
                      </Badge>
                    ))}
                  </div>
                  <div className="w-20 text-center">
                    <Badge variant={exp.is_active ? "default" : "outline"} className="text-xs">
                      {exp.is_active
                        ? tAdmin("status.active")
                        : tAdmin("status.inactive")}
                    </Badge>
                  </div>
                  <div className="w-24 text-right tabular-nums text-sm">
                    {formatNumber(assignmentCounts[exp.key] ?? 0)}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── AdminMarketing Page ──────────────────────────────────────────────

export function AdminMarketing() {
  const { tAdmin, locale } = useAdminTranslation();
  const { canViewGrowth } = useAdminAccess();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") ?? "growth";

  function handleTabChange(value: string) {
    setSearchParams({ tab: value });
  }

  if (!canViewGrowth) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">{tAdmin("common.accessDenied")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
        <p className="text-sm text-muted-foreground mt-1">{tAdmin("marketing.subtitle")}</p>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="growth">{tAdmin("marketing.tabGrowth")}</TabsTrigger>
          <TabsTrigger value="retention">{tAdmin("marketing.tabRetention")}</TabsTrigger>
          <TabsTrigger value="emails">{tAdmin("marketing.tabEmails")}</TabsTrigger>
          <TabsTrigger value="experiments">{tAdmin("marketing.tabExperiments")}</TabsTrigger>
        </TabsList>

        <TabsContent value="growth" className="mt-6">
          <GrowthTab enabled={canViewGrowth && activeTab === "growth"} locale={locale} />
        </TabsContent>

        <TabsContent value="retention" className="mt-6">
          <RetentionTab enabled={canViewGrowth && activeTab === "retention"} />
        </TabsContent>

        <TabsContent value="emails" className="mt-6">
          <EmailsTab enabled={canViewGrowth && activeTab === "emails"} />
        </TabsContent>

        <TabsContent value="experiments" className="mt-6">
          <ExperimentsTab enabled={canViewGrowth && activeTab === "experiments"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
