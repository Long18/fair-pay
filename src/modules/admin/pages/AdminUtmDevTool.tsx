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
  Loader2Icon,
  PieChartIcon,
  RefreshCwIcon,
  ShareIcon,
  UserPlusIcon,
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function compactUrlForDisplay(row: Pick<UtmRecentShareRow, "destination_path" | "destination_url" | "generated_url" | "generated_path">) {
  return getCanonicalDestinationPath(
    row.destination_path ||
      row.destination_url ||
      row.generated_url ||
      row.generated_path ||
      "/",
  );
}

function getSampleDestinationForTemplate(template: UtmShareTemplate | null | undefined) {
  switch (template?.entity_type) {
    case "expense":
      return "https://long-pay.vercel.app/share/expenses/demo-expense";
    case "debt":
      return "https://long-pay.vercel.app/share/debts/demo-token";
    case "friend":
      return "https://long-pay.vercel.app/friends/demo-friend";
    case "profile":
      return "https://long-pay.vercel.app/profile/demo-profile";
    case "group":
    default:
      return "https://long-pay.vercel.app/groups/show/demo-group";
  }
}

function getRefRows(properties: Record<string, string>) {
  return ["share_ref", "utm_source", "utm_medium", "utm_campaign", "utm_content"]
    .map((key) => ({ key, value: properties[key] }))
    .filter((row) => row.value);
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
        <CardTitle className="break-words text-2xl">{value}</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function MetricTable({ title, description, rows }: { title: string; description: string; rows: UtmMetricRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-24 text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="max-w-[320px] truncate font-medium" title={row.name}>
                    {row.name}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No matching data.
          </p>
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
  const update = (key: keyof FilterState, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Date range plus optional source, campaign, medium, entity, and user filters.</CardDescription>
        </div>
        <Button type="button" variant="outline" onClick={onRefresh} disabled={isFetching}>
          {isFetching ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCwIcon className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <div className="space-y-1.5">
          <Label htmlFor="share-filter-from">From</Label>
          <Input id="share-filter-from" type="date" value={filters.dateFrom} onChange={(event) => update("dateFrom", event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="share-filter-to">To</Label>
          <Input id="share-filter-to" type="date" value={filters.dateTo} onChange={(event) => update("dateTo", event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="share-filter-source">Source</Label>
          <Input id="share-filter-source" value={filters.source} onChange={(event) => update("source", event.target.value)} placeholder="facebook" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="share-filter-campaign">Campaign</Label>
          <Input id="share-filter-campaign" value={filters.campaign} onChange={(event) => update("campaign", event.target.value)} placeholder="group_invite" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="share-filter-medium">Medium</Label>
          <Input id="share-filter-medium" value={filters.medium} onChange={(event) => update("medium", event.target.value)} placeholder="social_share" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="share-filter-entity">Entity</Label>
          <Input id="share-filter-entity" value={filters.entityType} onChange={(event) => update("entityType", event.target.value)} placeholder="group" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="share-filter-user">User ID</Label>
          <Input id="share-filter-user" value={filters.userId} onChange={(event) => update("userId", event.target.value)} placeholder="uuid" />
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
  const shareUrl = template && platform ? appendShareRef(destinationUrl || "/", {
    source: getShareSource(platform),
    medium: platform.medium,
    campaign: template.campaign,
    content: template.content,
  }) : destinationUrl;
  const refProperties = getShareRefPropertiesFromUrl(shareUrl);
  const refRows = getRefRows(refProperties);
  const hasShareRef = Boolean(refProperties.share_ref);
  const intentUrl = platform?.method === "platform" ? buildPlatformShareIntent({ trackedUrl: shareUrl, title, text, platform }) : null;
  const cleanDestinationUrl = getCanonicalDestinationUrl(destinationUrl || "/");
  const destinationPath = getCanonicalDestinationPath(destinationUrl || "/");

  const selectTemplate = (nextTemplateKey: string) => {
    setTemplateKey(nextTemplateKey);
    const nextTemplate = findUtmTemplate(templates, nextTemplateKey);
    setDestinationUrl(getSampleDestinationForTemplate(nextTemplate));
    if (nextTemplate?.default_platform) {
      setPlatformKey(nextTemplate.default_platform);
    }
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
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LinkIcon className="h-4 w-4" />
              Builder
            </CardTitle>
            <CardDescription>Generate a compact share link and preview the decoded attribution values stored internally.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={hasShareRef ? "secondary" : "destructive"}>
              {hasShareRef ? "ref ready" : "missing ref"}
            </Badge>
            <Badge variant="outline">{template?.entity_type ?? "entity"}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="share-builder-template">Entry point</Label>
            <Select value={template?.template_key ?? ""} onValueChange={selectTemplate}>
              <SelectTrigger id="share-builder-template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((item) => (
                  <SelectItem key={item.template_key} value={item.template_key}>{item.entry_point}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="share-builder-platform">Share action</Label>
            <Select value={platform?.platform_key ?? ""} onValueChange={setPlatformKey}>
              <SelectTrigger id="share-builder-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((item) => (
                  <SelectItem key={item.platform_key} value={item.platform_key}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="share-builder-title">Title</Label>
            <Input id="share-builder-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="share-builder-text">Text</Label>
            <Input id="share-builder-text" value={text} onChange={(event) => setText(event.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="share-builder-destination">Destination URL</Label>
          <Input
            id="share-builder-destination"
            value={destinationUrl}
            onChange={(event) => setDestinationUrl(event.target.value)}
            className="font-mono text-sm"
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2Icon className="h-4 w-4 text-muted-foreground" />
              Destination display
            </div>
            <p className="mt-2 break-all font-mono text-sm">{destinationPath}</p>
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{cleanDestinationUrl}</p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                Share URL
              </div>
              <Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={() => void copy(shareUrl, "Share URL")}>
                <CopyIcon className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
            <p className="mt-2 break-all font-mono text-xs">{shareUrl}</p>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">Decoded fields</p>
            {refRows.length ? (
              <Table className="mt-2">
                <TableBody>
                  {refRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="w-32 py-2 font-mono text-xs text-muted-foreground">{row.key}</TableCell>
                      <TableCell className="break-all py-2 font-mono text-xs">{row.value}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="w-32 py-2 font-mono text-xs text-muted-foreground">share_method</TableCell>
                    <TableCell className="break-all py-2 font-mono text-xs">{platform?.method ?? "unknown"}</TableCell>
                  </TableRow>
                  {platform?.method === "platform" ? (
                    <TableRow>
                      <TableCell className="w-32 py-2 font-mono text-xs text-muted-foreground">share_platform</TableCell>
                      <TableCell className="break-all py-2 font-mono text-xs">{platform.platform_key}</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            ) : (
              <Alert variant="destructive" className="mt-3">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle>Invalid ref</AlertTitle>
                <AlertDescription>Check the destination URL and selected share action.</AlertDescription>
              </Alert>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Platform intent</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Platform actions open an external share intent. Copy and native actions use the share URL directly.
                </p>
              </div>
              {intentUrl ? (
                <Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={() => void copy(intentUrl, "Intent URL")}>
                  <CopyIcon className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              ) : null}
            </div>
            <p className="mt-3 break-all font-mono text-xs">{intentUrl ?? "No platform intent for this action."}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricsTab({ data, isLoading }: { data: UtmPerformanceResponse | undefined; isLoading: boolean }) {
  const topSource = data?.traffic_by_source?.[0]?.name ?? "direct";
  const topCampaign = data?.traffic_by_campaign?.[0]?.name ?? "none";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="space-y-2 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            Loading share metrics...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Sessions" value={data?.total_sessions ?? 0} description={`Top source: ${topSource}`} icon={ActivityIcon} />
        <MetricCard label="Events" value={data?.total_events ?? 0} description="Events carrying attribution context" icon={PieChartIcon} />
        <MetricCard label="Shares" value={data?.total_shares ?? 0} description="Generated, copied, completed, and failed shares" icon={ShareIcon} />
        <MetricCard label="Campaign" value={topCampaign} description="Highest traffic campaign" icon={PieChartIcon} />
        <MetricCard
          label="Signups"
          value={data?.signup_by_source?.reduce((sum, row) => sum + row.count, 0) ?? 0}
          description="Auth register events by source"
          icon={UserPlusIcon}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <MetricTable title="Traffic by source" description="Session starts grouped by decoded source or referrer fallback." rows={data?.traffic_by_source ?? []} />
        <MetricTable title="Traffic by campaign" description="Session starts grouped by decoded campaign." rows={data?.traffic_by_campaign ?? []} />
        <MetricTable title="Destination pages" description="Shared destination pages shown without attribution query noise." rows={data?.destination_pages ?? []} />
        <MetricTable title="Share count by content" description="Share events grouped by exact UI entry point." rows={data?.share_count_by_content ?? []} />
        <MetricTable title="Signup by source" description="Registration events grouped by last-touch source." rows={data?.signup_by_source ?? []} />
        <MetricTable title="Invite accepted by campaign" description="Invite acceptance conversion events grouped by campaign." rows={data?.invite_accepted_by_campaign ?? []} />
        <MetricTable title="Conversion by first-touch source" description="Authenticated attribution by original source." rows={data?.conversion_by_first_touch_source ?? []} />
        <MetricTable title="Conversion by last-touch source" description="Authenticated attribution by most recent source." rows={data?.conversion_by_last_touch_source ?? []} />
      </div>
    </div>
  );
}

function RecentSharesTab({ rows }: { rows: UtmRecentShareRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ActivityIcon className="h-4 w-4" />
          Recent shares
        </CardTitle>
        <CardDescription>Recent attributed share events with compact destination display and journey handoff.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="w-32 text-right">Journey</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => {
                  const displayPath = compactUrlForDisplay(row);
                  return (
                    <TableRow key={`${row.session_id}-${row.event_name}-${row.occurred_at}-${index}`}>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary">{row.event_name}</Badge>
                          <Badge variant="outline">{row.share_method ?? "unknown"}</Badge>
                          {row.share_platform ? <Badge variant="outline">{row.share_platform}</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[360px] break-all font-mono text-xs">{displayPath}</TableCell>
                      <TableCell>{row.utm_source ?? "-"}</TableCell>
                      <TableCell>{row.utm_campaign ?? "-"}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.occurred_at)}</TableCell>
                      <TableCell className="text-right">
                        {row.user_id ? (
                          <Button asChild type="button" variant="outline" size="sm">
                            <Link to={`/admin/people/${row.user_id}/journey?session=${row.session_id ?? "all"}&source=${row.utm_source ?? ""}&campaign=${row.utm_campaign ?? ""}`}>
                              <ExternalLinkIcon className="mr-2 h-4 w-4" />
                              Open
                            </Link>
                          </Button>
                        ) : (
                          <Badge variant="outline">anonymous</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No recent share events for the current filters.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminUtmDevTool() {
  const [filters, setFilters] = useState<FilterState>(() => getInitialFilters());

  const rpcFilters = useMemo(() => ({
    fromIso: toIsoStart(filters.dateFrom),
    toIso: toIsoEnd(filters.dateTo),
    source: optionalFilter(filters.source),
    campaign: optionalFilter(filters.campaign),
    medium: optionalFilter(filters.medium),
    entityType: optionalFilter(filters.entityType),
    userId: optionalFilter(filters.userId),
  }), [filters]);

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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold tracking-tight">Share Links</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate compact share URLs, inspect decoded attribution, and monitor share performance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">one visible ref</Badge>
          <Badge variant="outline">legacy links accepted</Badge>
        </div>
      </div>

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
          <AlertDescription>Builder fallback config is active; metrics may be incomplete until the admin RPC responds.</AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="builder" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="recent">Recent shares</TabsTrigger>
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

      <Separator />
      <p className="text-xs text-muted-foreground">
        The database still accepts older campaign links; new shares keep the visible URL to a single ref parameter.
      </p>
    </div>
  );
}
