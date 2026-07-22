import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingBeam } from "@/components/ui/loading-beam";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ActivityIcon, TrendingDownIcon, TrendingUpIcon } from "@/components/ui/icons";
import { ALLOWED_TRACKING_EVENT_NAMES } from "@/lib/journey-tracking/allowed-events";
import { formatNumber } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";
import { useTrackingHealth, useTrackingHealthTrend } from "./hooks";

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
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {deltaAbsolute > 0 ? "+" : ""}
      {formatNumber(deltaAbsolute)}
      {deltaPercent !== null ? ` (${deltaPercent > 0 ? "+" : ""}${deltaPercent}%)` : ""}
      <span className="text-muted-foreground">{tAdmin("marketing.trackingHealth.vsPrior24h")}</span>
    </Badge>
  );
}

export function TrackingHealthSection({ enabled }: { enabled: boolean }) {
  const { tAdmin } = useAdminTranslation();
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
    <Card data-slot="tracking-health" role="region" aria-label={tAdmin("marketing.trackingHealth.title")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ActivityIcon className="h-4 w-4" aria-hidden="true" />
          {tAdmin("marketing.trackingHealth.title")}
        </CardTitle>
        <CardDescription>{tAdmin("marketing.trackingHealth.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <LoadingBeam className="h-20" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground">{tAdmin("marketing.trackingHealth.loadError")}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="tabular-nums">
                {formatNumber(data?.total_events ?? 0)} {tAdmin("marketing.trackingHealth.events")}
              </Badge>
              <Badge variant="outline" className="tabular-nums">
                {formatNumber(data?.distinct_events ?? 0)} {tAdmin("marketing.trackingHealth.distinctNames")}
              </Badge>
              {trend && !trendLoading ? (
                <DeltaBadge
                  deltaAbsolute={trend.delta_absolute}
                  deltaPercent={trend.delta_percent}
                />
              ) : null}
            </div>

            {trend && trend.hourly.length > 0 ? (
              <div className="space-y-2" data-slot="tracking-health-trend">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tAdmin("marketing.trackingHealth.trendTitle")}
                </p>
                <ChartContainer config={chartConfig} className="aspect-[3/1] h-[120px] w-full">
                  <AreaChart data={trend.hourly} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis hide domain={[0, "auto"]} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="line" />}
                    />
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
                <p className="text-xs text-muted-foreground">
                  {tAdmin("marketing.trackingHealth.priorPeriod", {
                    count: trend.prior_total_events,
                  })}
                </p>
              </div>
            ) : trendLoading ? (
              <LoadingBeam className="h-[120px]" />
            ) : null}

            {topEvents.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tAdmin("marketing.trackingHealth.topEvents")}
                </p>
                <ul className="space-y-1 text-sm" role="list">
                  {topEvents.map((row) => (
                    <li key={row.event_name} className="flex items-center justify-between gap-3">
                      <span className="truncate font-mono text-xs">{row.event_name}</span>
                      <span className="tabular-nums text-muted-foreground">{formatNumber(row.count)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{tAdmin("marketing.trackingHealth.noEvents")}</p>
            )}

            {silentAllowlist.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tAdmin("marketing.trackingHealth.silentAllowlist")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {silentAllowlist.map((name) => (
                    <Badge key={name} variant="outline" className="font-mono text-[10px]">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
