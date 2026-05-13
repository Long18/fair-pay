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
import { useAdminTranslation } from "../i18n";

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
  const { tAdmin } = useAdminTranslation();
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
          <p className="text-sm text-muted-foreground">{tAdmin("utm.noMatchingData")}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminUtmAnalytics() {
  const { tAdmin } = useAdminTranslation();
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
            <h1 className="text-2xl font-semibold tracking-tight">{tAdmin("utm.analyticsTitle")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {tAdmin("utm.analyticsDescription")}
          </p>
        </div>

        <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
          {tAdmin("utm.refresh")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{tAdmin("utm.filtersTitle")}</CardTitle>
          <CardDescription>{tAdmin("utm.filtersDescription")}</CardDescription>
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
            {tAdmin("utm.loadingAnalytics")}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label={tAdmin("utm.sessions")}
              value={data?.total_sessions ?? 0}
              description={tAdmin("utm.topSource", { source: topSource })}
              icon={ActivityIcon}
            />
            <MetricCard
              label={tAdmin("utm.events")}
              value={data?.total_events ?? 0}
              description={tAdmin("utm.eventsDescription")}
              icon={PieChartIcon}
            />
            <MetricCard
              label={tAdmin("utm.shares")}
              value={data?.total_shares ?? 0}
              description={tAdmin("utm.sharesDescription")}
              icon={ShareIcon}
            />
            <MetricCard
              label={tAdmin("utm.campaign")}
              value={topCampaign}
              description={tAdmin("utm.topCampaign")}
              icon={PieChartIcon}
            />
            <MetricCard
              label={tAdmin("utm.signups")}
              value={data?.signup_by_source?.reduce((sum, row) => sum + row.count, 0) ?? 0}
              description={tAdmin("utm.signupsDescription")}
              icon={UserPlusIcon}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <MetricList
              title={tAdmin("utm.trafficBySource")}
              description={tAdmin("utm.trafficBySourceDescription")}
              rows={data?.traffic_by_source ?? []}
            />
            <MetricList
              title={tAdmin("utm.trafficByCampaign")}
              description={tAdmin("utm.trafficByCampaignDescription")}
              rows={data?.traffic_by_campaign ?? []}
            />
            <MetricList
              title={tAdmin("utm.signupBySource")}
              description={tAdmin("utm.signupBySourceDescription")}
              rows={data?.signup_by_source ?? []}
            />
            <MetricList
              title={tAdmin("utm.inviteAcceptedByCampaign")}
              description={tAdmin("utm.inviteAcceptedByCampaignDescription")}
              rows={data?.invite_accepted_by_campaign ?? []}
            />
            <MetricList
              title={tAdmin("utm.shareCountByContent")}
              description={tAdmin("utm.shareCountByContentDescription")}
              rows={data?.share_count_by_content ?? []}
            />
            <MetricList
              title={tAdmin("utm.conversionFirstTouch")}
              description={tAdmin("utm.conversionFirstTouchDescription")}
              rows={data?.conversion_by_first_touch_source ?? []}
            />
            <MetricList
              title={tAdmin("utm.conversionLastTouch")}
              description={tAdmin("utm.conversionLastTouchDescription")}
              rows={data?.conversion_by_last_touch_source ?? []}
            />
          </div>
        </>
      )}
    </div>
  );
}
