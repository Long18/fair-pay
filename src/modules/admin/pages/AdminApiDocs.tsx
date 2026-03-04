import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslate } from "@refinedev/core";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/ui/use-mobile";

// UI primitives
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

// Icons
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
  ChevronDownIcon,
  RefreshCwIcon,
} from "@/components/ui/icons";

// Catalog
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

// ─── Snippet generators ───────────────────────────────────────────────────────

function generateCurlSnippet(entry: ApiCatalogEntry): string {
  if (entry.kind === "rpc") return "";
  const url = entry.path ?? "";
  const method = entry.method ?? "GET";
  const auth =
    entry.auth_level !== "public"
      ? ' \\\n  -H "Authorization: Bearer <your-token>"'
      : "";
  const body =
    method !== "GET" ? ' \\\n  -H "Content-Type: application/json" \\\n  -d \'{}\'': "";
  return `curl -X ${method} "https://yourapp.vercel.app${url}"${auth}${body}`;
}

function generateFetchSnippet(entry: ApiCatalogEntry): string {
  if (entry.kind === "rpc") return "";
  const method = entry.method ?? "GET";
  const auth =
    entry.auth_level !== "public"
      ? "  headers: {\n    'Authorization': `Bearer ${session.access_token}`,\n    'Content-Type': 'application/json',\n  },"
      : "  headers: { 'Content-Type': 'application/json' },";
  const body = method !== "GET" ? "  body: JSON.stringify({}),\n" : "";
  return `const resp = await fetch('${entry.path}', {\n  method: '${method}',\n${auth}\n${body}});\nconst data = await resp.json();`;
}

