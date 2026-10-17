import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { LoadingBeam } from "@/components/ui/loading-beam";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ActivityIcon, TrendingDownIcon, TrendingUpIcon } from "@/components/ui/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ALLOWED_TRACKING_EVENT_NAMES } from "@/lib/journey-tracking/allowed-events";
import { formatNumber } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";
import { useTrackingHealth, useTrackingHealthTrend } from "./hooks";
import { PANEL_BODY_HEIGHT, PanelCard, PanelEmpty } from "./panel-card";

type TrackingView = "trend" | "top" | "silent";

function DeltaBadge({
  deltaAbsolute,
  deltaPercent,
}: {
  deltaAbsolute: number;
  deltaPercent: number | null;
}) {
  const { tAdmin } = useAdminTranslation();
  const isUp = deltaAbsolute > 0;
  const isDown = deltaAbsolute < 0;
  const Icon = isUp ? TrendingUpIcon : isDown ? TrendingDownIcon : ActivityIcon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 tabular-nums",
        isUp && "border-status-success-border text-semantic-positive",
        isDown && "border-status-warning-border text-status-warning",
      )}
      aria-label={tAdmin("marketing.trackingHealth.vsPrior24h")}
      title={tAdmin("marketing.trackingHealth.vsPrior24h")}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {deltaAbsolute > 0 ? "+" : ""}
      {formatNumber(deltaAbsolute)}
      {deltaPercent !== null ? ` (${deltaPercent > 0 ? "+" : ""}${deltaPercent}%)` : ""}
    </Badge>
  );
}

export function TrackingHealthSection({ enabled, className }: { enabled: boolean; className?: string }) {
  const { tAdmin } = useAdminTranslation();
  const [view, setView] = useState<TrackingView>("trend");
  const { data, isLoading, isError } = useTrackingHealth(enabled);
  const { data: trend, isLoading: trendLoading } = useTrackingHealthTrend(enabled);

  const firedSet = useMemo(
    () => new Set((data?.events ?? []).map((row) => row.event_name)),
    [data?.events],
  );

  const silentAllowlist = useMemo(
    () => ALLOWED_TRACKING_EVENT_NAMES.filter((name) => !firedSet.has(name)).slice(0, 12),
    [firedSet],
  );

  const topEvents = useMemo(() => (data?.events ?? []).slice(0, 8), [data?.events]);

  const chartConfig = useMemo(
    () =>
      ({
        count: {
          label: tAdmin("marketing.trackingHealth.events"),
          color: "var(--chart-1)",
        },
      }) satisfies ChartConfig,
    [tAdmin],
  );

  return (
    <PanelCard
      data-slot="tracking-health"
      role="region"
      aria-label={tAdmin("marketing.trackingHealth.title")}
      className={className}
      title={tAdmin("marketing.trackingHealth.title")}
      description={tAdmin("marketing.trackingHealth.description")}
      action={
        trend && !trendLoading ? (
          <DeltaBadge deltaAbsolute={trend.delta_absolute} deltaPercent={trend.delta_percent} />
        ) : null
      }
    >
      <div className={PANEL_BODY_HEIGHT}>
        {isLoading ? (
          <LoadingBeam className="h-full" />
        ) : isError ? (
          <PanelEmpty>{tAdmin("marketing.trackingHealth.loadError")}</PanelEmpty>
        ) : (
          <Tabs value={view} onValueChange={(v) => setView(v as TrackingView)} className="h-full gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TabsList className="h-7">
                <TabsTrigger value="trend" className="px-2 text-xs">
                  {tAdmin("layout.insights.marketing.trackingTrendTab")}
                </TabsTrigger>
                <TabsTrigger value="top" className="px-2 text-xs">
                  {tAdmin("marketing.trackingHealth.topEvents")}
                </TabsTrigger>
                <TabsTrigger value="silent" className="px-2 text-xs">
                  {tAdmin("layout.insights.marketing.trackingSilentTab")}
                  {silentAllowlist.length > 0 ? (
                    <span className="tabular-nums text-muted-foreground">{silentAllowlist.length}</span>
                  ) : null}
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                <span>
                  <span className="font-semibold text-foreground">{formatNumber(data?.total_events ?? 0)}</span>{" "}
                  {tAdmin("marketing.trackingHealth.events")}
                </span>
                <span aria-hidden>·</span>
                <span>
                  <span className="font-semibold text-foreground">{formatNumber(data?.distinct_events ?? 0)}</span>{" "}
                  {tAdmin("marketing.trackingHealth.distinctNames")}
                </span>
              </div>
            </div>

            <TabsContent value="trend" className="min-h-0" data-slot="tracking-health-trend">
              {trend && trend.hourly.length > 0 ? (
                <div className="flex h-full flex-col gap-1">
                  <ChartContainer config={chartConfig} className="aspect-auto min-h-0 w-full flex-1">
                    <AreaChart data={trend.hourly} accessibilityLayer margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        interval="preserveStartEnd"
                        minTickGap={24}
                      />
                      <YAxis hide domain={[0, "auto"]} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                      <Area
                        dataKey="count"
                        type="monotone"
                        fill="var(--color-count)"
                        fillOpacity={0.25}
                        stroke="var(--color-count)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                  <p className="text-[11px] text-muted-foreground">
                    {tAdmin("marketing.trackingHealth.priorPeriod", { count: trend.prior_total_events })}
                  </p>
                </div>
              ) : trendLoading ? (
                <LoadingBeam className="h-full py-4" />
              ) : (
                <PanelEmpty>{tAdmin("marketing.trackingHealth.noEvents")}</PanelEmpty>
              )}
            </TabsContent>

            <TabsContent value="top" className="min-h-0">
              {topEvents.length > 0 ? (
                <ScrollArea className="h-full pr-2">
                  <ul className="space-y-1 text-sm" role="list">
                    {topEvents.map((row) => (
                      <li key={row.event_name} className="flex items-center justify-between gap-3">
                        <span className="truncate font-mono text-xs">{row.event_name}</span>
                        <span className="tabular-nums text-muted-foreground">{formatNumber(row.count)}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              ) : (
                <PanelEmpty>{tAdmin("marketing.trackingHealth.noEvents")}</PanelEmpty>
              )}
            </TabsContent>

            <TabsContent value="silent" className="min-h-0">
              {silentAllowlist.length > 0 ? (
                <ScrollArea className="h-full pr-2">
                  <p className="mb-1.5 text-[11px] text-muted-foreground">
                    {tAdmin("marketing.trackingHealth.silentAllowlist")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {silentAllowlist.map((name) => (
                      <Badge key={name} variant="outline" className="font-mono text-[10px]">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <PanelEmpty>{tAdmin("common.noData")}</PanelEmpty>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PanelCard>
  );
}
