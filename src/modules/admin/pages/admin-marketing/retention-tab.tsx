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
import { Progress } from "@/components/ui/progress";
import {
  UsersIcon,
  ActivityIcon,
  RepeatIcon,
} from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import { formatNumber } from "@/lib/locale-utils";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import { AdminMetricCard, AdminMetricGrid } from "../../components/AdminMetricCard";
import { ActivationFunnelSection } from "./activation-funnel-section";
import {
  useOnboardingFunnel,
  useStreakDistribution,
  useDebtAging,
} from "./hooks";

export function RetentionTab({ enabled }: { enabled: boolean }) {
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
