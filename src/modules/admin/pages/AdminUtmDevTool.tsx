import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
import { appendShareRef, getShareRefPropertiesFromUrl } from "@/lib/share-ref";
import { buildPlatformShareIntent } from "@/lib/share-tracking";
import { getCanonicalDestinationPath, getCanonicalDestinationUrl } from "@/lib/utm";
import {
  DEFAULT_UTM_SHARE_CONFIG,
  findUtmPlatform,
  findUtmTemplate,
  sortUtmPlatforms,
  type UtmPlatform,
  type UtmShareTemplate,
  type UtmShareConfig,
} from "@/lib/utm-config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminMetricCard, AdminMetricGrid } from "../components/AdminMetricCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ActivityIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
  LinkIcon,
  ListFilterIcon,
  Loader2Icon,
  RefreshCwIcon,
  ShareIcon,
  UserPlusIcon,
  ZapIcon,
} from "@/components/ui/icons";
import type {
  UtmMetricRow,
  UtmPerformanceResponse,
  UtmRecentShareRow,
} from "../types";

type FilterState = {
  dateFrom: string;
  dateTo: string;
  source: string;
  campaign: string;
  medium: string;
  entityType: string;
  userId: string;
};

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

function getInitialFilters(): FilterState {
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    dateFrom: toDateInput(from),
    dateTo: toDateInput(new Date()),
    source: "",
    campaign: "",
    medium: "",
    entityType: "",
    userId: "",
  };
}

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return dateTimeFormatter.format(new Date(value));
}

function compactUrlForDisplay(
  row: Pick<UtmRecentShareRow, "destination_path" | "destination_url" | "generated_url" | "generated_path">,
) {
  return getCanonicalDestinationPath(
    row.destination_path || row.destination_url || row.generated_url || row.generated_path || "/",
  );
}

function getSampleDestinationForTemplate(template: UtmShareTemplate | null | undefined) {
  switch (template?.entity_type) {
    case "expense":
      return "https://long-pay.vercel.app/share/expenses/demo-expense";
    case "debt":
      return "https://long-pay.vercel.app/share/debts/demo-token";
    case "friend":
      return "https://long-pay.vercel.app/share/friends/demo-friend";
    case "profile":
      return "https://long-pay.vercel.app/share/profiles/demo-profile";
    case "group":
      return "https://long-pay.vercel.app/share/groups/demo-group";
    default:
      return "https://long-pay.vercel.app/share/groups/demo-group";
  }
}

function getRefRows(properties: Record<string, string>) {
  return ["share_ref", "utm_source", "utm_medium", "utm_campaign", "utm_content"]
    .map((key) => ({ key, value: properties[key] }))
    .filter((row) => row.value);
}

function extractRefCode(url: string): { base: string; ref: string } | null {
  try {
    const u = new URL(url);
    const ref = u.searchParams.get("ref");
    if (!ref) return null;
    u.searchParams.delete("ref");
    return { base: u.toString(), ref };
  } catch {
    return null;
  }
}

function eventBadgeVariant(eventName: string): "default" | "secondary" | "destructive" | "outline" {
  if (eventName.includes("completed")) return "default";
  if (eventName.includes("copied")) return "secondary";
  if (eventName.includes("failed")) return "destructive";
  return "outline";
}

