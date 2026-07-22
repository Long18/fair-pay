import { useMemo } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingBeam } from "@/components/ui/loading-beam";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  TrendingUpIcon,
  UsersIcon,
  ActivityIcon,
} from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import { formatNumber } from "@/lib/locale-utils";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import { AdminMetricCard, AdminMetricGrid } from "../../components/AdminMetricCard";
import type { ThemeIntent } from "@/lib/theme-intents";
import { ActivationFunnelSection } from "./activation-funnel-section";
import { TrackingHealthSection } from "./tracking-health-section";
import {
  useReferralStats,
  useShareActivity,
  useTopReferrers,
  useSubscriptionStats,
} from "./hooks";

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

export function GrowthTab({ enabled, locale }: { enabled: boolean; locale: string }) {
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
      <TrackingHealthSection enabled={enabled} />

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
