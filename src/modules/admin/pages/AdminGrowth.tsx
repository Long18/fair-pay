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
import { TrendingUpIcon, UsersIcon, ActivityIcon } from "@/components/ui/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAdminTranslation } from "../i18n";
import { useAdminAccess } from "../hooks/use-admin-access";
import { formatNumber } from "@/lib/locale-utils";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import { themeIntentTones } from "@/lib/theme-intents";

// ─── Types ───────────────────────────────────────────────────────────

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

// ─── Data Hooks ─────────────────────────────────────────────────────

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

      // Active referrers: unique referrer_ids that produced at least one signup
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

      // Group by date and platform
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
      // Get referral events grouped by referrer
      const { data: events, error: eventsError } = await supabaseClient
        .from("referral_events")
        .select("referrer_id, event_type");

      if (eventsError) throw eventsError;

      // Aggregate per referrer
      const referrerMap: Record<string, { invites: number; signups: number }> = {};
      for (const ev of events ?? []) {
        if (!referrerMap[ev.referrer_id]) {
          referrerMap[ev.referrer_id] = { invites: 0, signups: 0 };
        }
        if (ev.event_type === "click") referrerMap[ev.referrer_id].invites += 1;
        if (ev.event_type === "signup") referrerMap[ev.referrer_id].signups += 1;
      }

      // Sort by invites desc, take top 10
      const topIds = Object.entries(referrerMap)
        .sort(([, a], [, b]) => b.invites - a.invites)
        .slice(0, 10)
        .map(([id]) => id);

      if (!topIds.length) return [];

      // Fetch profiles for those users
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

// ─── Stat Card ───────────────────────────────────────────────────────

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

// ─── Share Chart Config ──────────────────────────────────────────────

const SHARE_CHART_CONFIG = {
  zalo: { label: "Zalo", color: "var(--chart-1)" },
  facebook: { label: "Facebook", color: "var(--chart-2)" },
  copy: { label: "Copy link", color: "var(--chart-3)" },
  download: { label: "Download", color: "var(--chart-4)" },
} satisfies ChartConfig;

// ─── AdminGrowth Page ────────────────────────────────────────────────

export function AdminGrowth() {
  const { tAdmin, locale } = useAdminTranslation();
  const { canViewGrowth } = useAdminAccess();

  const { data: referralStats, isLoading: referralLoading } = useReferralStats(canViewGrowth);
  const { data: shareData, isLoading: shareLoading } = useShareActivity(locale, canViewGrowth);
  const { data: topReferrers, isLoading: referrersLoading } = useTopReferrers(canViewGrowth);

  const { containerVariants, rowVariants, animationKey } = useStaggerAnimation([...FUNNEL_CARDS]);

  const shareChartConfig = useMemo(() => SHARE_CHART_CONFIG, []);

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
        <h1 className="text-2xl font-semibold tracking-tight">{tAdmin("growth.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{tAdmin("growth.subtitle")}</p>
      </div>

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
                {/* Header row */}
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
