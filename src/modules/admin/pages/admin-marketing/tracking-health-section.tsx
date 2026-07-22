import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingBeam } from "@/components/ui/loading-beam";
import { ActivityIcon } from "@/components/ui/icons";
import { ALLOWED_TRACKING_EVENT_NAMES } from "@/lib/journey-tracking/allowed-events";
import { formatNumber } from "@/lib/locale-utils";
import { useTrackingHealth } from "./hooks";

export function TrackingHealthSection({ enabled }: { enabled: boolean }) {
  const { data, isLoading, isError } = useTrackingHealth(enabled);

  const firedSet = useMemo(
    () => new Set((data?.events ?? []).map((row) => row.event_name)),
    [data?.events],
  );

  const silentAllowlist = useMemo(
    () => ALLOWED_TRACKING_EVENT_NAMES.filter((name) => !firedSet.has(name)).slice(0, 12),
    [firedSet],
  );

  const topEvents = useMemo(() => (data?.events ?? []).slice(0, 8), [data?.events]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ActivityIcon className="h-4 w-4" />
          Tracking health (24h)
        </CardTitle>
        <CardDescription>
          Pipeline volume from user_tracking_events. Silent allowlist entries may need instrumentation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <LoadingBeam className="h-20" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground">Unable to load tracking health.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {formatNumber(data?.total_events ?? 0)} events
              </Badge>
              <Badge variant="outline">
                {formatNumber(data?.distinct_events ?? 0)} distinct names
              </Badge>
            </div>

            {topEvents.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Top events
                </p>
                <ul className="space-y-1 text-sm">
                  {topEvents.map((row) => (
                    <li key={row.event_name} className="flex items-center justify-between gap-3">
                      <span className="truncate font-mono text-xs">{row.event_name}</span>
                      <span className="tabular-nums text-muted-foreground">{formatNumber(row.count)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No events recorded in the last 24 hours.</p>
            )}

            {silentAllowlist.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Allowlist — no fires yet (sample)
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