function generateRpcSnippet(entry: ApiCatalogEntry): string {
  if (entry.kind !== "rpc") return "";
  const args =
    entry.params.length > 0
      ? "{\n  " +
        entry.params.map((p) => `${p.name}: <${p.type}>`).join(",\n  ") +
        "\n}"
      : "{}";
  return `const { data, error } = await supabase\n  .rpc('${entry.function_name}', ${args});\n\nif (error) console.error(error);\nconsole.log(data);`;
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function riskColor(risk: ApiRiskLevel) {
  const map: Record<ApiRiskLevel, string> = {
    low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    high: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    critical: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return map[risk];
}

function authColor(auth: ApiAuthLevel) {
  const map: Record<ApiAuthLevel, string> = {
    public: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    authenticated: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
    admin: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    service_role: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return map[auth];
}

function statusColor(status: ApiEntryStatus) {
  const map: Record<ApiEntryStatus, string> = {
    active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    legacy: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    unverified: "bg-muted text-muted-foreground",
  };
  return map[status];
}

function methodColor(method: string) {
  const map: Record<string, string> = {
    GET: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    POST: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    PUT: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    PATCH: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    DELETE: "bg-destructive/10 text-destructive",
  };
  return map[method] ?? "bg-muted text-muted-foreground";
}

function callabilityIcon(callability: ApiCallability) {
  if (callability === "disabled") return <XIcon className="w-3 h-3" />;
  if (callability === "proxy_admin") return <LockIcon className="w-3 h-3" />;
  if (callability === "direct_rpc") return <ZapIcon className="w-3 h-3" />;
  return <GlobeIcon className="w-3 h-3" />;
}

function httpStatusColor(status: number) {
  if (status >= 200 && status < 300) return "text-emerald-600 dark:text-emerald-400";
  if (status >= 400 && status < 500) return "text-amber-600 dark:text-amber-400";
  if (status >= 500) return "text-destructive";
  return "text-muted-foreground";
}

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={handleCopy}
      aria-label="Copy to clipboard"
    >
      {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> : <CopyIcon className="w-3.5 h-3.5" />}
    </Button>
  );
}

// ─── Badge components ─────────────────────────────────────────────────────────

function MethodBadge({ entry, large }: { entry: ApiCatalogEntry; large?: boolean }) {
  const sz = large ? "text-xs px-2 py-1" : "text-[10px] px-1.5 py-0.5";
  if (entry.kind === "rpc") {
    return (
      <span className={cn("rounded font-mono font-bold uppercase bg-violet-500/10 text-violet-700 dark:text-violet-400", sz)}>
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

function RiskBadge({ risk }: { risk: ApiRiskLevel }) {
  const labels: Record<ApiRiskLevel, string> = { low: "Low", medium: "Med", high: "High", critical: "Critical" };
  return (
    <span className={cn("rounded border text-[10px] px-1.5 py-0.5 font-medium", riskColor(risk))}>
      {labels[risk]}
    </span>
  );
}

function AuthBadge({ auth }: { auth: ApiAuthLevel }) {
  const labels: Record<ApiAuthLevel, string> = {
    public: "Public",
    authenticated: "Auth",
    admin: "Admin",
    service_role: "Service",
  };
  return (
    <span className={cn("rounded border text-[10px] px-1.5 py-0.5 font-medium", authColor(auth))}>
      {labels[auth]}
    </span>
  );
}

// ─── EntryRow ─────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  isSelected,
  onSelect,
}: {
  entry: ApiCatalogEntry;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left px-3 py-2.5 flex items-start gap-2 border-b border-border/30",
        "hover:bg-accent transition-colors duration-150",
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
        <span className="text-[11px] text-muted-foreground truncate leading-snug">
          {entry.summary}
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          <RiskBadge risk={entry.risk} />
          <AuthBadge auth={entry.auth_level} />
          {entry.status !== "active" && (
            <span className={cn("rounded text-[10px] px-1.5 py-0.5", statusColor(entry.status))}>
              {entry.status}
            </span>
          )}
          {!entry.used_in_code && (
            <span className="rounded text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground">
              discovered
            </span>
          )}
          {entry.callability === "disabled" && (
            <span className="rounded text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground">
              disabled
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── CatalogPanel ─────────────────────────────────────────────────────────────

interface CatalogPanelProps {
  entries: ApiCatalogEntry[];
  filters: ApiFilterState;
  onFiltersChange: (f: ApiFilterState) => void;
  selectedId: string | null;
  onSelect: (e: ApiCatalogEntry) => void;
  totalCount: number;
}

function CatalogPanel({ entries, filters, onFiltersChange, selectedId, onSelect, totalCount }: CatalogPanelProps) {
  const t = useTranslate();

  const setFilter = useCallback(
    <K extends keyof ApiFilterState>(key: K, val: ApiFilterState[K]) =>
      onFiltersChange({ ...filters, [key]: val }),
    [filters, onFiltersChange]
  );

  const hasActiveFilters =
    filters.kind !== "all" || filters.status !== "all" || filters.auth !== "all" ||
    filters.risk !== "all" || filters.callable !== "all";

  return (
    <div className="w-72 shrink-0 flex flex-col h-full border rounded-xl bg-card overflow-hidden">
      {/* Search */}
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setFilter("search", "")}
              aria-label="Clear search"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter row */}
      <div className="px-3 py-2 border-b flex items-center gap-2 flex-wrap">
        <Select
          value={filters.kind}
          onValueChange={(v) => setFilter("kind", v as ApiFilterState["kind"])}
        >
          <SelectTrigger className="h-7 text-xs w-[80px]">
            <SelectValue placeholder="Kind" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All kinds</SelectItem>
            <SelectItem value="http">HTTP</SelectItem>
            <SelectItem value="rpc">RPC</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.risk}
          onValueChange={(v) => setFilter("risk", v as ApiFilterState["risk"])}
        >
          <SelectTrigger className="h-7 text-xs w-[80px]">
            <SelectValue placeholder="Risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risks</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(v) => setFilter("status", v as ApiFilterState["status"])}
        >
          <SelectTrigger className="h-7 text-xs w-[90px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="legacy">Legacy</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() =>
              onFiltersChange({ ...DEFAULT_FILTER_STATE, showAll: filters.showAll, search: filters.search })
            }
          >
            <XIcon className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Show all toggle */}
      <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {entries.length} / {totalCount} endpoints
        </span>
        <button
          onClick={() =>
            onFiltersChange({
              ...filters,
              showAll: !filters.showAll,
              usedInCode: !filters.showAll ? "all" : true,
            })
          }
          className={cn(
            "flex items-center gap-1.5 text-[11px] rounded-full px-2.5 py-1 border transition-colors",
            filters.showAll
              ? "bg-primary/10 text-primary border-primary/20"
              : "text-muted-foreground border-border hover:bg-accent"
          )}
        >
          <FilterIcon className="w-3 h-3" />
          {filters.showAll ? "All discovered" : "Active only"}
        </button>
      </div>

      {/* Entry list */}
      <ScrollArea className="flex-1">
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
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ entry }: { entry: ApiCatalogEntry }) {
  return (
    <div className="space-y-6">
      {/* Description */}
      {entry.description && (
        <section>
          <h3 className="typography-card-title mb-2">Description</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{entry.description}</p>
        </section>
      )}

      {/* Parameters */}
      <section>
        <h3 className="typography-card-title mb-3">Parameters</h3>
        {entry.params.length === 0 ? (
          <p className="text-sm text-muted-foreground">No parameters.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs w-[140px]">Name</TableHead>
                  <TableHead className="text-xs w-[100px]">Type</TableHead>
                  <TableHead className="text-xs w-[80px]">Required</TableHead>
                  <TableHead className="text-xs w-[100px]">Default</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
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
                        <span className="text-destructive font-medium">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
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

      {/* Response examples */}
      {entry.response_examples.length > 0 && (
        <section>
          <h3 className="typography-card-title mb-3">Example Responses</h3>
          <div className="space-y-3">
            {entry.response_examples.map((ex, i) => (
              <div key={i} className="rounded-lg border overflow-hidden">
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

      {/* Source & provenance */}
      <section>
        <h3 className="typography-card-title mb-2">Source Files</h3>
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

// ─── Snippets tab ─────────────────────────────────────────────────────────────

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <div className="relative rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b">
        <span className="text-xs font-mono text-muted-foreground">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-3 text-xs font-mono overflow-x-auto bg-background/50 text-foreground/80 leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

function SnippetsTab({ entry }: { entry: ApiCatalogEntry }) {
  const curlSnippet = generateCurlSnippet(entry);
  const fetchSnippet = generateFetchSnippet(entry);
  const rpcSnippet = generateRpcSnippet(entry);

  return (
    <div className="space-y-4">
      {entry.kind === "http" && (
        <>
          <div>
            <h3 className="typography-card-title mb-2">cURL</h3>
            <CodeBlock code={curlSnippet} language="bash" />
          </div>
          <div>
            <h3 className="typography-card-title mb-2">JavaScript (fetch)</h3>
            <CodeBlock code={fetchSnippet} language="javascript" />
          </div>
        </>
      )}
      {entry.kind === "rpc" && (
        <div>
          <h3 className="typography-card-title mb-2">Supabase RPC</h3>
          <CodeBlock code={rpcSnippet} language="typescript" />
        </div>
      )}
    </div>
  );
}

// ─── Execution tab ────────────────────────────────────────────────────────────

interface KVEditorProps {
  label: string;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}

function KVEditor({ label, value, onChange }: KVEditorProps) {
  const entries = Object.entries(value);
  const add = () => onChange({ ...value, "": "" });
  const remove = (k: string) => {
    const next = { ...value };
    delete next[k];
    onChange(next);
  };
  const update = (oldKey: string, newKey: string, newVal: string) => {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(value)) {
      next[k === oldKey ? newKey : k] = k === oldKey ? newVal : v;
    }
    onChange(next);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={add}>
          + Add
        </Button>
      </div>
      {entries.map(([k, v], i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <Input
            placeholder="key"
            value={k}
            onChange={(e) => update(k, e.target.value, v)}
            className="h-7 text-xs font-mono flex-1"
          />
          <Input
            placeholder="value"
            value={v}
            onChange={(e) => update(k, k, e.target.value)}
            className="h-7 text-xs font-mono flex-1"
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(k)}>
            <XIcon className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function ResponseViewer({ result }: { result: ApiExecutionResult }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(result.data, null, 2) ?? "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-xs font-mono font-bold",
              httpStatusColor(result.status)
            )}
          >
            {result.status || "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            <ClockIcon className="w-3 h-3 inline mr-1" />
            {result.duration_ms}ms
          </span>
          {result.success ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">OK</span>
          ) : (
            <span className="text-xs text-destructive font-medium">Error</span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
          {copied ? <CheckIcon className="w-3 h-3 text-emerald-500" /> : <CopyIcon className="w-3 h-3" />}
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
  if (history.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-3">No executions yet in this session.</p>
    );
  }
  return (
    <div className="space-y-1.5">
      {history.map((h) => (
        <div
          key={h.id}
          className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border bg-muted/20"
        >
          <span
            className={cn("font-mono font-bold shrink-0", httpStatusColor(h.result.status))}
          >
            {h.result.status || "ERR"}
          </span>
          <span className="font-mono truncate text-muted-foreground flex-1">
            {h.operation_id}
          </span>
          <span className="text-muted-foreground shrink-0">{h.result.duration_ms}ms</span>
        </div>
      ))}
    </div>
  );
}

const NEEDS_MUTATION_MODE: ApiRiskLevel[] = ["high", "critical"];

function ExecutionTab({ entry }: { entry: ApiCatalogEntry }) {
  const { execute, cancel, clearResult, result, isLoading, history } = useApiExecution();
  const [mutationModeEnabled, setMutationModeEnabled] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");

  // RPC args (JSON textarea)
  const [rpcArgsText, setRpcArgsText] = useState(
    entry.params.length > 0
      ? JSON.stringify(Object.fromEntries(entry.params.map((p) => [p.name, p.default ?? ""])), null, 2)
      : "{}"
  );
  const [rpcArgsError, setRpcArgsError] = useState<string | null>(null);

  // HTTP fields
  const [queryParams, setQueryParams] = useState<Record<string, string>>(() =>
    Object.fromEntries(entry.params.filter((p) => !p.required || p.default !== undefined).map((p) => [p.name, String(p.default ?? "")]))
  );
  const [reqHeaders, setReqHeaders] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState("{}");

  // Reset when entry changes
  useEffect(() => {
    clearResult();
    setConfirmPhrase("");
    setMutationModeEnabled(false);
    setRpcArgsText(
      entry.params.length > 0
        ? JSON.stringify(Object.fromEntries(entry.params.map((p) => [p.name, p.default ?? ""])), null, 2)
        : "{}"
    );
    setQueryParams(
      Object.fromEntries(entry.params.filter((p) => !p.required || p.default !== undefined).map((p) => [p.name, String(p.default ?? "")]))
    );
    setReqHeaders({});
    setBodyText("{}");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id]);

  const isMutating = NEEDS_MUTATION_MODE.includes(entry.risk);

  const handleRun = useCallback(() => {
    if (isMutating && !mutationModeEnabled) return;
    if (isMutating) {
      setConfirmPhrase("");
      setConfirmOpen(true);
      return;
    }
    doExecute();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMutating, mutationModeEnabled, rpcArgsText, queryParams, reqHeaders, bodyText]);

  const doExecute = useCallback(() => {
    if (entry.kind === "rpc") {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(rpcArgsText);
        setRpcArgsError(null);
      } catch {
        setRpcArgsError("Invalid JSON — check your arguments.");
        return;
      }
      execute(entry, { rpc_args: args });
    } else {
      let body: unknown = undefined;
      if (entry.method !== "GET" && bodyText.trim() !== "{}") {
        try {
          body = JSON.parse(bodyText);
        } catch {
          toast.error("Invalid JSON in request body");
          return;
        }
      }
      execute(entry, {
        target: entry.path ?? "",
        query: queryParams,
        headers: reqHeaders,
        body,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, rpcArgsText, queryParams, reqHeaders, bodyText]);

  if (entry.callability === "disabled") {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center">
        <XIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">Not executable</p>
        <p className="text-xs text-muted-foreground mt-1">
          This endpoint cannot be invoked from the console.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mutation mode toggle */}
      {isMutating && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2.5 flex items-center gap-2 text-xs",
            mutationModeEnabled
              ? "border-destructive/30 bg-destructive/5"
              : "border-amber-500/30 bg-amber-500/5"
          )}
        >
          <LockIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-muted-foreground">
            {mutationModeEnabled
              ? "Mutation mode enabled — this operation will modify data."
              : "This is a write operation. Enable mutation mode to execute."}
          </span>
          <Button
            variant={mutationModeEnabled ? "destructive" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setMutationModeEnabled((v) => !v)}
          >
            {mutationModeEnabled ? "Disable" : "Enable mutation mode"}
          </Button>
        </div>
      )}

      {/* Transport badge */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {callabilityIcon(entry.callability)}
        <span>
          {entry.callability === "direct_rpc" && "Direct RPC via supabaseClient"}
          {entry.callability === "direct_http" && "Direct HTTP (same-origin fetch)"}
          {entry.callability === "proxy_admin" && "Proxied via /api/admin/api-console/execute (admin token required)"}
        </span>
      </div>

      {/* Request editor */}
      {entry.kind === "rpc" ? (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">RPC Arguments (JSON)</label>
          <textarea
            value={rpcArgsText}
            onChange={(e) => {
              setRpcArgsText(e.target.value);
              setRpcArgsError(null);
            }}
            className={cn(
              "w-full h-32 rounded-lg border bg-background font-mono text-xs p-3 resize-y",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              rpcArgsError && "border-destructive"
            )}
            placeholder='{ "p_user_id": "uuid" }'
          />
          {rpcArgsError && <p className="text-xs text-destructive">{rpcArgsError}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <KVEditor label="Query Parameters" value={queryParams} onChange={setQueryParams} />
          <KVEditor label="Request Headers" value={reqHeaders} onChange={setReqHeaders} />
          {entry.method !== "GET" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Request Body (JSON)</label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full h-24 rounded-lg border bg-background font-mono text-xs p-3 resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="{}"
              />
            </div>
          )}
        </div>
      )}

      {/* Run / Cancel */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleRun}
          disabled={isLoading || (isMutating && !mutationModeEnabled)}
          className="min-w-[100px]"
        >
          {isLoading ? (
            <>
              <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4 mr-2" />
              Run
            </>
          )}
        </Button>
        {isLoading && (
          <Button variant="outline" size="sm" onClick={cancel}>
            Cancel
          </Button>
        )}
        {result && !isLoading && (
          <Button variant="ghost" size="sm" onClick={clearResult}>
            <XIcon className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Response */}
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {result && !isLoading && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Response</h4>
          <ResponseViewer result={result} />
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <HistoryIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <h4 className="text-xs font-medium text-muted-foreground">Execution History</h4>
          </div>
          <HistoryPanel history={history} />
        </div>
      )}

      {/* Mutation confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm execution</DialogTitle>
            <DialogDescription>
              This is a <strong>{entry.risk}</strong> risk operation that will modify data. Type{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-destructive font-mono font-bold">
                EXECUTE
              </code>{" "}
              to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmPhrase}
            onChange={(e) => setConfirmPhrase(e.target.value)}
            placeholder="Type EXECUTE to confirm"
            className="font-mono"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmPhrase !== "EXECUTE"}
              onClick={() => {
                setConfirmOpen(false);
                doExecute();
              }}
            >
              Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── EntryDetailPanel ─────────────────────────────────────────────────────────

function EntryDetailPanel({ entry }: { entry: ApiCatalogEntry }) {
  const [tab, setTab] = useState("overview");

  // Reset to overview when entry changes
  useEffect(() => {
    setTab("overview");
  }, [entry.id]);

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      {/* Header */}
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
            <div className={cn("flex items-center gap-1 rounded border text-[10px] px-1.5 py-0.5", riskColor(entry.risk))}>
              <span className="font-medium">{entry.risk}</span> risk
            </div>
            <div className={cn("rounded border text-[10px] px-1.5 py-0.5", authColor(entry.auth_level))}>
              {entry.auth_level}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
              {callabilityIcon(entry.callability)}
              <span>{entry.callability}</span>
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

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="shrink-0 mx-4 mt-3 justify-start h-9 w-fit">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="snippets" className="text-xs">Snippets</TabsTrigger>
          <TabsTrigger value="try" className="text-xs">
            <PlayIcon className="w-3 h-3 mr-1.5" />
            Try It Out
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="overview" className="p-4 mt-0">
            <OverviewTab entry={entry} />
          </TabsContent>
          <TabsContent value="snippets" className="p-4 mt-0">
            <SnippetsTab entry={entry} />
          </TabsContent>
          <TabsContent value="try" className="p-4 mt-0">
            <ExecutionTab entry={entry} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </Card>
  );
}

// ─── EmptySelectionState ──────────────────────────────────────────────────────

function EmptySelectionState() {
  return (
    <Card className="h-full flex items-center justify-center">
      <CardContent className="text-center py-12">
        <CodeIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
        <p className="text-base font-medium text-muted-foreground">Select an endpoint</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Choose an endpoint from the panel to view details and execute it.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AdminApiDocs() {
  const t = useTranslate();
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<ApiFilterState>(DEFAULT_FILTER_STATE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filteredEntries = useMemo(() => filterCatalog(catalog, filters), [filters]);
  const selectedEntry = useMemo(
    () => (selectedId ? catalog.find((e) => e.id === selectedId) ?? null : null),
    [selectedId]
  );
  const stats = useMemo(() => getCatalogStats(catalog), []);

  const handleSelect = useCallback(
    (entry: ApiCatalogEntry) => {
      setSelectedId(entry.id);
      if (isMobile) setSheetOpen(false);
    },
    [isMobile]
  );

  return (
    <div className="container max-w-7xl px-2 py-4 md:px-4 md:py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="typography-page-title">{t("adminApiDocs.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.total} endpoints · {stats.http} HTTP · {stats.rpc} RPC · {stats.usedInCode} in use
          </p>
        </div>
        {isMobile && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <FilterIcon className="w-4 h-4 mr-2" />
                Browse
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0">
              <SheetHeader className="p-3 border-b">
                <SheetTitle className="text-sm">API Endpoints</SheetTitle>
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
        )}
      </div>

      {/* Split layout */}
      <div
        className="flex gap-4"
        style={{ height: "calc(100vh - 11rem)" }}
      >
        {/* Left: catalog panel (desktop only) */}
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

        {/* Right: detail panel */}
        <div className="flex-1 overflow-hidden">
          {selectedEntry ? (
            <EntryDetailPanel entry={selectedEntry} />
          ) : (
            <EmptySelectionState />
          )}
        </div>
      </div>
    </div>
  );
}
