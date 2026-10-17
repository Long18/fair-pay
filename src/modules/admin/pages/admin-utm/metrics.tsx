import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ActivityIcon,
  ExternalLinkIcon,
  LinkIcon,
  ShareIcon,
  UserPlusIcon,
  ZapIcon,
} from "@/components/ui/icons";
import { AdminEmptyState } from "../../components/AdminEmptyState";
import { AdminMetricCard } from "../../components/AdminMetricCard";
import { AdminTableScroll } from "../../components/AdminTableScroll";
import { useAdminTranslation } from "../../i18n";
import type {
  UtmMetricRow,
  UtmPerformanceResponse,
  UtmRecentShareRow,
} from "../../types";
import {
  formatDateTime,
  compactUrlForDisplay,
  eventBadgeVariant,
} from "./helpers";

export function MetricTable({ title, description, rows }: { title: string; description: string; rows: UtmMetricRow[] }) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
  return (
    <Card className="min-w-0 gap-2 py-3">
      <CardHeader className="gap-0.5 px-4">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <CardDescription className="line-clamp-1 text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        {rows.length ? (
          <AdminTableScroll offset="25rem" className="min-h-0">
            <Table containerClassName="overflow-visible">
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 text-xs">Name</TableHead>
                  <TableHead className="h-8 w-20 text-right text-xs">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.name} className="transition-colors hover:bg-muted/40">
                    <TableCell className="py-1.5">
                      <div className="space-y-1">
                        <p className="max-w-[260px] truncate font-mono text-xs" title={row.name}>
                          {row.name}
                        </p>
                        {max > 0 ? (
                          <div className="h-1 w-full rounded-full bg-muted">
                            <div
                              className="h-1 rounded-full bg-primary/60 transition-all"
                              style={{ width: `${Math.round((row.count / max) * 100)}%` }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 text-right text-xs font-medium tabular-nums">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminTableScroll>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-5 text-center">
            <ActivityIcon className="h-4 w-4 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">No data for current filters</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MetricsTab({ data, isLoading }: { data: UtmPerformanceResponse | undefined; isLoading: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const topCampaign = data?.traffic_by_campaign?.[0]?.name ?? "none";
  const totalSignups = data?.signup_by_source?.reduce((sum, row) => sum + row.count, 0) ?? 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <AdminMetricCard variant="compact" loading={isLoading} label="Sessions" value={data?.total_sessions ?? 0} icon={ActivityIcon} />
        <AdminMetricCard variant="compact" loading={isLoading} label="Events" value={data?.total_events ?? 0} icon={ZapIcon} />
        <AdminMetricCard variant="compact" loading={isLoading} label="Shares" value={data?.total_shares ?? 0} icon={ShareIcon} />
        <AdminMetricCard
          variant="compact"
          loading={isLoading}
          label="Top campaign"
          value={
            <Badge variant="secondary" className="max-w-full truncate font-mono text-xs" title={String(topCampaign)}>
              {topCampaign}
            </Badge>
          }
          icon={LinkIcon}
        />
        <AdminMetricCard variant="compact" loading={isLoading} label="Signups" value={totalSignups} icon={UserPlusIcon} />
      </div>

      {isLoading ? (
        <div className="grid gap-3 xl:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : (
        <Tabs defaultValue="traffic" className="gap-3">
          <TabsList className="h-8 max-w-full justify-start overflow-x-auto scrollbar-none">
            <TabsTrigger value="traffic" className="flex-none px-3 text-xs">{tAdmin("layout.devtoolTools.utm.tabTraffic")}</TabsTrigger>
            <TabsTrigger value="content" className="flex-none px-3 text-xs">{tAdmin("layout.devtoolTools.utm.tabContent")}</TabsTrigger>
            <TabsTrigger value="signups" className="flex-none px-3 text-xs">{tAdmin("layout.devtoolTools.utm.tabSignups")}</TabsTrigger>
            <TabsTrigger value="conversion" className="flex-none px-3 text-xs">{tAdmin("layout.devtoolTools.utm.tabConversion")}</TabsTrigger>
          </TabsList>
          <TabsContent value="traffic" className="grid gap-3 xl:grid-cols-2">
            <MetricTable title="Traffic by source" description="Sessions grouped by decoded source or referrer fallback." rows={data?.traffic_by_source ?? []} />
            <MetricTable title="Traffic by campaign" description="Sessions grouped by decoded campaign." rows={data?.traffic_by_campaign ?? []} />
          </TabsContent>
          <TabsContent value="content" className="grid gap-3 xl:grid-cols-2">
            <MetricTable title="Destination pages" description="Shared destinations without attribution noise." rows={data?.destination_pages ?? []} />
            <MetricTable title="Share count by entry point" description="Share events grouped by UI entry point." rows={data?.share_count_by_content ?? []} />
          </TabsContent>
          <TabsContent value="signups" className="grid gap-3 xl:grid-cols-2">
            <MetricTable title="Signup by source" description="Registration events grouped by last-touch source." rows={data?.signup_by_source ?? []} />
            <MetricTable title="Invite accepted by campaign" description="Invite acceptance events grouped by campaign." rows={data?.invite_accepted_by_campaign ?? []} />
          </TabsContent>
          <TabsContent value="conversion" className="grid gap-3 xl:grid-cols-2">
            <MetricTable title="Conversion — first-touch" description="Authenticated attribution by original source." rows={data?.conversion_by_first_touch_source ?? []} />
            <MetricTable title="Conversion — last-touch" description="Authenticated attribution by most recent source." rows={data?.conversion_by_last_touch_source ?? []} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export function RecentSharesTab({ rows }: { rows: UtmRecentShareRow[] }) {
  if (!rows.length) {
    return (
      <AdminEmptyState
        icon={<ShareIcon className="h-5 w-5" />}
        title="No share events for the current filters."
        description="Adjust the date range or clear dimension filters."
        className="rounded-lg border border-dashed py-6"
      />
    );
  }

  return (
    <AdminTableScroll offset="15rem">
      <Table containerClassName="overflow-visible">
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 text-xs">Event</TableHead>
            <TableHead className="h-9 text-xs">Destination</TableHead>
            <TableHead className="h-9 text-xs">Source</TableHead>
            <TableHead className="h-9 text-xs">Campaign</TableHead>
            <TableHead className="h-9 text-xs">When</TableHead>
            <TableHead className="h-9 w-24 text-right text-xs">Journey</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const displayPath = compactUrlForDisplay(row);
            return (
              <TableRow
                key={`${row.session_id}-${row.event_name}-${row.occurred_at}-${index}`}
                className="transition-colors hover:bg-muted/30"
              >
                <TableCell className="py-2">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={eventBadgeVariant(row.event_name)} className="text-xs">
                      {row.event_name}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {row.share_method ?? "unknown"}
                    </Badge>
                    {row.share_platform ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        {row.share_platform}
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="max-w-[280px] break-all py-2 font-mono text-xs text-muted-foreground">
                  {displayPath}
                </TableCell>
                <TableCell className="py-2 text-xs">{row.utm_source ?? "-"}</TableCell>
                <TableCell className="py-2 font-mono text-xs">{row.utm_campaign ?? "-"}</TableCell>
                <TableCell className="whitespace-nowrap py-2 text-xs text-muted-foreground">
                  {formatDateTime(row.occurred_at)}
                </TableCell>
                <TableCell className="py-2 text-right">
                  {row.user_id ? (
                    <Button asChild type="button" variant="outline" size="sm" className="h-7 cursor-pointer px-2 text-xs transition-colors">
                      <Link
                        to={`/admin/people/${row.user_id}/journey?session=${row.session_id ?? "all"}&source=${row.utm_source ?? ""}&campaign=${row.utm_campaign ?? ""}`}
                      >
                        <ExternalLinkIcon className="mr-1.5 h-3 w-3" />
                        Open
                      </Link>
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-xs">anonymous</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </AdminTableScroll>
  );
}
