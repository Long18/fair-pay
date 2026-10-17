import { useMemo } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { LoadingBeam } from "@/components/ui/loading-beam";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUpIcon,
  UsersIcon,
  ActivityIcon,
  StarIcon,
} from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import { formatNumber } from "@/lib/locale-utils";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import { AdminMetricCard } from "../../components/AdminMetricCard";
import type { ThemeIntent } from "@/lib/theme-intents";
import { ActivationFunnelSection } from "./activation-funnel-section";
import { TrackingHealthSection } from "./tracking-health-section";
import {
  ChartTableCard,
  PanelCard,
  PanelEmpty,
  STICKY_TABLE_CLASS,
} from "./panel-card";
import {
  useReferralStats,
  useShareActivity,
  useTopReferrers,
  useSubscriptionStats,
} from "./hooks";

const SHARE_CHANNELS = ["zalo", "facebook", "copy", "download"] as const;

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

const KPI_SLOTS = [0, 1, 2, 3, 4];

export function GrowthTab({ enabled, locale }: { enabled: boolean; locale: string }) {
  const { tAdmin } = useAdminTranslation();

  const { data: referralStats, isLoading: referralLoading } = useReferralStats(enabled);
  const { data: shareData, isLoading: shareLoading } = useShareActivity(locale, enabled);
  const { data: topReferrers, isLoading: referrersLoading } = useTopReferrers(enabled);
  const { data: subscriptionStats, isLoading: subscriptionLoading } = useSubscriptionStats(enabled);

  const { containerVariants, rowVariants, animationKey } = useStaggerAnimation(KPI_SLOTS);
  const shareChartConfig = useMemo(() => SHARE_CHART_CONFIG, []);
  const shareDescription = SHARE_CHANNELS.map((key) => SHARE_CHART_CONFIG[key].label).join(" · ");

  const shareChart = shareLoading ? (
    <LoadingBeam className="h-full" />
  ) : !shareData?.length ? (
    <PanelEmpty>{tAdmin("growth.noData")}</PanelEmpty>
  ) : (
    <ChartContainer config={shareChartConfig} className="aspect-auto h-full w-full">
      <RechartsBarChart data={shareData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} interval="preserveStartEnd" />
        <YAxis tickLine={false} axisLine={false} tickMargin={4} width={30} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="zalo" fill="var(--color-zalo)" radius={[3, 3, 0, 0]} stackId="share" />
        <Bar dataKey="facebook" fill="var(--color-facebook)" radius={[0, 0, 0, 0]} stackId="share" />
        <Bar dataKey="copy" fill="var(--color-copy)" radius={[0, 0, 0, 0]} stackId="share" />
        <Bar dataKey="download" fill="var(--color-download)" radius={[3, 3, 0, 0]} stackId="share" />
      </RechartsBarChart>
    </ChartContainer>
  );

  const shareTable = shareLoading ? (
    <LoadingBeam className="h-full" />
  ) : !shareData?.length ? (
    <PanelEmpty>{tAdmin("growth.noData")}</PanelEmpty>
  ) : (
    <ScrollArea className="h-full">
      <Table containerClassName="overflow-visible" className={STICKY_TABLE_CLASS}>
        <TableHeader>
          <TableRow>
            <TableHead className="h-8">{tAdmin("common.date")}</TableHead>
            {SHARE_CHANNELS.map((key) => (
              <TableHead key={key} className="h-8 text-right">
                {SHARE_CHART_CONFIG[key].label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...shareData].reverse().map((row) => (
            <TableRow key={row.date}>
              <TableCell className="py-1.5 tabular-nums">{row.label}</TableCell>
              {SHARE_CHANNELS.map((key) => (
                <TableCell key={key} className="py-1.5 text-right tabular-nums">
                  {formatNumber(row[key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  return (
    <div className="space-y-3">
      <motion.div
        className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={animationKey}
      >
        {FUNNEL_CARDS.map((card, index) => (
          <motion.div key={card.key} variants={rowVariants} custom={index}>
            <AdminMetricCard
              icon={card.icon}
              label={tAdmin(card.labelKey)}
              value={formatNumber(referralStats?.[card.key] ?? 0)}
              loading={referralLoading}
              variant="accent"
              intent={card.intent}
            />
          </motion.div>
        ))}
        <motion.div variants={rowVariants} custom={3}>
          <AdminMetricCard
            icon={UsersIcon}
            label={tAdmin("marketing.freeUsers")}
            value={formatNumber(subscriptionStats?.freeUsers ?? 0)}
            loading={subscriptionLoading}
          />
        </motion.div>
        <motion.div variants={rowVariants} custom={4}>
          <AdminMetricCard
            icon={StarIcon}
            label={tAdmin("marketing.proUsers")}
            value={formatNumber(subscriptionStats?.proUsers ?? 0)}
            loading={subscriptionLoading}
          />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartTableCard
          title={tAdmin("growth.shareActivity")}
          description={shareDescription}
          chart={shareChart}
          table={shareTable}
        />

        <PanelCard
          title={tAdmin("growth.topReferrers")}
          description={tAdmin("layout.insights.marketing.topReferrersDescription")}
          contentClassName="px-0"
        >
          <div className="flex items-center gap-2.5 border-b px-4 pb-1.5 text-[11px] font-medium text-muted-foreground">
            <div className="w-7 shrink-0" />
            <div className="flex-1">{tAdmin("common.user")}</div>
            <div className="w-16 text-right">{tAdmin("growth.inviteCount")}</div>
            <div className="w-16 text-right">{tAdmin("growth.signupCount")}</div>
          </div>
          <ScrollArea className="h-[204px]">
            {referrersLoading ? (
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-4 py-2">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-muted animate-pulse" />
                    <div className="h-3 w-32 flex-1 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-12 rounded bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
            ) : !topReferrers?.length ? (
              <PanelEmpty className="h-[200px]">{tAdmin("growth.noData")}</PanelEmpty>
            ) : (
              <div className="divide-y">
                {topReferrers.map((referrer, index) => {
                  const initials = (referrer.full_name ?? referrer.user_id).charAt(0).toUpperCase();
                  return (
                    <motion.div
                      key={referrer.user_id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.2 }}
                      className="flex items-center gap-2.5 px-4 py-1.5"
                    >
                      <Avatar className="h-7 w-7 shrink-0">
                        {referrer.avatar_url && (
                          <AvatarImage src={referrer.avatar_url} alt={referrer.full_name ?? referrer.user_id} />
                        )}
                        <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
                      </Avatar>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">
                        {referrer.full_name ?? referrer.user_id}
                      </p>
                      <div className="w-16 text-right text-sm tabular-nums">
                        {formatNumber(referrer.invite_count)}
                      </div>
                      <div className="w-16 text-right text-sm tabular-nums text-muted-foreground">
                        {formatNumber(referrer.signup_count)}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </PanelCard>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ActivationFunnelSection enabled={enabled} />
        <TrackingHealthSection enabled={enabled} />
      </div>
    </div>
  );
}
