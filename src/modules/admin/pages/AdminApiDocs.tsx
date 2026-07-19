import { useState, useMemo, useCallback } from "react";
import { useTranslate } from "@refinedev/core";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { AdminPageHeader } from "../components/AdminPageHeader";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  SearchIcon,
  CodeIcon,
  PlayIcon,
  FilterIcon,
  CopyIcon,
  CheckIcon,
  GlobeIcon,
  HistoryIcon,
  ClockIcon,
  LockIcon,
  Loader2Icon,
  XIcon,
  ZapIcon,
} from "@/components/ui/icons";

import { useHaptics } from "@/hooks/use-haptics";

import { catalog, filterCatalog, getCatalogStats } from "../api-docs/catalog";
import { useApiExecution } from "../api-docs/use-api-execution";
import type {
  ApiCatalogEntry,
  ApiFilterState,
  ApiRiskLevel,
  ApiAuthLevel,
  ApiCallability,
  ApiEntryStatus,
  ApiExecutionResult,
  ApiExecutionHistoryEntry,
} from "../api-docs/types";
import { DEFAULT_FILTER_STATE } from "../api-docs/types";

type TranslateFn = ReturnType<typeof useTranslate>;

function resolveHttpBaseUrl(entryPath: string): string {
  const isSupabasePath =
    entryPath.startsWith("/functions/v1/") ||
    entryPath.startsWith("/rest/v1/") ||
    entryPath.startsWith("/storage/v1/");
  if (isSupabasePath) {
    return (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "<VITE_SUPABASE_URL>";
  }
  return typeof window !== "undefined" ? window.location.origin : "";
}

function generateCurlSnippet(entry: ApiCatalogEntry): string {
  if (entry.kind === "rpc") return "";
  const urlPath = entry.path ?? "";
  const base = resolveHttpBaseUrl(urlPath);
  const method = entry.method ?? "GET";
  const auth =
    entry.auth_level !== "public"
      ? ' \\\n  -H "Authorization: Bearer <your-token>"'
      : "";
  const apikey =
    urlPath.startsWith("/functions/v1/")
      ? ' \\\n  -H "apikey: <VITE_SUPABASE_ANON_KEY>"'
      : "";
  const body =
    method !== "GET"
      ? " \\\n  -H \"Content-Type: application/json\" \\\n  -d '{}'"
      : "";
  return `curl -X ${method} "${base}${urlPath}"${auth}${apikey}${body}`;
}

function generateFetchSnippet(entry: ApiCatalogEntry): string {
  if (entry.kind === "rpc") return "";
  const method = entry.method ?? "GET";
  const urlPath = entry.path ?? "";
  const base = resolveHttpBaseUrl(urlPath);
  const fullUrl = `${base}${urlPath}`;
  const needsAuth = entry.auth_level !== "public";
  const isFn = urlPath.startsWith("/functions/v1/");
  const headers: string[] = ["'Content-Type': 'application/json'"];
  if (needsAuth) headers.push("'Authorization': `Bearer ${session.access_token}`");
  if (isFn) headers.push("'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY");
  const body = method !== "GET" ? "  body: JSON.stringify({}),\n" : "";
  return `const resp = await fetch('${fullUrl}', {\n  method: '${method}',\n  headers: {\n    ${headers.join(",\n    ")},\n  },\n${body}});\nconst data = await resp.json();`;
}

function generateRpcSnippet(entry: ApiCatalogEntry): string {
  if (entry.kind !== "rpc") return "";
  const args =
    entry.params.length > 0
      ? "{\n  " +
        entry.params
          .map((p) => {
            const val =
              p.example !== undefined
                ? JSON.stringify(p.example)
                : p.default !== undefined
                  ? JSON.stringify(p.default)
                  : `<${p.type}>`;
            return `${p.name}: ${val}`;
          })
          .join(",\n  ") +
        "\n}"
      : "{}";
  return `const { data, error } = await supabase\n  .rpc('${entry.function_name}', ${args});\n\nif (error) console.error(error);\nconsole.log(data);`;
}

function riskColor(risk: ApiRiskLevel) {
  const map: Record<ApiRiskLevel, string> = {
    low: "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] border-[var(--status-success-bg)]",
    medium: "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] border-[var(--status-warning-bg)]",
    high: "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] border-[var(--status-warning-bg)]",
    critical: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return map[risk];
}

function authColor(auth: ApiAuthLevel) {
  const map: Record<ApiAuthLevel, string> = {
    public: "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] border-[var(--status-info-bg)]",
    authenticated: "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] border-[var(--status-info-bg)]",
    admin: "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] border-[var(--status-warning-bg)]",
    service_role: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return map[auth];
}

function statusColor(status: ApiEntryStatus) {
  const map: Record<ApiEntryStatus, string> = {
    active: "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)]",
    legacy: "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)]",
    unverified: "bg-muted text-muted-foreground",
  };
  return map[status];
}

function methodColor(method: string) {
  const map: Record<string, string> = {
    GET: "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)]",
    POST: "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)]",
    PUT: "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)]",
    PATCH: "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)]",
    DELETE: "bg-destructive/10 text-destructive",
  };
  return map[method] ?? "bg-muted text-muted-foreground";
}

function httpStatusColor(status: number) {
  if (status >= 200 && status < 300) return "text-[var(--status-success-foreground)]";
  if (status >= 400 && status < 500) return "text-[var(--status-warning-foreground)]";
  if (status >= 500) return "text-destructive";
  return "text-muted-foreground";
}

function callabilityIcon(callability: ApiCallability) {
  if (callability === "disabled") return <XIcon className="w-3 h-3" />;
  if (callability === "direct_rpc") return <ZapIcon className="w-3 h-3" />;
  if (callability === "proxy_admin") return <LockIcon className="w-3 h-3" />;
  return <GlobeIcon className="w-3 h-3" />;
}

function CopyButton({ text, ariaLabel }: { text: string; ariaLabel: string }) {
  const [copied, setCopied] = useState(false);
  const { tap } = useHaptics();
  const handleCopy = async () => {
    tap();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy} aria-label={ariaLabel}>
      {copied ? (
        <CheckIcon className="w-3 h-3 text-[var(--status-success-foreground)]" />
      ) : (
        <CopyIcon className="w-3 h-3" />
      )}
    </Button>
  );
}

function MethodBadge({ entry, large }: { entry: ApiCatalogEntry; large?: boolean }) {
  const sz = large ? "text-xs px-2 py-1" : "text-[10px] px-1.5 py-0.5";
  if (entry.kind === "rpc") {
    return (
      <span
        className={cn(
          "rounded font-mono font-bold uppercase bg-[var(--status-info-bg)] text-[var(--status-info-foreground)]",
          sz
        )}
      >
        RPC
      </span>
    );
  }
  return (
    <span className={cn("rounded font-mono font-bold uppercase", methodColor(entry.method ?? "GET"), sz)}>
      {entry.method ?? "GET"}
    </span>
  );
}

function RiskBadge({ risk, t }: { risk: ApiRiskLevel; t: TranslateFn }) {
  return (
    <span className={cn("rounded border text-[10px] px-1.5 py-0.5 font-medium", riskColor(risk))}>
      {t(`adminApiDocs.badges.${risk}`)}
    </span>
  );
}

function AuthBadge({ auth, t }: { auth: ApiAuthLevel; t: TranslateFn }) {
  return (
    <span className={cn("rounded border text-[10px] px-1.5 py-0.5 font-medium", authColor(auth))}>
      {t(`adminApiDocs.badges.${auth}`)}
    </span>
  );
}

function EntryRow({
  entry,
  isSelected,
  onSelect,
  t,
}: {
  entry: ApiCatalogEntry;
  isSelected: boolean;
  onSelect: () => void;
  t: TranslateFn;
}) {
  const { tap } = useHaptics();
  return (
    <button
      type="button"
      onClick={() => {
        tap();
        onSelect();
      }}
      style={{ contentVisibility: "auto", containIntrinsicSize: "120px" }}
      className={cn(
        "w-full text-left px-3 py-2.5 flex items-start gap-2 border-b border-border/30",
        "hover:bg-accent transition-colors duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
        isSelected && "bg-primary/8 border-l-2 border-l-primary"
      )}
    >
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <MethodBadge entry={entry} />
          <span className="text-xs font-mono text-foreground font-medium truncate">
            {entry.kind === "http" ? (entry.path ?? entry.name) : entry.function_name}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground truncate leading-snug">{entry.summary}</span>
        <div className="flex items-center gap-1 flex-wrap">
          <RiskBadge risk={entry.risk} t={t} />
          <AuthBadge auth={entry.auth_level} t={t} />
          {entry.status !== "active" && (
            <span className={cn("rounded text-[10px] px-1.5 py-0.5", statusColor(entry.status))}>
              {t(`adminApiDocs.badges.${entry.status}`)}
            </span>
          )}
          {!entry.used_in_code && (
            <span className="rounded text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground">
              {t("adminApiDocs.discovered")}
            </span>
          )}
          {entry.callability === "disabled" && (
            <span className="rounded text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground">
              {t("adminApiDocs.badges.disabled")}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

interface CatalogPanelProps {
  entries: ApiCatalogEntry[];
  filters: ApiFilterState;
  onFiltersChange: (f: ApiFilterState) => void;
  selectedId: string | null;
  onSelect: (e: ApiCatalogEntry) => void;
  totalCount: number;
}

function CatalogPanel({
  entries,
  filters,
  onFiltersChange,
  selectedId,
  onSelect,
  totalCount,
}: CatalogPanelProps) {
  const t = useTranslate();
  const { tap } = useHaptics();

  const setFilter = useCallback(
    <K extends keyof ApiFilterState>(key: K, val: ApiFilterState[K]) =>
      onFiltersChange({ ...filters, [key]: val }),
    [filters, onFiltersChange]
  );

  const hasActiveFilters =
    filters.kind !== "all" ||
    filters.status !== "all" ||
    filters.auth !== "all" ||
    filters.risk !== "all" ||
    filters.callable !== "all";

  return (
    <div className="w-72 shrink-0 flex flex-col h-full min-h-0 border rounded-xl bg-card overflow-hidden">
      <div className="p-3 border-b">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("adminApiDocs.searchPlaceholder")}
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {filters.search && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                tap();
                setFilter("search", "");
              }}
              aria-label={t("adminApiDocs.clearSearch")}
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 py-2 border-b flex items-center gap-2 flex-wrap">
        <Select
          value={filters.kind}
          onValueChange={(v) => {
            tap();
            setFilter("kind", v as ApiFilterState["kind"]);
          }}
        >
          <SelectTrigger className="h-7 text-xs w-[80px]">
            <SelectValue placeholder={t("adminApiDocs.filters.kind")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("adminApiDocs.filters.allKinds")}</SelectItem>
            <SelectItem value="http">HTTP</SelectItem>
            <SelectItem value="rpc">RPC</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.risk}
          onValueChange={(v) => {
            tap();
            setFilter("risk", v as ApiFilterState["risk"]);
          }}
        >
          <SelectTrigger className="h-7 text-xs w-[80px]">
            <SelectValue placeholder={t("adminApiDocs.filters.risk")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("adminApiDocs.filters.allRisks")}</SelectItem>
            <SelectItem value="low">{t("adminApiDocs.badges.low")}</SelectItem>
            <SelectItem value="medium">{t("adminApiDocs.badges.medium")}</SelectItem>
            <SelectItem value="high">{t("adminApiDocs.badges.high")}</SelectItem>
            <SelectItem value="critical">{t("adminApiDocs.badges.critical")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(v) => {
            tap();
            setFilter("status", v as ApiFilterState["status"]);
          }}
        >
          <SelectTrigger className="h-7 text-xs w-[90px]">
            <SelectValue placeholder={t("adminApiDocs.filters.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("adminApiDocs.filters.allStatus")}</SelectItem>
            <SelectItem value="active">{t("adminApiDocs.badges.active")}</SelectItem>
            <SelectItem value="legacy">{t("adminApiDocs.badges.legacy")}</SelectItem>
            <SelectItem value="unverified">{t("adminApiDocs.badges.unverified")}</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => {
              tap();
              onFiltersChange({
                ...DEFAULT_FILTER_STATE,
                showAll: filters.showAll,
                usedInCode: filters.showAll ? "all" : true,
                search: filters.search,
              });
            }}
          >
            <XIcon className="w-3 h-3 mr-1" />
            {t("adminApiDocs.filters.clear")}
          </Button>
        )}
      </div>

      <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {t("adminApiDocs.endpointsCount", { filtered: entries.length, total: totalCount })}
        </span>
        <button
          type="button"
          onClick={() => {
            tap();
            onFiltersChange({
              ...filters,
              showAll: !filters.showAll,
              usedInCode: !filters.showAll ? "all" : true,
            });
          }}
          className={cn(
            "flex items-center gap-1.5 text-[11px] rounded-full px-2.5 py-1 border transition-colors",
            filters.showAll
              ? "bg-primary/10 text-primary border-primary/20"
              : "text-muted-foreground border-border hover:bg-accent"
          )}
        >
          <FilterIcon className="w-3 h-3" />
          {filters.showAll ? t("adminApiDocs.allApis") : t("adminApiDocs.inUseOnly")}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {entries.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">{t("adminApiDocs.empty.noResults")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("adminApiDocs.empty.noResultsDesc")}</p>
          </div>
        ) : (
          entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              isSelected={selectedId === entry.id}
              onSelect={() => onSelect(entry)}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
}

function OverviewTab({ entry }: { entry: ApiCatalogEntry }) {
  const t = useTranslate();
  return (
    <div className="space-y-6">
      {entry.description && (
        <section>
          <h3 className="typography-card-title mb-2">{t("adminApiDocs.entry.description")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{entry.description}</p>
        </section>
      )}

      <section>
        <h3 className="typography-card-title mb-3">{t("adminApiDocs.entry.parameters")}</h3>
        {entry.params.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("adminApiDocs.entry.noParams")}</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs w-[140px]">{t("adminApiDocs.entry.paramName")}</TableHead>
                  <TableHead className="text-xs w-[100px]">{t("adminApiDocs.entry.paramType")}</TableHead>
                  <TableHead className="text-xs w-[80px]">{t("adminApiDocs.entry.paramRequired")}</TableHead>
                  <TableHead className="text-xs w-[100px]">{t("adminApiDocs.entry.paramDefault")}</TableHead>
                  <TableHead className="text-xs">{t("adminApiDocs.entry.paramDescription")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.params.map((p) => (
                  <TableRow key={p.name} className="text-xs">
                    <TableCell className="font-mono font-medium">{p.name}</TableCell>
                    <TableCell>
                      <span className="bg-muted rounded px-1.5 py-0.5 font-mono">{p.type}</span>
                    </TableCell>
                    <TableCell>
                      {p.required ? (
                        <span className="text-destructive font-medium">{t("adminApiDocs.yes")}</span>
                      ) : (
                        <span className="text-muted-foreground">{t("adminApiDocs.no")}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {p.default !== undefined ? String(p.default) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.description ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {entry.response_examples.length > 0 && (
        <section>
          <h3 className="typography-card-title mb-3">{t("adminApiDocs.entry.responses")}</h3>
          <div className="space-y-3">
            {entry.response_examples.map((ex) => (
              <div key={`${ex.status}-${ex.description ?? JSON.stringify(ex.body)}`} className="rounded-lg border overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b">
                  <span className={cn("font-mono text-xs font-bold", httpStatusColor(ex.status))}>
                    {ex.status}
                  </span>
                  {ex.description && (
                    <span className="text-xs text-muted-foreground">{ex.description}</span>
                  )}
                </div>
                <pre className="p-3 text-xs font-mono overflow-x-auto bg-background/50 text-foreground/80">
                  {JSON.stringify(ex.body, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="typography-card-title mb-2">{t("adminApiDocs.entry.sourceFiles")}</h3>
        <div className="space-y-1">
          {entry.source_files.map((f) => (
            <div key={f} className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <CodeIcon className="w-3.5 h-3.5 shrink-0" />
              {f}
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-2 flex-wrap">
          {entry.provenance.map((p) => (
            <Badge key={p} variant="outline" className="text-[10px]">
              {p}
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const t = useTranslate();
  return (
    <div className="relative rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b">
        <span className="text-xs font-mono text-muted-foreground">{language}</span>
        <CopyButton text={code} ariaLabel={t("adminApiDocs.copyToClipboard")} />
      </div>
      <pre className="p-3 text-xs font-mono overflow-x-auto bg-background/50 text-foreground/80 leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

function SnippetsTab({ entry }: { entry: ApiCatalogEntry }) {
  const t = useTranslate();
  const curlSnippet = generateCurlSnippet(entry);
  const fetchSnippet = generateFetchSnippet(entry);
  const rpcSnippet = generateRpcSnippet(entry);

  return (
    <div className="space-y-4">
      {entry.kind === "http" && (
        <>
          <div>
            <h3 className="typography-card-title mb-2">{t("adminApiDocs.entry.snippetCurl")}</h3>
            <CodeBlock code={curlSnippet} language="bash" />
          </div>
          <div>
            <h3 className="typography-card-title mb-2">{t("adminApiDocs.entry.snippetFetch")}</h3>
            <CodeBlock code={fetchSnippet} language="javascript" />
          </div>
        </>
      )}
      {entry.kind === "rpc" && (
        <div>
          <h3 className="typography-card-title mb-2">{t("adminApiDocs.entry.snippetRpc")}</h3>
          <CodeBlock code={rpcSnippet} language="typescript" />
        </div>
      )}
    </div>
  );
}

interface KVFieldRow {
  id: string;
  key: string;
  value: string;
  required?: boolean;
  description?: string;
}

interface KVEditorProps {
  label: string;
  rows: KVFieldRow[];
  onChange: (rows: KVFieldRow[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
  emptyHint: string;
  addLabel: string;
  removeLabel: string;
  requiredLabel: string;
  requiredParamTitle: string;
}

function createKVFieldRow(partial?: Partial<KVFieldRow>): KVFieldRow {
  return {
    id: crypto.randomUUID(),
    key: "",
    value: "",
    ...partial,
  };
}

function exampleValue(p: ApiCatalogEntry["params"][number]): unknown {
  if (p.example !== undefined) return p.example;
  if (p.default !== undefined) return p.default;
  return "";
}

function buildInitialRpcArgs(entry: ApiCatalogEntry): string {
  if (entry.params.length === 0) return "{}";
  return JSON.stringify(
    Object.fromEntries(entry.params.map((p) => [p.name, exampleValue(p)])),
    null,
    2
  );
}

function buildInitialQueryRows(entry: ApiCatalogEntry): KVFieldRow[] {
  if (entry.kind !== "http" || entry.params.length === 0) return [];
  return entry.params.map((p) =>
    createKVFieldRow({
      key: p.name,
      value: String(exampleValue(p) ?? ""),
      required: p.required,
      description: p.description,
    })
  );
}

function buildInitialBody(entry: ApiCatalogEntry): string {
  if (entry.request_body_schema && Object.keys(entry.request_body_schema).length > 0) {
    return JSON.stringify(entry.request_body_schema, null, 2);
  }
  if (entry.response_examples[0]?.body && typeof entry.response_examples[0].body === "object") {
    // Prefer empty object for body; examples are responses not requests
  }
  return "{}";
}

function rowsToRecord(rows: KVFieldRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    out[key] = row.value;
  }
  return out;
}

function KVEditor({
  label,
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  emptyHint,
  addLabel,
  removeLabel,
  requiredLabel,
  requiredParamTitle,
}: KVEditorProps) {
  const { tap } = useHaptics();
  const update = (id: string, patch: Partial<KVFieldRow>) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const remove = (id: string) => {
    onChange(rows.filter((row) => row.id !== id));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => {
            tap();
            onChange([...rows, createKVFieldRow()]);
          }}
        >
          {addLabel}
        </Button>
      </div>
      {rows.length === 0 && (
        <div className="rounded-md border border-dashed px-2.5 py-2 text-[11px] text-muted-foreground">
          {emptyHint}
        </div>
      )}
      {rows.map((row) => (
        <div key={row.id} className="space-y-1">
          <div className="flex gap-1.5 items-center">
            <Input
              name={`${label.replace(/\s+/g, "-").toLowerCase()}-key-${row.id}`}
              aria-label={`${label} key`}
              placeholder={keyPlaceholder}
              value={row.key}
              onChange={(e) => update(row.id, { key: e.target.value })}
              className="h-8 text-xs font-mono flex-1"
              autoComplete="off"
            />
            <Input
              name={`${label.replace(/\s+/g, "-").toLowerCase()}-value-${row.id}`}
              aria-label={`${label} value`}
              placeholder={valuePlaceholder}
              value={row.value}
              onChange={(e) => update(row.id, { value: e.target.value })}
              className="h-8 text-xs font-mono flex-1"
              autoComplete="off"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                tap();
                remove(row.id);
              }}
              aria-label={removeLabel}
              disabled={row.required}
              title={row.required ? requiredParamTitle : removeLabel}
            >
              <XIcon className="w-3.5 h-3.5" />
            </Button>
          </div>
          {(row.required || row.description) && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {row.required && <span className="text-destructive font-medium">{requiredLabel}</span>}
              {row.description && <span className="truncate">{row.description}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RequestGuide({ entry }: { entry: ApiCatalogEntry }) {
  const t = useTranslate();
  const method = entry.kind === "http" ? entry.method ?? "GET" : "RPC";
  const target = entry.kind === "http" ? entry.path ?? "—" : entry.function_name ?? "—";

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("adminApiDocs.guide.title")}
        </h4>
        <span className="text-[11px] text-muted-foreground">{entry.callability}</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border bg-background/70 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t("adminApiDocs.guide.methodTransport")}
          </p>
          <p className="text-xs font-mono mt-0.5">
            {method} · {entry.kind.toUpperCase()}
          </p>
        </div>
        <div className="rounded-md border bg-background/70 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t("adminApiDocs.guide.target")}
          </p>
          <p className="text-xs font-mono mt-0.5 break-all">{target}</p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {entry.callability === "proxy_admin" && t("adminApiDocs.guide.proxy")}
        {entry.callability === "direct_http" && t("adminApiDocs.guide.directHttp")}
        {entry.callability === "direct_rpc" && t("adminApiDocs.guide.directRpc")}
      </p>

      {entry.auth_level !== "public" && (
        <p className="text-[11px] text-muted-foreground">{t("adminApiDocs.guide.authAuto")}</p>
      )}

      {entry.params.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">
            {t("adminApiDocs.guide.knownParams")}
          </p>
          <div className="space-y-1">
            {entry.params.map((param) => (
              <div
                key={param.name}
                className="rounded-md border bg-background/70 px-2 py-1.5 flex items-start gap-2"
              >
                <span className="text-xs font-mono font-medium">{param.name}</span>
                <span className="text-[11px] text-muted-foreground">{param.type}</span>
                {param.required && (
                  <span className="text-[10px] text-destructive font-medium">
                    {t("adminApiDocs.guide.required")}
                  </span>
                )}
                {param.description && (
                  <span className="text-[11px] text-muted-foreground truncate">{param.description}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResponseViewer({ result }: { result: ApiExecutionResult }) {
  const t = useTranslate();
  const [copied, setCopied] = useState(false);
  const { tap } = useHaptics();
  const json = JSON.stringify(result.data, null, 2) ?? "";

  const handleCopy = async () => {
    tap();
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b">
        <div className="flex items-center gap-3">
          <span className={cn("text-xs font-mono font-bold", httpStatusColor(result.status))}>
            {result.status || "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            <ClockIcon className="w-3 h-3 inline mr-1" />
            {t("adminApiDocs.execute.duration", { ms: result.duration_ms })}
          </span>
          {result.success ? (
            <span className="text-xs text-[var(--status-success-foreground)] font-medium">
              {t("adminApiDocs.execute.ok")}
            </span>
          ) : (
            <span className="text-xs text-destructive font-medium">{t("adminApiDocs.execute.error")}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCopy}
          aria-label={t("adminApiDocs.copyResponse")}
        >
          {copied ? (
            <CheckIcon className="w-3 h-3 text-[var(--status-success-foreground)]" />
          ) : (
            <CopyIcon className="w-3 h-3" />
          )}
        </Button>
      </div>
      {result.error && (
        <div className="px-3 py-2 bg-destructive/5 border-b text-xs text-destructive font-medium">
          {result.error}
        </div>
      )}
      {result.data !== undefined && (
        <pre className="p-3 text-xs font-mono overflow-x-auto max-h-80 bg-background/50 text-foreground/80 leading-relaxed">
          {json}
        </pre>
      )}
    </div>
  );
}

function HistoryPanel({ history }: { history: ApiExecutionHistoryEntry[] }) {
  const t = useTranslate();
  if (history.length === 0) {
    return <p className="text-xs text-muted-foreground py-3">{t("adminApiDocs.execute.noHistory")}</p>;
  }
  return (
    <div className="space-y-1.5">
      {history.map((h) => (
        <div
          key={h.id}
          className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border bg-muted/20"
        >
          <span className={cn("font-mono font-bold shrink-0", httpStatusColor(h.result.status))}>
            {h.result.status || "ERR"}
          </span>
          <span className="font-mono truncate text-muted-foreground flex-1">{h.operation_id}</span>
          <span className="text-muted-foreground shrink-0">{h.result.duration_ms}ms</span>
        </div>
      ))}
    </div>
  );
}

const NEEDS_MUTATION_MODE: ApiRiskLevel[] = ["high", "critical"];

function ExecutionTab({ entry }: { entry: ApiCatalogEntry }) {
  const t = useTranslate();
  const { execute, cancel, clearResult, result, isLoading, history } = useApiExecution();
  const [mutationModeEnabled, setMutationModeEnabled] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const { tap, warning } = useHaptics();

  const [rpcArgsText, setRpcArgsText] = useState(() => buildInitialRpcArgs(entry));
  const [rpcArgsError, setRpcArgsError] = useState<string | null>(null);
  const [httpInputError, setHttpInputError] = useState<string | null>(null);

  const [queryRows, setQueryRows] = useState<KVFieldRow[]>(() => buildInitialQueryRows(entry));
  const [headerRows, setHeaderRows] = useState<KVFieldRow[]>([]);
  const [bodyText, setBodyText] = useState(() => buildInitialBody(entry));

  const isMutating = NEEDS_MUTATION_MODE.includes(entry.risk);

  const fillExample = useCallback(() => {
    tap();
    setRpcArgsText(buildInitialRpcArgs(entry));
    setQueryRows(buildInitialQueryRows(entry));
    setBodyText(buildInitialBody(entry));
    setRpcArgsError(null);
    setHttpInputError(null);
  }, [entry, tap]);

  const doExecute = useCallback(() => {
    if (entry.kind === "rpc") {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(rpcArgsText);
        setRpcArgsError(null);
      } catch {
        setRpcArgsError(t("adminApiDocs.execute.invalidJsonArgs"));
        return;
      }

      const missingRequired = entry.params.reduce<string[]>((acc, p) => {
        if (p.required) {
          const value = args[p.name];
          if (value == null || (typeof value === "string" && value.trim() === "")) {
            acc.push(p.name);
          }
        }
        return acc;
      }, []);
      if (missingRequired.length > 0) {
        setRpcArgsError(
          t("adminApiDocs.execute.missingRequiredRpc", { fields: missingRequired.join(", ") })
        );
        return;
      }

      execute(entry, { rpc_args: args });
    } else {
      const requiredQueryKeys = entry.params.reduce<string[]>((acc, p) => {
        if (p.required) acc.push(p.name);
        return acc;
      }, []);
      const query = rowsToRecord(queryRows);
      const missingRequired = requiredQueryKeys.filter((key) => {
        const value = query[key];
        return value == null || value.trim() === "";
      });
      if (missingRequired.length > 0) {
        setHttpInputError(
          t("adminApiDocs.execute.missingRequiredQuery", { fields: missingRequired.join(", ") })
        );
        return;
      }

      let body: unknown = undefined;
      if (entry.method !== "GET" && bodyText.trim() !== "{}") {
        try {
          body = JSON.parse(bodyText);
        } catch {
          setHttpInputError(t("adminApiDocs.execute.invalidJsonBody"));
          return;
        }
      }

      setHttpInputError(null);
      const headers = rowsToRecord(headerRows);
      execute(entry, {
        target: entry.path ?? "",
        query: Object.keys(query).length > 0 ? query : undefined,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        body,
      });
    }
  }, [entry, rpcArgsText, queryRows, headerRows, bodyText, t, execute]);

  const handleRun = useCallback(() => {
    tap();
    if (isMutating && !mutationModeEnabled) return;
    if (isMutating) {
      setConfirmPhrase("");
      setConfirmOpen(true);
      return;
    }
    doExecute();
  }, [isMutating, mutationModeEnabled, doExecute, tap]);

  if (entry.callability === "disabled") {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center">
        <XIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">{t("adminApiDocs.entry.disabled")}</p>
        <p className="text-xs text-muted-foreground mt-1">{t("adminApiDocs.entry.disabledHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isMutating && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2.5 flex items-center gap-2 text-xs",
            mutationModeEnabled
              ? "border-destructive/30 bg-destructive/5"
              : "border-[var(--status-warning-bg)] bg-[var(--status-warning-bg)]"
          )}
        >
          <LockIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-muted-foreground">
            {mutationModeEnabled
              ? t("adminApiDocs.execute.mutationEnabled")
              : t("adminApiDocs.execute.mutationDisabled")}
          </span>
          <Button
            variant={mutationModeEnabled ? "destructive" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              tap();
              setMutationModeEnabled((v) => !v);
            }}
          >
            {mutationModeEnabled
              ? t("adminApiDocs.execute.disableMutationMode")
              : t("adminApiDocs.execute.enableMutationMode")}
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {callabilityIcon(entry.callability)}
        <span>
          {entry.callability === "direct_rpc" && t("adminApiDocs.execute.transportDirectRpc")}
          {entry.callability === "direct_http" && t("adminApiDocs.execute.transportDirectHttp")}
          {entry.callability === "proxy_admin" && t("adminApiDocs.execute.transportProxy")}
        </span>
      </div>

      <RequestGuide entry={entry} />

      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={fillExample}>
          {t("adminApiDocs.execute.fillExample")}
        </Button>
      </div>

      {entry.kind === "rpc" ? (
        <div className="space-y-2">
          <label htmlFor="admin-rpc-args" className="text-xs font-medium text-muted-foreground">
            {t("adminApiDocs.execute.rpcArgs")}
          </label>
          <textarea
            id="admin-rpc-args"
            name="rpc-args"
            aria-label={t("adminApiDocs.execute.rpcArgs")}
            value={rpcArgsText}
            onChange={(e) => {
              setRpcArgsText(e.target.value);
              setRpcArgsError(null);
            }}
            className="w-full h-36 rounded-lg border bg-background font-mono text-xs p-3 resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder={t("adminApiDocs.execute.rpcArgsPlaceholder")}
            autoComplete="off"
          />
          {rpcArgsError && <p className="text-xs text-destructive">{rpcArgsError}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <KVEditor
            label={t("adminApiDocs.execute.queryParams")}
            rows={queryRows}
            onChange={setQueryRows}
            keyPlaceholder={t("adminApiDocs.execute.keyPlaceholder")}
            valuePlaceholder={t("adminApiDocs.execute.valuePlaceholder")}
            emptyHint={t("adminApiDocs.execute.emptyQueryHint")}
            addLabel={t("adminApiDocs.execute.addRow")}
            removeLabel={t("adminApiDocs.execute.removeRow")}
            requiredLabel={t("adminApiDocs.execute.required")}
            requiredParamTitle={t("adminApiDocs.execute.requiredParam")}
          />
          <KVEditor
            label={t("adminApiDocs.execute.headers")}
            rows={headerRows}
            onChange={setHeaderRows}
            keyPlaceholder={t("adminApiDocs.execute.headerNamePlaceholder")}
            valuePlaceholder={t("adminApiDocs.execute.valuePlaceholder")}
            emptyHint={t("adminApiDocs.execute.emptyHeaderHint")}
            addLabel={t("adminApiDocs.execute.addRow")}
            removeLabel={t("adminApiDocs.execute.removeRow")}
            requiredLabel={t("adminApiDocs.execute.required")}
            requiredParamTitle={t("adminApiDocs.execute.requiredParam")}
          />
          {entry.method !== "GET" && (
            <div className="space-y-2">
              <label htmlFor="admin-request-body" className="text-xs font-medium text-muted-foreground">
                {t("adminApiDocs.execute.body")}
              </label>
              <textarea
                id="admin-request-body"
                name="request-body"
                aria-label={t("adminApiDocs.execute.body")}
                value={bodyText}
                onChange={(e) => {
                  setBodyText(e.target.value);
                  setHttpInputError(null);
                }}
                className="w-full h-24 rounded-lg border bg-background font-mono text-xs p-3 resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder={t("adminApiDocs.execute.bodyPlaceholder")}
                autoComplete="off"
              />
            </div>
          )}
          {httpInputError && <p className="text-xs text-destructive">{httpInputError}</p>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          onClick={handleRun}
          disabled={isLoading || (isMutating && !mutationModeEnabled)}
          className="min-w-[100px]"
        >
          {isLoading ? (
            <>
              <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
              {t("adminApiDocs.execute.running")}
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4 mr-2" />
              {t("adminApiDocs.execute.run")}
            </>
          )}
        </Button>
        {isLoading && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              tap();
              cancel();
            }}
          >
            {t("adminApiDocs.execute.cancel")}
          </Button>
        )}
        {result && !isLoading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              tap();
              clearResult();
            }}
          >
            <XIcon className="w-3.5 h-3.5 mr-1" />
            {t("adminApiDocs.execute.clearResponse")}
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {result && !isLoading && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            {t("adminApiDocs.execute.response")}
          </h4>
          <ResponseViewer result={result} />
        </div>
      )}

      {history.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <HistoryIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <h4 className="text-xs font-medium text-muted-foreground">
              {t("adminApiDocs.execute.history")}
            </h4>
          </div>
          <HistoryPanel history={history} />
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adminApiDocs.execute.confirmMutation")}</DialogTitle>
            <DialogDescription>
              {t("adminApiDocs.execute.confirmMutationDesc", { risk: entry.risk })}
            </DialogDescription>
          </DialogHeader>
          <Input
            name="confirm-execute"
            value={confirmPhrase}
            onChange={(e) => setConfirmPhrase(e.target.value)}
            placeholder={t("adminApiDocs.execute.confirmPlaceholder")}
            className="font-mono"
            autoFocus
            autoComplete="off"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                tap();
                setConfirmOpen(false);
              }}
            >
              {t("adminApiDocs.execute.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={confirmPhrase !== t("adminApiDocs.execute.confirmPhrase")}
              onClick={() => {
                warning();
                setConfirmOpen(false);
                doExecute();
              }}
            >
              {t("adminApiDocs.execute.confirmExecute")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EntryDetailPanel({ entry }: { entry: ApiCatalogEntry }) {
  const t = useTranslate();
  const [tab, setTab] = useState("overview");
  const { tap } = useHaptics();

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="border-b pb-3 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <MethodBadge entry={entry} large />
              <span className="font-mono text-sm font-semibold truncate">
                {entry.kind === "http" ? entry.path : entry.function_name}
              </span>
            </div>
            <CardTitle className="text-base leading-snug">{entry.name}</CardTitle>
            <p className="text-sm text-muted-foreground leading-snug">{entry.summary}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div
              className={cn(
                "flex items-center gap-1 rounded border text-[10px] px-1.5 py-0.5",
                riskColor(entry.risk)
              )}
            >
              {t("adminApiDocs.riskLabel", { risk: t(`adminApiDocs.badges.${entry.risk}`) })}
            </div>
            <div
              className={cn(
                "rounded border text-[10px] px-1.5 py-0.5",
                authColor(entry.auth_level)
              )}
            >
              {t(`adminApiDocs.badges.${entry.auth_level}`)}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
              {callabilityIcon(entry.callability)}
              <span>{t(`adminApiDocs.badges.${entry.callability}`)}</span>
            </div>
          </div>
        </div>
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {entry.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] h-5 px-2">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          tap();
          setTab(v);
        }}
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        <TabsList className="shrink-0 mx-4 mt-3 justify-start h-9 w-fit">
          <TabsTrigger value="overview" className="text-xs">
            {t("adminApiDocs.overview")}
          </TabsTrigger>
          <TabsTrigger value="snippets" className="text-xs">
            {t("adminApiDocs.snippets")}
          </TabsTrigger>
          <TabsTrigger value="try" className="text-xs">
            <PlayIcon className="w-3 h-3 mr-1.5" />
            {t("adminApiDocs.entry.tryItOut")}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 min-h-0">
          <TabsContent value="overview" className="p-4 mt-0">
            <OverviewTab entry={entry} />
          </TabsContent>
          <TabsContent value="snippets" className="p-4 mt-0">
            <SnippetsTab entry={entry} />
          </TabsContent>
          <TabsContent value="try" className="p-4 mt-0">
            <ExecutionTab key={entry.id} entry={entry} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </Card>
  );
}

function EmptySelectionState() {
  const t = useTranslate();
  return (
    <Card className="h-full flex items-center justify-center">
      <CardContent className="text-center py-12">
        <CodeIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
        <p className="text-base font-medium text-muted-foreground">
          {t("adminApiDocs.empty.selectEntry")}
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          {t("adminApiDocs.empty.selectEntryDesc")}
        </p>
      </CardContent>
    </Card>
  );
}

export function AdminApiDocs({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslate();
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<ApiFilterState>(DEFAULT_FILTER_STATE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filteredEntries = useMemo(() => filterCatalog(catalog, filters), [filters]);
  const selectedEntry = useMemo(
    () => (selectedId ? (catalog.find((e) => e.id === selectedId) ?? null) : null),
    [selectedId]
  );
  const stats = useMemo(() => getCatalogStats(catalog), []);

  const { tap } = useHaptics();

  const handleSelect = useCallback(
    (entry: ApiCatalogEntry) => {
      tap();
      setSelectedId(entry.id);
      if (isMobile) setSheetOpen(false);
    },
    [isMobile, tap]
  );

  return (
    <div
      className={
        embedded ? "space-y-4" : "container max-w-7xl space-y-4 px-2 py-4 md:px-4 md:py-6"
      }
    >
      <AdminPageHeader
        title={t("adminApiDocs.title")}
        description={t("adminApiDocs.headerDescription", {
          total: stats.total,
          http: stats.http,
          rpc: stats.rpc,
          usedInCode: stats.usedInCode,
        })}
        density={embedded ? "section" : "page"}
        actions={
          isMobile ? (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => tap()}>
                  <FilterIcon className="w-4 h-4 mr-2" />
                  {t("adminApiDocs.browse")}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0">
                <SheetHeader className="p-3 border-b">
                  <SheetTitle className="text-sm">{t("adminApiDocs.endpointsSheetTitle")}</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-[calc(100vh-60px)]">
                  <CatalogPanel
                    entries={filteredEntries}
                    filters={filters}
                    onFiltersChange={setFilters}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    totalCount={stats.total}
                  />
                </div>
              </SheetContent>
            </Sheet>
          ) : undefined
        }
      />

      <div className="flex gap-4 min-h-0" style={{ height: "calc(100dvh - 11rem)" }}>
        {!isMobile && (
          <CatalogPanel
            entries={filteredEntries}
            filters={filters}
            onFiltersChange={setFilters}
            selectedId={selectedId}
            onSelect={handleSelect}
            totalCount={stats.total}
          />
        )}

        <div className="flex-1 min-h-0 overflow-hidden">
          {selectedEntry ? (
            <EntryDetailPanel key={selectedEntry.id} entry={selectedEntry} />
          ) : (
            <EmptySelectionState />
          )}
        </div>
      </div>
    </div>
  );
}
