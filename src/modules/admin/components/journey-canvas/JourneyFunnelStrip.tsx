import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2Icon, TrendingUpIcon } from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import type { UserTrackingEventRow } from "../../types";
import { computeJourneyFunnelStages } from "./journey-funnel";

interface JourneyFunnelStripProps {
  events: UserTrackingEventRow[] | undefined;
  loading?: boolean;
}

export function JourneyFunnelStrip({ events, loading }: JourneyFunnelStripProps) {
  const { tAdmin } = useAdminTranslation();

  const stages = useMemo(
    () => computeJourneyFunnelStages(events ?? []),
    [events],
  );

  const maxCount = useMemo(
    () => Math.max(1, ...stages.map((stage) => stage.count)),
    [stages],
  );

  if (loading) {
    return (
      <Card data-slot="journey-funnel" aria-busy="true">
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {tAdmin("journey.funnel.loading")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-slot="journey-funnel" role="region" aria-label={tAdmin("journey.funnel.title")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUpIcon className="h-4 w-4" aria-hidden="true" />
          {tAdmin("journey.funnel.title")}
        </CardTitle>
        <CardDescription>{tAdmin("journey.funnel.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          role="list"
          aria-label={tAdmin("journey.funnel.title")}
        >
          {stages.map((stage, index) => {
            const widthPct = Math.round((stage.count / maxCount) * 100);
            return (
              <li
                key={stage.key}
                data-slot="journey-funnel-stage"
                data-stage={stage.key}
                className="rounded-lg border bg-card/60 p-3"
                aria-current={stage.reached ? "step" : undefined}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {index + 1}. {tAdmin(stage.labelKey)}
                  </span>
                  <Badge variant={stage.reached ? "default" : "outline"} className="tabular-nums">
                    {stage.count}
                  </Badge>
                </div>
                <Progress
                  value={stage.reached ? Math.max(widthPct, 8) : 0}
                  className="h-1.5"
                  aria-label={tAdmin("journey.funnel.stageCount", { count: stage.count })}
                />
                {stage.conversionFromPrior !== null ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {tAdmin("journey.funnel.conversion", { rate: stage.conversionFromPrior })}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
