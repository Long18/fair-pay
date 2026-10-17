import { useState } from "react";
import { toast } from "sonner";
import { appendShareRef, getShareRefPropertiesFromUrl } from "@/lib/share-ref";
import { buildPlatformShareIntent } from "@/lib/share-tracking";
import { getCanonicalDestinationPath, getCanonicalDestinationUrl } from "@/lib/utm";
import {
  DEFAULT_UTM_SHARE_CONFIG,
  findUtmPlatform,
  findUtmTemplate,
  sortUtmPlatforms,
  type UtmShareConfig,
} from "@/lib/utm-config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CopyIcon,
  LinkIcon,
  ListFilterIcon,
  Loader2Icon,
  RefreshCwIcon,
  ZapIcon,
} from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import type { FilterState } from "./helpers";
import { getShareSource } from "./share-config";
import {
  getSampleDestinationForTemplate,
  getRefRows,
  extractRefCode,
} from "./helpers";

const DIMENSION_FILTERS: {
  key: Exclude<keyof FilterState, "dateFrom" | "dateTo">;
  id: string;
  label: string;
  placeholder: string;
  mono?: boolean;
}[] = [
  { key: "source", id: "share-filter-source", label: "Source", placeholder: "facebook" },
  { key: "campaign", id: "share-filter-campaign", label: "Campaign", placeholder: "group_invite" },
  { key: "medium", id: "share-filter-medium", label: "Medium", placeholder: "social_share" },
  { key: "entityType", id: "share-filter-entity", label: "Entity", placeholder: "group" },
  { key: "userId", id: "share-filter-user", label: "User ID", placeholder: "uuid", mono: true },
];