function MetricTable({ title, description, rows }: { title: string; description: string; rows: UtmMetricRow[] }) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="w-24 text-right text-xs">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.name} className="transition-colors hover:bg-muted/40">
                  <TableCell className="py-2">
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
                  <TableCell className="py-2 text-right tabular-nums text-xs font-medium">{row.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center">
            <ActivityIcon className="h-6 w-6 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No data for current filters</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FilterPanel({
  filters,
  setFilters,
  isFetching,
  onRefresh,
}: {
  filters: FilterState;
  setFilters: (next: FilterState) => void;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  const update = (key: keyof FilterState, value: string) => setFilters({ ...filters, [key]: value });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <ListFilterIcon className="h-4 w-4 text-muted-foreground" />
          <div>
            <CardTitle className="text-sm font-semibold">Filters</CardTitle>
            <CardDescription className="text-xs">Date range and optional dimension filters</CardDescription>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer transition-colors"
          onClick={onRefresh}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2Icon className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCwIcon className="mr-2 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
        <div className="space-y-1.5">
          <Label htmlFor="share-filter-from" className="text-xs">From</Label>
          <Input id="share-filter-from" type="date" className="h-8 text-xs" value={filters.dateFrom} onChange={(e) => update("dateFrom", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="share-filter-to" className="text-xs">To</Label>
          <Input id="share-filter-to" type="date" className="h-8 text-xs" value={filters.dateTo} onChange={(e) => update("dateTo", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="share-filter-source" className="text-xs">Source</Label>
          <Input id="share-filter-source" className="h-8 text-xs" value={filters.source} onChange={(e) => update("source", e.target.value)} placeholder="facebook" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="share-filter-campaign" className="text-xs">Campaign</Label>
          <Input id="share-filter-campaign" className="h-8 text-xs" value={filters.campaign} onChange={(e) => update("campaign", e.target.value)} placeholder="group_invite" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="share-filter-medium" className="text-xs">Medium</Label>
          <Input id="share-filter-medium" className="h-8 text-xs" value={filters.medium} onChange={(e) => update("medium", e.target.value)} placeholder="social_share" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="share-filter-entity" className="text-xs">Entity</Label>
          <Input id="share-filter-entity" className="h-8 text-xs" value={filters.entityType} onChange={(e) => update("entityType", e.target.value)} placeholder="group" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="share-filter-user" className="text-xs">User ID</Label>
          <Input id="share-filter-user" className="h-8 font-mono text-xs" value={filters.userId} onChange={(e) => update("userId", e.target.value)} placeholder="uuid" />
        </div>
      </CardContent>
    </Card>
  );
}

function useShareConfig() {
  return useQuery({
    queryKey: ["admin", "utm-config"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("admin_get_utm_config");
      if (error) throw error;
      return data as unknown as UtmShareConfig;
    },
    staleTime: 30_000,
  });
}

function getShareSource(platform: UtmPlatform | null | undefined) {
  if (!platform) return "unknown";
  return platform.source || platform.platform_key || "unknown";
}

function RefPreview({ url }: { url: string }) {
  const parts = extractRefCode(url);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share URL copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ZapIcon className="h-3.5 w-3.5" />
          Share URL preview
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 cursor-pointer px-2 text-xs transition-colors"
          onClick={() => void copy()}
        >
          <CopyIcon className="mr-1.5 h-3 w-3" />
          Copy
        </Button>
      </div>
      {parts ? (
        <p className="break-all font-mono text-xs">
          <span className="text-muted-foreground">{parts.base}</span>
          <span className="text-muted-foreground">?ref=</span>
          <span className="rounded bg-primary/10 px-1 py-0.5 font-semibold text-primary">{parts.ref}</span>
        </p>
      ) : (
        <p className="break-all font-mono text-xs text-muted-foreground">{url}</p>
      )}
    </div>
  );
}

function BuilderTab({ config }: { config: UtmShareConfig }) {
  const configuredTemplates = config.templates.length ? config.templates : DEFAULT_UTM_SHARE_CONFIG.templates;
  const enabledTemplates = configuredTemplates.filter((item) => item.enabled);
  const templates = enabledTemplates.length ? enabledTemplates : configuredTemplates;
  const platforms = sortUtmPlatforms(config.platforms.length ? config.platforms : DEFAULT_UTM_SHARE_CONFIG.platforms);
  const initialTemplate = findUtmTemplate(templates, "group_detail_invite_button") ?? templates[0];
  const initialPlatform = findUtmPlatform(platforms, initialTemplate?.default_platform) ?? platforms[0];
  const [templateKey, setTemplateKey] = useState(initialTemplate?.template_key ?? "");
  const [platformKey, setPlatformKey] = useState(initialPlatform?.platform_key ?? "");
  const [destinationUrl, setDestinationUrl] = useState(() => getSampleDestinationForTemplate(initialTemplate));
  const [title, setTitle] = useState("FairPay share");
  const [text, setText] = useState("Open this FairPay link");

  const template = findUtmTemplate(templates, templateKey) ?? templates[0];
  const platform = findUtmPlatform(platforms, platformKey) ?? platforms[0];
  const shareUrl =
    template && platform
      ? appendShareRef(destinationUrl || "/", {
          source: getShareSource(platform),
          medium: platform.medium,
          campaign: template.campaign,
          content: template.content,
        })
      : destinationUrl;
  const refProperties = getShareRefPropertiesFromUrl(shareUrl);
  const refRows = getRefRows(refProperties);
  const hasShareRef = Boolean(refProperties.share_ref);
  const intentUrl =
    platform?.method === "platform"
      ? buildPlatformShareIntent({ trackedUrl: shareUrl, title, text, platform })
      : null;
  const cleanDestinationUrl = getCanonicalDestinationUrl(destinationUrl || "/");
  const destinationPath = getCanonicalDestinationPath(destinationUrl || "/");

  const selectTemplate = (nextTemplateKey: string) => {
    setTemplateKey(nextTemplateKey);
    const nextTemplate = findUtmTemplate(templates, nextTemplateKey);
    setDestinationUrl(getSampleDestinationForTemplate(nextTemplate));
    if (nextTemplate?.default_platform) setPlatformKey(nextTemplate.default_platform);
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-primary" />
            <div>
              <CardTitle className="text-sm font-semibold">Link Builder</CardTitle>
              <CardDescription className="text-xs">
                Configure entry point and platform to generate a compact attributed share URL.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={hasShareRef ? "secondary" : "destructive"} className="text-xs">
              {hasShareRef ? "ref ready" : "missing ref"}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              {template?.entity_type ?? "entity"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Controls */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="share-builder-template" className="text-xs">Entry point</Label>
            <Select value={template?.template_key ?? ""} onValueChange={selectTemplate}>
              <SelectTrigger id="share-builder-template" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((item) => (
                  <SelectItem key={item.template_key} value={item.template_key} className="text-xs">
                    {item.entry_point}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="share-builder-platform" className="text-xs">Share action</Label>
            <Select value={platform?.platform_key ?? ""} onValueChange={setPlatformKey}>
              <SelectTrigger id="share-builder-platform" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((item) => (
                  <SelectItem key={item.platform_key} value={item.platform_key} className="text-xs">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="share-builder-title" className="text-xs">Title</Label>
            <Input id="share-builder-title" className="h-8 text-xs" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="share-builder-text" className="text-xs">Text</Label>
            <Input id="share-builder-text" className="h-8 text-xs" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="share-builder-destination" className="text-xs">Destination URL</Label>
          <Input
            id="share-builder-destination"
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            className="h-8 font-mono text-xs"
          />
        </div>

        {/* Ref preview — highlighted compact code */}
        <RefPreview url={shareUrl} />

        <Separator />

        {/* Destination + decoded fields */}
        <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
          <div className="rounded-lg border bg-muted/10 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CheckCircle2Icon className="h-3.5 w-3.5" />
              Destination (no tracking noise)
            </div>
            <p className="break-all font-mono text-xs font-medium">{destinationPath}</p>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{cleanDestinationUrl}</p>
          </div>

          <div className="rounded-lg border p-3">
            <p className="mb-2 text-xs font-medium">Decoded attribution fields</p>
            {refRows.length ? (
              <Table>
                <TableBody>
                  {refRows.map((row) => (
                    <TableRow key={row.key} className="transition-colors hover:bg-muted/30">
                      <TableCell className="w-36 py-1.5 font-mono text-xs text-muted-foreground">{row.key}</TableCell>
                      <TableCell className="break-all py-1.5 font-mono text-xs font-medium">{row.value}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="transition-colors hover:bg-muted/30">
                    <TableCell className="w-36 py-1.5 font-mono text-xs text-muted-foreground">share_method</TableCell>
                    <TableCell className="py-1.5 font-mono text-xs font-medium">{platform?.method ?? "unknown"}</TableCell>
                  </TableRow>
                  {platform?.method === "platform" ? (
                    <TableRow className="transition-colors hover:bg-muted/30">
                      <TableCell className="w-36 py-1.5 font-mono text-xs text-muted-foreground">share_platform</TableCell>
                      <TableCell className="py-1.5 font-mono text-xs font-medium">{platform.platform_key}</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            ) : (
              <Alert variant="destructive" className="mt-2 py-2">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle className="text-xs">Invalid ref</AlertTitle>
                <AlertDescription className="text-xs">Check destination URL and share action.</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Platform intent */}
        {platform?.method === "platform" ? (
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-medium">Platform intent URL</p>
              {intentUrl ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 cursor-pointer px-2 text-xs transition-colors"
                  onClick={() => void copy(intentUrl, "Intent URL")}
                >
                  <CopyIcon className="mr-1.5 h-3 w-3" />
                  Copy
                </Button>
              ) : null}
            </div>
            <p className="break-all font-mono text-xs text-muted-foreground">
              {intentUrl ?? "No platform intent for this action."}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MetricsTab({ data, isLoading }: { data: UtmPerformanceResponse | undefined; isLoading: boolean }) {
  const topSource = data?.traffic_by_source?.[0]?.name ?? "direct";
  const topCampaign = data?.traffic_by_campaign?.[0]?.name ?? "none";
  const totalSignups = data?.signup_by_source?.reduce((sum, row) => sum + row.count, 0) ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2 pb-2">
                <Skeleton className="h-3 w-20" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-2.5 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            Loading share metrics…
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminMetricGrid columns={4} className="xl:grid-cols-5">
        <AdminMetricCard
          variant="muted"
          label="Sessions"
          value={data?.total_sessions ?? 0}
          description={`Top source: ${topSource}`}
          icon={ActivityIcon}
        />
        <AdminMetricCard
          variant="muted"
          label="Events"
          value={data?.total_events ?? 0}
          description="Events with attribution context"
          icon={ZapIcon}
        />
        <AdminMetricCard
          variant="muted"
          label="Shares"
          value={data?.total_shares ?? 0}
          description="Generated, copied, completed, failed"
          icon={ShareIcon}
        />
        <AdminMetricCard
          variant="muted"
          label="Top campaign"
          value={
            <Badge variant="secondary" className="max-w-full truncate font-mono text-xs" title={String(topCampaign)}>
              {topCampaign}
            </Badge>
          }
          description="Highest-traffic campaign"
          icon={LinkIcon}
        />
        <AdminMetricCard
          variant="muted"
          label="Signups"
          value={totalSignups}
          description="Auth register events by source"
          icon={UserPlusIcon}
        />
      </AdminMetricGrid>

      <div className="grid gap-3 xl:grid-cols-2">
        <MetricTable title="Traffic by source" description="Sessions grouped by decoded source or referrer fallback." rows={data?.traffic_by_source ?? []} />
        <MetricTable title="Traffic by campaign" description="Sessions grouped by decoded campaign." rows={data?.traffic_by_campaign ?? []} />
        <MetricTable title="Destination pages" description="Shared destinations without attribution noise." rows={data?.destination_pages ?? []} />
        <MetricTable title="Share count by entry point" description="Share events grouped by UI entry point." rows={data?.share_count_by_content ?? []} />
        <MetricTable title="Signup by source" description="Registration events grouped by last-touch source." rows={data?.signup_by_source ?? []} />
        <MetricTable title="Invite accepted by campaign" description="Invite acceptance events grouped by campaign." rows={data?.invite_accepted_by_campaign ?? []} />
        <MetricTable title="Conversion — first-touch" description="Authenticated attribution by original source." rows={data?.conversion_by_first_touch_source ?? []} />
        <MetricTable title="Conversion — last-touch" description="Authenticated attribution by most recent source." rows={data?.conversion_by_last_touch_source ?? []} />
      </div>
    </div>
  );
}

function RecentSharesTab({ rows }: { rows: UtmRecentShareRow[] }) {
  if (!rows.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <ShareIcon className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No share events for the current filters.</p>
          <p className="text-xs text-muted-foreground">Adjust the date range or clear dimension filters.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          <div>
            <CardTitle className="text-sm font-semibold">Recent shares</CardTitle>
            <CardDescription className="text-xs">
              Attributed share events with compact destination and journey handoff.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-t">
                <TableHead className="text-xs">Event</TableHead>
                <TableHead className="text-xs">Destination</TableHead>
                <TableHead className="text-xs">Source</TableHead>
                <TableHead className="text-xs">Campaign</TableHead>
                <TableHead className="text-xs">When</TableHead>
                <TableHead className="w-28 text-right text-xs">Journey</TableHead>
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
                    <TableCell className="py-2.5">
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
                    <TableCell className="max-w-[280px] break-all py-2.5 font-mono text-xs text-muted-foreground">
                      {displayPath}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs">{row.utm_source ?? "-"}</TableCell>
                    <TableCell className="py-2.5 font-mono text-xs">{row.utm_campaign ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap py-2.5 text-xs text-muted-foreground">
                      {formatDateTime(row.occurred_at)}
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
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
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminUtmDevTool({ embedded = false }: { embedded?: boolean }) {
  const [filters, setFilters] = useState<FilterState>(() => getInitialFilters());

  const rpcFilters = useMemo(
    () => ({
      fromIso: toIsoStart(filters.dateFrom),
      toIso: toIsoEnd(filters.dateTo),
      source: optionalFilter(filters.source),
      campaign: optionalFilter(filters.campaign),
      medium: optionalFilter(filters.medium),
      entityType: optionalFilter(filters.entityType),
      userId: optionalFilter(filters.userId),
    }),
    [filters],
  );

  const configQuery = useShareConfig();
  const config = configQuery.data ?? DEFAULT_UTM_SHARE_CONFIG;

  const performanceQuery = useQuery({
    queryKey: ["admin", "utm-performance", rpcFilters],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("admin_get_utm_performance", {
        p_from: rpcFilters.fromIso,
        p_to: rpcFilters.toIso,
        p_source: rpcFilters.source,
        p_campaign: rpcFilters.campaign,
        p_medium: rpcFilters.medium,
        p_entity_type: rpcFilters.entityType,
        p_user_id: rpcFilters.userId,
      });
      if (error) throw error;
      return data as UtmPerformanceResponse;
    },
    staleTime: 30_000,
  });

  const refetchAll = () => {
    void configQuery.refetch();
    void performanceQuery.refetch();
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Share Links"
        description="Build compact share URLs, inspect decoded attribution, and monitor performance."
        density={embedded ? "section" : "page"}
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">
              <ZapIcon className="mr-1 h-3 w-3" />
              compact ref
            </Badge>
            <Badge variant="outline" className="text-xs">legacy links accepted</Badge>
          </div>
        }
      />

      <FilterPanel
        filters={filters}
        setFilters={setFilters}
        isFetching={performanceQuery.isFetching || configQuery.isFetching}
        onRefresh={refetchAll}
      />

      {configQuery.isError || performanceQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Share data unavailable</AlertTitle>
          <AlertDescription className="text-xs">
            Builder is using fallback config. Metrics may be incomplete until the RPC responds.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="builder" className="space-y-3">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="builder" className="text-xs">Builder</TabsTrigger>
          <TabsTrigger value="metrics" className="text-xs">Metrics</TabsTrigger>
          <TabsTrigger value="recent" className="text-xs">Recent shares</TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <BuilderTab config={config} />
        </TabsContent>
        <TabsContent value="metrics">
          <MetricsTab data={performanceQuery.data} isLoading={performanceQuery.isLoading} />
        </TabsContent>
        <TabsContent value="recent">
          <RecentSharesTab rows={performanceQuery.data?.recent_shares ?? []} />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Older campaign links still work — new shares use a single compact <code className="rounded bg-muted px-1 py-0.5 font-mono">ref</code> parameter.
      </p>
    </div>
  );
}
