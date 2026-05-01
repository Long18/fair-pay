import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ActivityIcon,
  Loader2Icon,
  PieChartIcon,
  ShareIcon,
  UserPlusIcon,
} from "@/components/ui/icons";
import type { UtmMetricRow, UtmPerformanceResponse } from "../types";

function toDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toIsoStart(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : null;
}

function toIsoEnd(value: string) {
  return value ? new Date(`${value}T23:59:59`).toISOString() : null;
}

function optionalFilter(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: typeof ActivityIcon;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl">{value}</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function MetricList({ title, description, rows }: { title: string; description: string; rows: UtmMetricRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.name} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <span className="min-w-0 truncate text-sm font-medium">{row.name}</span>
                <Badge variant="secondary">{row.count}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No matching data.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminUtmAnalytics() {
  const [dateFrom, setDateFrom] = useState(() => {
    const value = new Date();
    value.setDate(value.getDate() - 30);
    return toDateInput(value);
  });
  const [dateTo, setDateTo] = useState(() => toDateInput(new Date()));
  const [source, setSource] = useState("");
  const [campaign, setCampaign] = useState("");
  const [medium, setMedium] = useState("");
  const [entityType, setEntityType] = useState("");
  const [userId, setUserId] = useState("");

  const filters = useMemo(() => ({
    fromIso: toIsoStart(dateFrom),
    toIso: toIsoEnd(dateTo),
    source: optionalFilter(source),
    campaign: optionalFilter(campaign),
    medium: optionalFilter(medium),
    entityType: optionalFilter(entityType),
    userId: optionalFilter(userId),
  }), [campaign, dateFrom, dateTo, entityType, medium, source, userId]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin", "utm-performance", filters],
    queryFn: async () => {
      const { data: response, error } = await supabaseClient.rpc("admin_get_utm_performance", {
        p_from: filters.fromIso,
        p_to: filters.toIso,
        p_source: filters.source,
        p_campaign: filters.campaign,
        p_medium: filters.medium,
        p_entity_type: filters.entityType,
        p_user_id: filters.userId,
      });
      if (error) throw error;
      return response as UtmPerformanceResponse;
    },
    staleTime: 30_000,
  });

  const topSource = data?.traffic_by_source?.[0]?.name ?? "direct";
  const topCampaign = data?.traffic_by_campaign?.[0]?.name ?? "none";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">UTM Analytics</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Inspect campaign attribution, share performance, signups, and first/last-touch conversion sources.
          </p>
        </div>

        <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Date range and optional UTM/entity/user filters.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <Input value={source} onChange={(event) => setSource(event.target.value)} placeholder="source" />
          <Input value={campaign} onChange={(event) => setCampaign(event.target.value)} placeholder="campaign" />
          <Input value={medium} onChange={(event) => setMedium(event.target.value)} placeholder="medium" />
          <Input value={entityType} onChange={(event) => setEntityType(event.target.value)} placeholder="entity type" />
          <Input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="user id" />
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            Loading UTM analytics...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Sessions"
              value={data?.total_sessions ?? 0}
              description={`Top source: ${topSource}`}
              icon={ActivityIcon}
            />
            <MetricCard
              label="Events"
              value={data?.total_events ?? 0}
              description="Events carrying attribution context"
              icon={PieChartIcon}
            />
            <MetricCard
              label="Shares"
              value={data?.total_shares ?? 0}
              description="Generated, copied, completed, and failed share events"
              icon={ShareIcon}
            />
            <MetricCard
              label="Campaign"
              value={topCampaign}
              description="Highest traffic campaign"
              icon={PieChartIcon}
            />
            <MetricCard
              label="Signups"
              value={data?.signup_by_source?.reduce((sum, row) => sum + row.count, 0) ?? 0}
              description="Auth register events by source"
              icon={UserPlusIcon}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <MetricList
              title="Traffic by source"
              description="Session starts grouped by UTM source or referrer fallback."
              rows={data?.traffic_by_source ?? []}
            />
            <MetricList
              title="Traffic by campaign"
              description="Session starts grouped by UTM campaign."
              rows={data?.traffic_by_campaign ?? []}
            />
            <MetricList
              title="Signup by source"
              description="Registration events grouped by last-touch source."
              rows={data?.signup_by_source ?? []}
            />
            <MetricList
              title="Invite accepted by campaign"
              description="Invite acceptance conversion events grouped by campaign."
              rows={data?.invite_accepted_by_campaign ?? []}
            />
            <MetricList
              title="Share count by content"
              description="Share events grouped by the exact UI entry point."
              rows={data?.share_count_by_content ?? []}
            />
            <MetricList
              title="Conversion by first-touch source"
              description="Authenticated attribution records grouped by original source."
              rows={data?.conversion_by_first_touch_source ?? []}
            />
            <MetricList
              title="Conversion by last-touch source"
              description="Authenticated attribution records grouped by most recent source."
              rows={data?.conversion_by_last_touch_source ?? []}
            />
          </div>
        </>
      )}
    </div>
  );
}