/** Date range inline + dimension filters in a popover, sized to share a row with the tab strip. */
export function FilterBar({
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
  const { tAdmin } = useAdminTranslation();
  const update = (key: keyof FilterState, value: string) => setFilters({ ...filters, [key]: value });
  const activeCount = DIMENSION_FILTERS.filter((item) => filters[item.key].trim()).length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="flex items-center gap-1">
        <Label htmlFor="share-filter-from" className="sr-only">From</Label>
        <Input
          id="share-filter-from"
          type="date"
          aria-label="From"
          className="h-8 w-[8.75rem] text-xs"
          value={filters.dateFrom}
          onChange={(e) => update("dateFrom", e.target.value)}
        />
        <span className="text-xs text-muted-foreground" aria-hidden="true">–</span>
        <Label htmlFor="share-filter-to" className="sr-only">To</Label>
        <Input
          id="share-filter-to"
          type="date"
          aria-label="To"
          className="h-8 w-[8.75rem] text-xs"
          value={filters.dateTo}
          onChange={(e) => update("dateTo", e.target.value)}
        />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <ListFilterIcon className="h-3.5 w-3.5" />
            {tAdmin("common.filter")}
            {activeCount ? (
              <Badge variant="secondary" className="h-4 px-1 text-[10px] tabular-nums">
                {activeCount}
              </Badge>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(92vw,22rem)] space-y-3 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium">{tAdmin("layout.devtoolTools.utm.dimensionFilters")}</p>
            {activeCount ? (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() =>
                  setFilters({
                    ...filters,
                    source: "",
                    campaign: "",
                    medium: "",
                    entityType: "",
                    userId: "",
                  })
                }
              >
                {tAdmin("common.clearFilters")}
              </Button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DIMENSION_FILTERS.map((item) => (
              <div key={item.key} className={item.key === "userId" ? "col-span-2 space-y-1" : "space-y-1"}>
                <Label htmlFor={item.id} className="text-xs">{item.label}</Label>
                <Input
                  id={item.id}
                  className={item.mono ? "h-8 font-mono text-xs" : "h-8 text-xs"}
                  value={filters[item.key]}
                  onChange={(e) => update(item.key, e.target.value)}
                  placeholder={item.placeholder}
                />
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 cursor-pointer"
        onClick={onRefresh}
        disabled={isFetching}
        aria-label="Refresh"
      >
        {isFetching ? (
          <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCwIcon className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

export function RefPreview({ url }: { url: string }) {
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
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ZapIcon className="h-3.5 w-3.5" />
          Share URL preview
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 cursor-pointer px-2 text-xs transition-colors"
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

export function BuilderTab({ config }: { config: UtmShareConfig }) {
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
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-muted/20 px-4 py-2.5 [.border-b]:pb-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <LinkIcon className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">Link Builder</CardTitle>
            <CardDescription className="hidden truncate text-xs md:block">
              Configure entry point and platform to generate a compact attributed share URL.
            </CardDescription>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <Badge variant={hasShareRef ? "secondary" : "destructive"} className="text-xs">
            {hasShareRef ? "ref ready" : "missing ref"}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            {template?.entity_type ?? "entity"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 px-4 py-3 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Inputs */}
        <div className="min-w-0 space-y-3">
          <div className="grid gap-x-3 gap-y-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="share-builder-template" className="text-xs">Entry point</Label>
              <Select value={template?.template_key ?? ""} onValueChange={selectTemplate}>
                <SelectTrigger id="share-builder-template" className="h-8 w-full text-xs">
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
            <div className="space-y-1">
              <Label htmlFor="share-builder-platform" className="text-xs">Share action</Label>
              <Select value={platform?.platform_key ?? ""} onValueChange={setPlatformKey}>
                <SelectTrigger id="share-builder-platform" className="h-8 w-full text-xs">
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
            <div className="space-y-1">
              <Label htmlFor="share-builder-title" className="text-xs">Title</Label>
              <Input id="share-builder-title" className="h-8 text-xs" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="share-builder-text" className="text-xs">Text</Label>
              <Input id="share-builder-text" className="h-8 text-xs" value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="share-builder-destination" className="text-xs">Destination URL</Label>
              <Input
                id="share-builder-destination"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                className="h-8 font-mono text-xs"
              />
            </div>
          </div>
          <RefPreview url={shareUrl} />
        </div>

        {/* Output */}
        <div className="min-w-0 space-y-3 xl:border-l xl:pl-4">
          <div className="rounded-lg border bg-muted/10 px-3 py-2">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CheckCircle2Icon className="h-3.5 w-3.5" />
              Destination (no tracking noise)
            </div>
            <p className="break-all font-mono text-xs font-medium">{destinationPath}</p>
            <p className="break-all font-mono text-xs text-muted-foreground">{cleanDestinationUrl}</p>
          </div>

          <div className="rounded-lg border px-3 py-2">
            <p className="mb-1 text-xs font-medium">Decoded attribution fields</p>
            {refRows.length ? (
              <Table>
                <TableBody>
                  {refRows.map((row) => (
                    <TableRow key={row.key} className="transition-colors hover:bg-muted/30">
                      <TableCell className="w-36 py-1 font-mono text-xs text-muted-foreground">{row.key}</TableCell>
                      <TableCell className="break-all py-1 font-mono text-xs font-medium">{row.value}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="transition-colors hover:bg-muted/30">
                    <TableCell className="w-36 py-1 font-mono text-xs text-muted-foreground">share_method</TableCell>
                    <TableCell className="py-1 font-mono text-xs font-medium">{platform?.method ?? "unknown"}</TableCell>
                  </TableRow>
                  {platform?.method === "platform" ? (
                    <TableRow className="transition-colors hover:bg-muted/30">
                      <TableCell className="w-36 py-1 font-mono text-xs text-muted-foreground">share_platform</TableCell>
                      <TableCell className="py-1 font-mono text-xs font-medium">{platform.platform_key}</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            ) : (
              <Alert variant="destructive" className="mt-1 py-2">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle className="text-xs">Invalid ref</AlertTitle>
                <AlertDescription className="text-xs">Check destination URL and share action.</AlertDescription>
              </Alert>
            )}
          </div>

          {platform?.method === "platform" ? (
            <div className="rounded-lg border px-3 py-2">
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="text-xs font-medium">Platform intent URL</p>
                {intentUrl ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 cursor-pointer px-2 text-xs transition-colors"
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
        </div>
      </CardContent>
    </Card>
  );
}
