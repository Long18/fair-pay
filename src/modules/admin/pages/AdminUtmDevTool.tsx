import { memo, useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
import { cn } from "@/lib/utils";
import { buildTrackedUrl, getCanonicalDestinationPath, getCanonicalDestinationUrl, getUtmPropertiesFromUrl } from "@/lib/utm";
import { buildPlatformShareIntent } from "@/lib/share-tracking";
import {
  DEFAULT_UTM_SHARE_CONFIG,
  findUtmPlatform,
  findUtmTemplate,
  sortUtmPlatforms,
  type ShareMethod,
  type UtmPlatform,
  type UtmShareConfig,
  type UtmShareTemplate,
} from "@/lib/utm-config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ActivityIcon,
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
  LinkIcon,
  Loader2Icon,
  PieChartIcon,
  RefreshCwIcon,
  SettingsIcon,
  ShareIcon,
  UserIcon,
  UserPlusIcon,
} from "@/components/ui/icons";
import type {
  UtmCanvasNodeMetrics,
  UtmCanvasResponse,
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

type UtmCanvasNodeData = {
  label: string;
  layer: string;
  metrics: UtmCanvasNodeMetrics;
};

type UtmCanvasNodeType = Node<UtmCanvasNodeData, "utmNode">;

const LAYER_LABELS: Record<string, string> = {
  source: "Source",
  method: "Share method",
  campaign: "Campaign",
  content: "Entry point",
  destination: "Destination",
  conversion: "Conversion",
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

function MetricList({ title, description, rows }: { title: string; description: string; rows: UtmMetricRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.name} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <span className="min-w-0 truncate text-sm font-medium" title={row.name}>{row.name}</span>
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
        <Input type="date" value={filters.dateFrom} onChange={(event) => update("dateFrom", event.target.value)} />
        <Input type="date" value={filters.dateTo} onChange={(event) => update("dateTo", event.target.value)} />
        <Input value={filters.source} onChange={(event) => update("source", event.target.value)} placeholder="source" />
        <Input value={filters.campaign} onChange={(event) => update("campaign", event.target.value)} placeholder="campaign" />
        <Input value={filters.medium} onChange={(event) => update("medium", event.target.value)} placeholder="medium" />
        <Input value={filters.entityType} onChange={(event) => update("entityType", event.target.value)} placeholder="entity type" />
        <Input value={filters.userId} onChange={(event) => update("userId", event.target.value)} placeholder="user id" />
      </CardContent>
    </Card>
  );
}

function useUtmConfig() {
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

function PlatformEditor({
  platform,
  onSave,
  isSaving,
}: {
  platform: UtmPlatform;
  onSave: (platform: UtmPlatform) => void;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState<UtmPlatform>(platform);

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{draft.label}</p>
            <Badge variant={draft.method === "platform" ? "secondary" : "outline"}>{draft.method}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{draft.platform_key}</p>
        </div>
        <Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft({ ...draft, enabled })} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-1.5">
          <Label>Label</Label>
          <Input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Source</Label>
          <Input value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Medium</Label>
          <Input value={draft.medium} onChange={(event) => setDraft({ ...draft, medium: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Method</Label>
          <Select value={draft.method} onValueChange={(value) => setDraft({ ...draft, method: value as ShareMethod })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="platform">platform</SelectItem>
              <SelectItem value="copy_link">copy_link</SelectItem>
              <SelectItem value="native_share">native_share</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Icon</Label>
          <Input value={draft.icon_key ?? ""} onChange={(event) => setDraft({ ...draft, icon_key: event.target.value || null })} />
        </div>
        <div className="space-y-1.5">
          <Label>Order</Label>
          <Input
            type="number"
            value={draft.display_order}
            onChange={(event) => setDraft({ ...draft, display_order: Number(event.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <Label>Intent URL template</Label>
        <Textarea
          value={draft.intent_url_template ?? ""}
          onChange={(event) => setDraft({ ...draft, intent_url_template: event.target.value || null })}
          placeholder="https://example.com/share?u={url}&text={text}"
          className="min-h-20 font-mono text-xs"
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="button" onClick={() => onSave(draft)} disabled={isSaving}>
          {isSaving ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2Icon className="mr-2 h-4 w-4" />}
          Save platform
        </Button>
      </div>
    </div>
  );
}

function TemplateEditor({
  template,
  platforms,
  onSave,
  isSaving,
}: {
  template: UtmShareTemplate;
  platforms: UtmPlatform[];
  onSave: (template: UtmShareTemplate) => void;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState<UtmShareTemplate>(template);

  const allowed = new Set(draft.allowed_platforms);
  const togglePlatform = (platformKey: string, enabled: boolean) => {
    const next = new Set(allowed);
    if (enabled) next.add(platformKey);
    else next.delete(platformKey);
    setDraft({ ...draft, allowed_platforms: [...next] });
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{draft.entry_point}</p>
            <Badge variant="secondary">{draft.entity_type}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{draft.template_key}</p>
        </div>
        <Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft({ ...draft, enabled })} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-1.5">
          <Label>Entity</Label>
          <Input value={draft.entity_type} onChange={(event) => setDraft({ ...draft, entity_type: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Entry point</Label>
          <Input value={draft.entry_point} onChange={(event) => setDraft({ ...draft, entry_point: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Campaign</Label>
          <Input value={draft.campaign} onChange={(event) => setDraft({ ...draft, campaign: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Content</Label>
          <Input value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Default platform</Label>
          <Select
            value={draft.default_platform ?? "none"}
            onValueChange={(value) => setDraft({ ...draft, default_platform: value === "none" ? null : value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {platforms.map((platform) => (
                <SelectItem key={platform.platform_key} value={platform.platform_key}>
                  {platform.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label>Allowed actions</Label>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {platforms.map((platform) => (
            <label key={platform.platform_key} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
              <Switch
                checked={allowed.has(platform.platform_key)}
                onCheckedChange={(enabled) => togglePlatform(platform.platform_key, enabled)}
              />
              <span className="min-w-0 truncate">{platform.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="button" onClick={() => onSave(draft)} disabled={isSaving}>
          {isSaving ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2Icon className="mr-2 h-4 w-4" />}
          Save template
        </Button>
      </div>
    </div>
  );
}

function SetupTab({ config }: { config: UtmShareConfig }) {
  const queryClient = useQueryClient();
  const platformMutation = useMutation({
    mutationFn: async (platform: UtmPlatform) => {
      const { error } = await supabaseClient.rpc("admin_upsert_utm_platform", { p_platform: platform });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("UTM platform saved");
      queryClient.invalidateQueries({ queryKey: ["admin", "utm-config"] });
      queryClient.invalidateQueries({ queryKey: ["utm-share-config"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to save platform"),
  });
  const templateMutation = useMutation({
    mutationFn: async (template: UtmShareTemplate) => {
      const { error } = await supabaseClient.rpc("admin_upsert_utm_template", { p_template: template });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("UTM template saved");
      queryClient.invalidateQueries({ queryKey: ["admin", "utm-config"] });
      queryClient.invalidateQueries({ queryKey: ["utm-share-config"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to save template"),
  });

  const platforms = sortUtmPlatforms(config.platforms);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SettingsIcon className="h-4 w-4" />
            Platforms and utility actions
          </CardTitle>
          <CardDescription>
            Platform actions write `share_method=platform` and a real `share_platform`. Copy/native stay as utility methods with unknown source.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {platforms.map((platform) => (
            <PlatformEditor
              key={platform.platform_key}
              platform={platform}
              isSaving={platformMutation.isPending}
              onSave={(next) => platformMutation.mutate(next)}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShareIcon className="h-4 w-4" />
            Share templates
          </CardTitle>
          <CardDescription>
            Campaign/content defaults per entity and entry point. Disabled templates disappear from the platform picker.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.templates.map((template) => (
            <TemplateEditor
              key={template.template_key}
              template={template}
              platforms={platforms}
              isSaving={templateMutation.isPending}
              onSave={(next) => templateMutation.mutate(next)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function BuilderTab({ config }: { config: UtmShareConfig }) {
  const templates = config.templates.length ? config.templates : DEFAULT_UTM_SHARE_CONFIG.templates;
  const platforms = sortUtmPlatforms(config.platforms.length ? config.platforms : DEFAULT_UTM_SHARE_CONFIG.platforms);
  const [templateKey, setTemplateKey] = useState(templates[0]?.template_key ?? "");
  const [platformKey, setPlatformKey] = useState(templates[0]?.default_platform ?? platforms[0]?.platform_key ?? "");
  const [destinationUrl, setDestinationUrl] = useState("https://long-pay.vercel.app/debts/123");
  const [title, setTitle] = useState("FairPay share");
  const [text, setText] = useState("Open this FairPay link");

  const effectiveTemplateKey = findUtmTemplate(templates, templateKey)?.template_key ?? templates[0]?.template_key ?? "";
  const template = findUtmTemplate(templates, effectiveTemplateKey) ?? templates[0];
  const platform = findUtmPlatform(platforms, platformKey) ?? platforms[0];
  const source = platform?.method === "platform" ? platform.source : "unknown";
  const medium = platform?.medium ?? "social_share";
  const trackedUrl = template && platform ? buildTrackedUrl({
    baseUrl: destinationUrl || "/",
    source,
    medium,
    campaign: template.campaign,
    content: template.content,
    overwriteUtm: true,
  }) : destinationUrl;
  const destinationPath = getCanonicalDestinationPath(destinationUrl || "/");
  const cleanDestinationUrl = getCanonicalDestinationUrl(destinationUrl || "/");
  const utmProperties = getUtmPropertiesFromUrl(trackedUrl);
  const intentUrl = platform?.method === "platform" ? buildPlatformShareIntent({ trackedUrl, title, text, platform }) : null;

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <LinkIcon className="h-4 w-4" />
          Builder
        </CardTitle>
        <CardDescription>Preview one entry point against one platform without firing analytics events.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Template</Label>
            <Select value={effectiveTemplateKey} onValueChange={setTemplateKey}>
              <SelectTrigger>
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
            <Label>Action</Label>
            <Select value={platformKey} onValueChange={setPlatformKey}>
              <SelectTrigger>
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
            <Label>Title</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Text</Label>
            <Input value={text} onChange={(event) => setText(event.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Destination URL</Label>
          <Input value={destinationUrl} onChange={(event) => setDestinationUrl(event.target.value)} className="font-mono text-sm" />
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">Destination display</p>
            <p className="mt-2 break-all font-mono text-sm">{destinationPath}</p>
            <p className="mt-2 break-all text-xs text-muted-foreground">{cleanDestinationUrl}</p>
          </div>
          <div className="rounded-lg border p-3 xl:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">Tracked URL preview</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void copy(trackedUrl, "Tracked URL")}>
                <CopyIcon className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
            <p className="mt-2 break-all font-mono text-xs">{trackedUrl}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(utmProperties).map(([key, value]) => (
                <Badge key={key} variant="secondary">{key}: {value}</Badge>
              ))}
              <Badge variant="outline">share_method: {platform?.method ?? "unknown"}</Badge>
              {platform?.method === "platform" ? <Badge variant="outline">share_platform: {platform.platform_key}</Badge> : null}
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Intent URL</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Utility actions do not have a platform intent. Native target remains unobservable.
              </p>
            </div>
            {intentUrl ? (
              <Button type="button" size="sm" variant="outline" onClick={() => void copy(intentUrl, "Intent URL")}>
                <CopyIcon className="mr-2 h-4 w-4" />
                Copy
              </Button>
            ) : null}
          </div>
          <p className="mt-3 break-all font-mono text-xs">{intentUrl ?? "No platform intent for this action."}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const UtmNode = memo(function UtmNode({ data }: NodeProps<UtmCanvasNodeType>) {
  const layer = LAYER_LABELS[data.layer] ?? data.layer;
  return (
    <>
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-border !bg-card" />
      <div className="min-w-[230px] max-w-[280px] rounded-lg border bg-card/95 p-3 shadow-xl backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Badge variant="outline" className="mb-2 text-[10px]">{layer}</Badge>
            <p className="break-words text-sm font-semibold">{data.label}</p>
          </div>
          <Badge variant="secondary">{data.metrics.events}</Badge>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <span>Sessions {data.metrics.sessions}</span>
          <span>Shares {data.metrics.shares}</span>
          <span>Signups {data.metrics.signups}</span>
          <span>CVR {data.metrics.conversion_rate}%</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-border !bg-card" />
    </>
  );
});

const nodeTypes = { utmNode: UtmNode } as const;

function UtmCanvasView({ data, isLoading }: { data: UtmCanvasResponse | undefined; isLoading: boolean }) {
  const { nodes, edges } = useMemo(() => {
    const rows = data?.nodes ?? [];
    const maxEdge = Math.max(1, ...(data?.edges ?? []).map((edge) => edge.count));
    return {
      nodes: rows.map((node): Node<UtmCanvasNodeData> => ({
        id: node.id,
        type: "utmNode",
        position: {
          x: node.layer_index * 300,
          y: (node.order - 1) * 142,
        },
        data: {
          label: node.label,
          layer: node.type,
          metrics: node.metrics,
        },
      })),
      edges: (data?.edges ?? []).map((edge): Edge => ({
        id: `${edge.source}->${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        label: String(edge.count),
        style: {
          strokeWidth: Math.max(1.5, Math.min(8, 1.5 + (edge.count / maxEdge) * 6)),
          stroke: "hsl(var(--primary))",
        },
        labelBgStyle: {
          fill: "hsl(var(--card))",
          fillOpacity: 0.9,
        },
      })),
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-[620px] items-center justify-center rounded-lg border bg-surface-overlay text-muted-foreground">
        <Loader2Icon className="mr-2 h-5 w-5 animate-spin" />
        Loading UTM canvas...
      </div>
    );
  }

  if (!nodes.length) {
    return (
      <div className="flex h-[620px] items-center justify-center rounded-lg border bg-surface-overlay text-sm text-muted-foreground">
        No attribution flow data for the selected filters.
      </div>
    );
  }

  return (
    <div className="h-[620px] overflow-hidden rounded-lg border bg-surface-overlay">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.18}
        maxZoom={2}
        nodesDraggable
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="color-mix(in oklch, var(--border) 48%, transparent)"
        />
        <MiniMap className="!border-border !bg-card/90" pannable zoomable nodeBorderRadius={8} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

function CanvasTab({ data, isLoading }: { data: UtmCanvasResponse | undefined; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PieChartIcon className="h-4 w-4" />
          Aggregate attribution canvas
        </CardTitle>
        <CardDescription>
          Source/platform to share method to campaign to content to destination page to conversion. Destination nodes are canonical paths without UTM params.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Events" value={data?.summary?.events ?? 0} description="Filtered journey events" icon={ActivityIcon} />
          <MetricCard label="Sessions" value={data?.summary?.sessions ?? 0} description="Distinct sessions in graph" icon={UserIcon} />
          <MetricCard label="Shares" value={data?.summary?.shares ?? 0} description="Share pipeline events" icon={ShareIcon} />
          <MetricCard label="Conversions" value={data?.summary?.conversions ?? 0} description="Signup and business conversions" icon={UserPlusIcon} />
        </div>
        <ReactFlowProvider>
          <UtmCanvasView data={data} isLoading={isLoading} />
        </ReactFlowProvider>
      </CardContent>
    </Card>
  );
}

function AnalyticsSummary({ data, isLoading }: { data: UtmPerformanceResponse | undefined; isLoading: boolean }) {
  const topSource = data?.traffic_by_source?.[0]?.name ?? "direct";
  const topCampaign = data?.traffic_by_campaign?.[0]?.name ?? "none";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
          Loading UTM analytics...
        </CardContent>
      </Card>
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
        <MetricList title="Traffic by source" description="Session starts grouped by UTM source or referrer fallback." rows={data?.traffic_by_source ?? []} />
        <MetricList title="Traffic by campaign" description="Session starts grouped by UTM campaign." rows={data?.traffic_by_campaign ?? []} />
        <MetricList title="Destination pages" description="Share destination pages shown without UTM noise." rows={data?.destination_pages ?? []} />
        <MetricList title="Share count by content" description="Share events grouped by exact UI entry point." rows={data?.share_count_by_content ?? []} />
        <MetricList title="Signup by source" description="Registration events grouped by last-touch source." rows={data?.signup_by_source ?? []} />
        <MetricList title="Invite accepted by campaign" description="Invite acceptance conversion events grouped by campaign." rows={data?.invite_accepted_by_campaign ?? []} />
        <MetricList title="Conversion by first-touch source" description="Authenticated attribution by original source." rows={data?.conversion_by_first_touch_source ?? []} />
        <MetricList title="Conversion by last-touch source" description="Authenticated attribution by most recent source." rows={data?.conversion_by_last_touch_source ?? []} />
      </div>
    </div>
  );
}

function JourneyOverlayTab({ rows }: { rows: UtmRecentShareRow[] }) {
  const [showRawUrls, setShowRawUrls] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ActivityIcon className="h-4 w-4" />
            Journey overlay
          </CardTitle>
          <CardDescription>Recent attributed share events with compact destination display and journey handoff.</CardDescription>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={showRawUrls} onCheckedChange={setShowRawUrls} />
          Debug raw URLs
        </label>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length ? rows.map((row, index) => {
          const displayPath = compactUrlForDisplay(row);
          return (
            <div key={`${row.session_id}-${row.event_name}-${row.occurred_at}-${index}`} className="rounded-lg border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{row.event_name}</Badge>
                    <Badge variant="outline">{row.share_method ?? "unknown_method"}</Badge>
                    {row.share_platform ? <Badge variant="outline">{row.share_platform}</Badge> : null}
                    <Badge variant="outline">{row.share_platform_detection ?? "unknown_detection"}</Badge>
                  </div>
                  <p className="break-all font-mono text-sm">{displayPath}</p>
                  <div className="flex flex-wrap gap-2">
                    {row.utm_source ? <Badge variant="secondary">source: {row.utm_source}</Badge> : null}
                    {row.utm_medium ? <Badge variant="secondary">medium: {row.utm_medium}</Badge> : null}
                    {row.utm_campaign ? <Badge variant="secondary">campaign: {row.utm_campaign}</Badge> : null}
                    {row.utm_content ? <Badge variant="secondary">content: {row.utm_content}</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(row.occurred_at)}
                    {row.entity_type ? ` · ${row.entity_type}` : ""}
                    {row.entity_id ? ` · ${row.entity_id}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {row.user_id ? (
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link to={`/admin/people/${row.user_id}/journey?session=${row.session_id ?? "all"}&source=${row.utm_source ?? ""}&campaign=${row.utm_campaign ?? ""}`}>
                        <ExternalLinkIcon className="mr-2 h-4 w-4" />
                        Open journey
                      </Link>
                    </Button>
                  ) : (
                    <Badge variant="outline">anonymous</Badge>
                  )}
                </div>
              </div>
              {showRawUrls ? (
                <>
                  <Separator className="my-3" />
                  <div className="grid gap-2 text-xs text-muted-foreground">
                    <p className="break-all">destination_url: {row.destination_url ?? "-"}</p>
                    <p className="break-all">generated_path: {row.generated_path ?? "-"}</p>
                    <p className="break-all">generated_url_hash: {row.generated_url_hash ?? "-"}</p>
                    <p className="break-all">legacy_generated_url: {row.generated_url ?? "-"}</p>
                  </div>
                </>
              ) : null}
            </div>
          );
        }) : (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No recent attributed share events for the current filters.
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

  const configQuery = useUtmConfig();
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

  const canvasQuery = useQuery({
    queryKey: ["admin", "utm-canvas", rpcFilters],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("admin_get_utm_canvas", {
        p_from: rpcFilters.fromIso,
        p_to: rpcFilters.toIso,
        p_source: rpcFilters.source,
        p_campaign: rpcFilters.campaign,
        p_medium: rpcFilters.medium,
        p_entity_type: rpcFilters.entityType,
        p_user_id: rpcFilters.userId,
      });
      if (error) throw error;
      return data as UtmCanvasResponse;
    },
    staleTime: 30_000,
  });

  const refetchAll = () => {
    configQuery.refetch();
    performanceQuery.refetch();
    canvasQuery.refetch();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold tracking-tight">UTM devtool</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure share attribution, preview tracked links, and inspect aggregate UTM flow without a standalone admin page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">copy/native = methods</Badge>
          <Badge variant="outline">platform = explicit only</Badge>
        </div>
      </div>

      <FilterPanel
        filters={filters}
        setFilters={setFilters}
        isFetching={performanceQuery.isFetching || canvasQuery.isFetching || configQuery.isFetching}
        onRefresh={refetchAll}
      />

      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="analytics">Metrics</TabsTrigger>
          <TabsTrigger value="canvas">Canvas</TabsTrigger>
          <TabsTrigger value="journey">Journey Overlay</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className={cn("space-y-4", configQuery.isLoading && "opacity-70")}>
          {configQuery.isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Loading UTM config...
              </CardContent>
            </Card>
          ) : (
            <SetupTab config={config} />
          )}
        </TabsContent>
        <TabsContent value="builder">
          <BuilderTab config={config} />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsSummary data={performanceQuery.data} isLoading={performanceQuery.isLoading} />
        </TabsContent>
        <TabsContent value="canvas">
          <CanvasTab data={canvasQuery.data} isLoading={canvasQuery.isLoading} />
        </TabsContent>
        <TabsContent value="journey">
          <JourneyOverlayTab rows={performanceQuery.data?.recent_shares ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
