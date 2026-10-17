import { useMemo, useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  UsersIcon,
  ActivityIcon,
  RepeatIcon,
} from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import { formatNumber } from "@/lib/locale-utils";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import { AdminMetricCard } from "../../components/AdminMetricCard";
import { ActivationFunnelSteps } from "./activation-funnel-section";
import {
  ChartTableCard,
  PANEL_BODY_HEIGHT,
  PanelCard,
  PanelEmpty,
  STICKY_TABLE_CLASS,
} from "./panel-card";
import {
  useOnboardingFunnel,
  useStreakDistribution,
  useDebtAging,
} from "./hooks";

type FunnelView = "onboarding" | "activation";
type OnboardingFunnelData = ReturnType<typeof useOnboardingFunnel>["data"];

function completionPercent(funnel: OnboardingFunnelData): number | null {
  return funnel && funnel.total > 0 ? Math.round((funnel.completedCount / funnel.total) * 100) : null;
}

function OnboardingSteps({ funnel, loading }: { funnel: OnboardingFunnelData; loading: boolean }) {
  const { tAdmin } = useAdminTranslation();
  if (loading) return <LoadingBeam className="h-full" />;
  if (!funnel?.steps.length) return <PanelEmpty>{tAdmin("retention.noData")}</PanelEmpty>;
  return (
    <ScrollArea className="h-full pr-2">
      <div className="flex flex-col gap-3 py-1">
        {funnel.steps.map((step) => (
          <div key={step.key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{tAdmin(step.labelKey)}</span>
              <span className="tabular-nums text-muted-foreground">
                {formatNumber(step.count)} / {formatNumber(step.total)}
                <span className="ml-2 font-semibold text-foreground">{step.pct}%</span>
              </span>
            </div>
            <Progress value={step.pct} className="h-1.5" />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function FunnelsCard({
  enabled,
  funnel,
  loading,
}: {
  enabled: boolean;
  funnel: OnboardingFunnelData;
  loading: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [view, setView] = useState<FunnelView>("onboarding");
  const pct = completionPercent(funnel);
  const onboardingDescription =
    funnel && pct !== null
      ? `${tAdmin("retention.completionRate")}: ${pct}% (${formatNumber(funnel.completedCount)} / ${formatNumber(funnel.total)})`
      : tAdmin("retention.noData");

  return (
    <PanelCard
      title={view === "onboarding" ? tAdmin("retention.onboardingFunnel") : tAdmin("retention.activationFunnel")}
      description={view === "onboarding" ? onboardingDescription : undefined}
      action={
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={view}
          onValueChange={(v) => v && setView(v as FunnelView)}
          aria-label={tAdmin("layout.insights.marketing.funnelSwitch")}
        >
          <ToggleGroupItem value="onboarding" className="h-7 px-2 text-xs">
            {tAdmin("layout.insights.marketing.funnelOnboarding")}
          </ToggleGroupItem>
          <ToggleGroupItem value="activation" className="h-7 px-2 text-xs">
            {tAdmin("layout.insights.marketing.funnelActivation")}
          </ToggleGroupItem>
        </ToggleGroup>
      }
    >
      <div className={PANEL_BODY_HEIGHT}>
        {view === "activation" ? (
          <ActivationFunnelSteps enabled={enabled} />
        ) : (
          <OnboardingSteps funnel={funnel} loading={loading} />
        )}
      </div>
    </PanelCard>
  );
}

function StreakCard({ enabled }: { enabled: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const { data: streaks, isLoading } = useStreakDistribution(enabled);

  const chartConfig = useMemo(
    () =>
      ({
        users: {
          label: tAdmin("retention.users"),
          color: "var(--chart-2)",
        },
      }) satisfies ChartConfig,
    [tAdmin],
  );

  const placeholder = isLoading ? (
    <LoadingBeam className="h-full" />
  ) : !streaks?.length ? (
    <PanelEmpty>{tAdmin("retention.noData")}</PanelEmpty>
  ) : null;

  return (
    <ChartTableCard
      title={tAdmin("retention.streakDistribution")}
      description={tAdmin("retention.users")}
      chart={
        placeholder ?? (
          <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
            <RechartsBarChart data={streaks} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} />
              <YAxis tickLine={false} axisLine={false} tickMargin={4} width={36} allowDecimals={false} />
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
              <Bar dataKey="users" fill="var(--color-users)" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ChartContainer>
        )
      }
      table={
        placeholder ?? (
          <ScrollArea className="h-full">
            <Table containerClassName="overflow-visible" className={STICKY_TABLE_CLASS}>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8">{tAdmin("retention.streakDistribution")}</TableHead>
                  <TableHead className="h-8 text-right">{tAdmin("retention.users")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(streaks ?? []).map((row) => (
                  <TableRow key={row.bucket}>
                    <TableCell className="py-1.5">{row.label}</TableCell>
                    <TableCell className="py-1.5 text-right tabular-nums">{formatNumber(row.users)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )
      }
    />
  );
}

export function RetentionTab({ enabled }: { enabled: boolean }) {
  const { tAdmin } = useAdminTranslation();

  const { data: funnel, isLoading: funnelLoading } = useOnboardingFunnel(enabled);
  const { data: debtAging, isLoading: debtLoading } = useDebtAging(enabled);

  const statItems = useMemo(() => [0, 1, 2], []);
  const { containerVariants, rowVariants, animationKey } = useStaggerAnimation(statItems);
  const pct = completionPercent(funnel);

  return (
    <div className="space-y-3">
      <motion.div
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={animationKey}
        aria-label={tAdmin("retention.debtAging")}
      >
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
            value={pct !== null ? `${pct}%` : "—"}
            loading={funnelLoading}
          />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <FunnelsCard enabled={enabled} funnel={funnel} loading={funnelLoading} />
        <StreakCard enabled={enabled} />
      </div>
    </div>
  );
}
