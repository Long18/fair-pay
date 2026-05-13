import { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabaseClient } from "@/utility/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  ScrollTextIcon,
  Loader2Icon,
  DownloadIcon,
  RefreshCwIcon,
  Undo2Icon,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
} from "@/components/ui/icons";
import { AdminPageToolbar } from "@/modules/admin/components/AdminPageToolbar";
import { AdminSection, AdminSectionHeader } from "@/modules/admin/components/AdminSection";
import { AdminFilterChips } from "@/modules/admin/components/AdminFilterChips";
import { useAdminTranslation } from "../i18n";
import { formatDate } from "@/lib/locale-utils";
import type { AuditLogEntry, AuditLogsResponse, AuditStats, AuditFilterOptions } from "../types";
import { useHaptics } from "@/hooks/use-haptics";
import { motion } from "framer-motion";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import { AnimatedList } from "@/components/ui/animated-list";
import { AnimatedRow } from "@/components/ui/animated-row";

// ─── Constants ──────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Hooks ──────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function useAuditLogs(params: {
  search: string;
  actionFilter: string;
  tableFilter: string;
  actorFilter: string;
  dateFrom: string;
  dateTo: string;
  page: number;
}) {
  return useQuery<AuditLogsResponse>({
    queryKey: ["admin", "audit-logs", params],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("read_admin_audit_logs", {
        p_search: params.search || null,
        p_action_type: params.actionFilter !== "all" ? params.actionFilter : null,
        p_table_name: params.tableFilter !== "all" ? params.tableFilter : null,
        p_actor_id: params.actorFilter !== "all" ? params.actorFilter : null,
        p_date_from: params.dateFrom ? new Date(params.dateFrom).toISOString() : null,
        p_date_to: params.dateTo ? new Date(params.dateTo + "T23:59:59").toISOString() : null,
        p_limit: PAGE_SIZE,
        p_offset: params.page * PAGE_SIZE,
      });
      if (error) throw error;
      return data as AuditLogsResponse;
    },
    staleTime: 15_000,
  });
}

function useAuditStats() {
  return useQuery<AuditStats>({
    queryKey: ["admin", "audit-stats"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("get_audit_stats");
      if (error) throw error;
      return data as AuditStats;
    },
    staleTime: 30_000,
  });
}

function useAuditFilterOptions() {
  return useQuery<AuditFilterOptions>({
    queryKey: ["admin", "audit-filter-options"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("get_audit_filter_options");
      if (error) throw error;
      return data as AuditFilterOptions;
    },
    staleTime: 60_000,
  });
}


// ─── Diff View ──────────────────────────────────────────────────────

function DiffView({ oldData, newData }: { oldData: Record<string, unknown> | null; newData: Record<string, unknown> | null }) {
  const { tAdmin } = useAdminTranslation();
  const changes = useMemo(() => {
    if (!oldData && !newData) return [];

    const allKeys = new Set([
      ...Object.keys(oldData ?? {}),
      ...Object.keys(newData ?? {}),
    ]);

    const result: Array<{
      key: string;
      oldVal: unknown;
      newVal: unknown;
      type: "added" | "removed" | "changed" | "unchanged";
    }> = [];

    for (const key of allKeys) {
      const oldVal = oldData?.[key];
      const newVal = newData?.[key];
      const oldStr = JSON.stringify(oldVal);
      const newStr = JSON.stringify(newVal);

      if (oldVal === undefined) {
        result.push({ key, oldVal, newVal, type: "added" });
      } else if (newVal === undefined) {
        result.push({ key, oldVal, newVal, type: "removed" });
      } else if (oldStr !== newStr) {
        result.push({ key, oldVal, newVal, type: "changed" });
      } else {
        result.push({ key, oldVal, newVal, type: "unchanged" });
      }
    }

    // Sort: changed first, then added, removed, unchanged
    const order = { changed: 0, added: 1, removed: 2, unchanged: 3 };
    result.sort((a, b) => order[a.type] - order[b.type]);
    return result;
  }, [oldData, newData]);

  if (changes.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">{tAdmin("auditLogs.noDetailData")}</p>;
  }

  const formatVal = (v: unknown) => {
    if (v === undefined || v === null) return "—";
    if (typeof v === "object") return JSON.stringify(v, null, 2);
    return String(v);
  };

  return (
    <div className="space-y-1">
      {changes.map(({ key, oldVal, newVal, type }) => (
        <div
          key={key}
          className={`flex items-start gap-2 rounded-md px-2 py-1 text-xs font-mono ${
            type === "added"
              ? "bg-[var(--status-success-bg)]"
              : type === "removed"
                ? "bg-[var(--status-error-bg)]"
                : type === "changed"
                  ? "bg-[var(--status-warning-bg)]"
                  : "bg-transparent"
          }`}
        >
          <span className="w-1.5 shrink-0 mt-0.5">
            {type === "added" && <span className="text-[var(--status-success-foreground)]">+</span>}
            {type === "removed" && <span className="text-[var(--status-error-foreground)]">−</span>}
            {type === "changed" && <span className="text-[var(--status-warning-foreground)]">~</span>}
          </span>
          <span className="text-muted-foreground min-w-[100px] shrink-0">{key}:</span>
          <div className="flex-1 min-w-0">
            {type === "changed" ? (
              <div className="space-y-0.5">
                <div className="text-[var(--status-error-foreground)] line-through break-all">{formatVal(oldVal)}</div>
                <div className="text-[var(--status-success-foreground)] break-all">{formatVal(newVal)}</div>
              </div>
            ) : type === "removed" ? (
              <span className="text-[var(--status-error-foreground)] break-all">{formatVal(oldVal)}</span>
            ) : type === "added" ? (
              <span className="text-[var(--status-success-foreground)] break-all">{formatVal(newVal)}</span>
            ) : (
              <span className="text-muted-foreground break-all">{formatVal(newVal)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


// ─── Detail Dialog ──────────────────────────────────────────────────

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function AuditDetailDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { tAdmin } = useAdminTranslation();
  if (!entry) return null;

  const hasOldNewData = entry.old_data || entry.new_data;
  const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {(() => {
              const action = entry.action_type;
              if (action === "DELETE") return <Badge variant="destructive" className="gap-1 text-xs"><Trash2Icon className="size-3" aria-hidden="true" />DELETE</Badge>;
              if (action === "INSERT") return <Badge className="gap-1 text-xs"><PlusIcon className="size-3" aria-hidden="true" />INSERT</Badge>;
              if (action === "UPDATE") return <Badge variant="secondary" className="gap-1 text-xs"><PencilIcon className="size-3" aria-hidden="true" />UPDATE</Badge>;
              return <Badge variant="outline" className="gap-1 text-xs">{action}</Badge>;
            })()}
            <span>{entry.table_name ?? entry.entity_type ?? "—"}</span>
          </DialogTitle>
          <DialogDescription>
            {formatDate(entry.timestamp)} · {entry.actor_name || entry.actor_email || tAdmin("common.system")} · {tAdmin("auditLogs.sourceLabel")}: {entry.source}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label={tAdmin("auditLogs.actor")} value={entry.actor_name || entry.actor_email || tAdmin("common.system")} />
              <DetailItem label={tAdmin("common.email")} value={entry.actor_email || "—"} />
              <DetailItem label={tAdmin("auditLogs.actionType")} value={entry.action_type} />
              <DetailItem label={tAdmin("auditLogs.tableEntity")} value={entry.table_name ?? entry.entity_type ?? "—"} />
              <DetailItem label={tAdmin("auditLogs.entityId")} value={<span className="font-mono text-xs">{entry.entity_id || "—"}</span>} />
              <DetailItem label={tAdmin("auditLogs.timestamp")} value={formatDate(entry.timestamp)} />
              <DetailItem label={tAdmin("auditLogs.sourceLabel")} value={
                <Badge variant="outline" className="text-xs">
                  {entry.source === "audit_logs" ? tAdmin("auditLogs.dataChanges") : "Settlement"}
                </Badge>
              } />
            </div>

            {/* Diff View for old/new data */}
            {hasOldNewData && (
              <div>
                <h4 className="text-sm font-medium mb-2">{tAdmin("auditLogs.dataChanges")}</h4>
                <DiffView oldData={entry.old_data} newData={entry.new_data} />
              </div>
            )}

            {/* Metadata for audit_trail */}
            {hasMetadata && (
              <div>
                <h4 className="text-sm font-medium mb-1">Metadata</h4>
                <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              </div>
            )}

            {!hasOldNewData && !hasMetadata && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {tAdmin("auditLogs.noDetailData")}
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


// ─── Revert Audit Entry ─────────────────────────────────────────────

function useRevertAuditEntry() {
  const queryClient = useQueryClient();
  const { tAdmin } = useAdminTranslation();

  return useMutation<
    { success: boolean; reverted_audit_id: string; action: string; table_name: string; record_id: string },
    Error,
    string
  >({
    mutationFn: async (auditId: string) => {
      const { data, error } = await supabaseClient.rpc("admin_revert_audit_entry", {
        p_audit_id: auditId,
      });
      if (error) throw new Error(error.message);
      return data as { success: boolean; reverted_audit_id: string; action: string; table_name: string; record_id: string };
    },
    onSuccess: (data) => {
      toast.success(tAdmin("auditLogs.revertSuccess", { action: data.action, table: data.table_name }));
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-stats"] });
    },
    onError: (error) => {
      toast.error(tAdmin("auditLogs.revertError", { message: error.message }));
    },
  });
}

function canRevertEntry(entry: AuditLogEntry): boolean {
  // Only audit_logs source entries (not audit_trail) can be reverted
  // Must have old_data (for UPDATE/DELETE) or new_data (for INSERT)
  if (entry.source !== "audit_logs") return false;
  if (entry.action_type === "DELETE" && entry.old_data) return true;
  if (entry.action_type === "UPDATE" && entry.old_data) return true;
  if (entry.action_type === "INSERT" && entry.entity_id) return true;
  return false;
}

function RevertAuditDialog({
  entry,
  open,
  onOpenChange,
  onConfirm,
  isReverting,
}: {
  entry: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isReverting: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  if (!entry) return null;

  const actionLabel =
    entry.action_type === "DELETE"
      ? tAdmin("auditLogs.revertAction.delete")
      : entry.action_type === "UPDATE"
        ? tAdmin("auditLogs.revertAction.update")
        : tAdmin("auditLogs.revertAction.insert");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tAdmin("auditLogs.confirmRevertTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {tAdmin("auditLogs.confirmRevertDetailed", { action: actionLabel, table: entry.table_name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isReverting}>{tAdmin("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isReverting}>
            {isReverting ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                {tAdmin("auditLogs.reverting")}
              </>
            ) : (
              <>
                <Undo2Icon className="h-4 w-4 mr-2" />
                {tAdmin("auditLogs.revert")}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


// ─── Export CSV ─────────────────────────────────────────────────────

function exportToCsv(entries: AuditLogEntry[], tAdmin: ReturnType<typeof useAdminTranslation>["tAdmin"]) {
  const headers = [
    tAdmin("auditLogs.timestamp"),
    tAdmin("auditLogs.actor"),
    tAdmin("common.email"),
    tAdmin("auditLogs.actionType"),
    tAdmin("auditLogs.tableEntity"),
    tAdmin("auditLogs.entityId"),
    tAdmin("auditLogs.sourceLabel"),
  ];
  const rows = entries.map((e) => [
    e.timestamp,
    e.actor_name || tAdmin("common.system"),
    e.actor_email || "",
    e.action_type,
    e.table_name ?? e.entity_type ?? "",
    e.entity_id,
    e.source,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}


// ─── Main Component ─────────────────────────────────────────────────

export function AdminAuditLogs() {
  const { tAdmin } = useAdminTranslation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [showFilters, setShowFilters] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [revertEntry, setRevertEntry] = useState<AuditLogEntry | null>(null);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);

  const revertMutation = useRevertAuditEntry();
  const { tap, warning } = useHaptics();

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, actionFilter, tableFilter, actorFilter, dateFrom, dateTo]);

  // ─── Data fetching ──────────────────────────────────────────────

  const [isExporting, setIsExporting] = useState(false);

  const { data: logsResponse, isLoading, refetch, isFetching } = useAuditLogs({
    search: debouncedSearch,
    actionFilter,
    tableFilter,
    actorFilter,
    dateFrom,
    dateTo,
    page,
  });

  const { data: stats, isLoading: statsLoading } = useAuditStats();
  const { data: filterOptions } = useAuditFilterOptions();

  const entries = logsResponse?.data ?? [];
  const total = logsResponse?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { containerVariants, rowVariants, animationKey } = useStaggerAnimation(entries);

  // ─── Clear Filters ──────────────────────────────────────────────

  const clearFilters = useCallback(() => {
    tap();
    setSearch("");
    setActionFilter("all");
    setTableFilter("all");
    setActorFilter("all");
    setDateFrom("");
    setDateTo("");
  }, [tap]);

  const hasActiveFilters =
    search !== "" ||
    actionFilter !== "all" ||
    tableFilter !== "all" ||
    actorFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  const handleExportAll = useCallback(async () => {
    if (total === 0) return;
    tap();
    setIsExporting(true);
    try {
      const { data, error } = await supabaseClient.rpc("read_admin_audit_logs", {
        p_search: debouncedSearch || null,
        p_action_type: actionFilter !== "all" ? actionFilter : null,
        p_table_name: tableFilter !== "all" ? tableFilter : null,
        p_actor_id: actorFilter !== "all" ? actorFilter : null,
        p_date_from: dateFrom ? new Date(dateFrom).toISOString() : null,
        p_date_to: dateTo ? new Date(dateTo + "T23:59:59").toISOString() : null,
        p_limit: Math.min(total, 5000),
        p_offset: 0,
      });
      if (error) throw error;
      exportToCsv((data as AuditLogsResponse).data, tAdmin);
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: err instanceof Error ? err.message : tAdmin("common.exportCsv") }));
    } finally {
      setIsExporting(false);
    }
  }, [total, debouncedSearch, actionFilter, tableFilter, actorFilter, dateFrom, dateTo, tap, tAdmin]);

  const isEmptyResult = !isLoading && entries.length === 0;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <AdminSection>
      <AdminSectionHeader
        title={tAdmin("auditLogs.title")}
        description={tAdmin("auditLogs.description")}
      />



      {/* Analytics: by table + by actor */}
      {!statsLoading && stats && (stats.by_table.length > 0 || stats.by_actor.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.by_table.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{tAdmin("auditLogs.byTable")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <AnimatedList items={stats.by_table} className="space-y-2">
                  {stats.by_table.map((item, index) => {
                    const pct = stats.total > 0 ? (item.count / stats.total) * 100 : 0;
                    return (
                      <AnimatedRow key={item.name} index={index} className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs min-w-[100px] justify-center">
                          {item.name}
                        </Badge>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full transition-all"
                            style={{ width: `${Math.max(pct, 1)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                          {item.count.toLocaleString()}
                        </span>
                      </AnimatedRow>
                    );
                  })}
                </AnimatedList>
              </CardContent>
            </Card>
          )}
          {stats.by_actor.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{tAdmin("auditLogs.byActor")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <AnimatedList items={stats.by_actor} className="space-y-2">
                  {stats.by_actor.map((item, index) => {
                    const pct = stats.total > 0 ? (item.count / stats.total) * 100 : 0;
                    return (
                      <AnimatedRow key={item.name} index={index} className="flex items-center gap-2">
                        <span className="text-xs min-w-[100px] truncate">{item.name}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/40 rounded-full transition-all"
                            style={{ width: `${Math.max(pct, 1)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                          {item.count.toLocaleString()}
                        </span>
                      </AnimatedRow>
                    );
                  })}
                </AnimatedList>
              </CardContent>
            </Card>
          )}
        </div>
      )}


      {/* Main Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{tAdmin("auditLogs.title")}</CardTitle>
        </CardHeader>

        <CardContent className="p-0 space-y-4">
          <div className="px-6">
            <AdminPageToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={tAdmin("auditLogs.searchPlaceholder")}
              filterCount={[actionFilter !== "all", tableFilter !== "all", actorFilter !== "all", dateFrom !== "", dateTo !== ""].filter(Boolean).length}
              onFilterToggle={() => setShowFilters((v) => !v)}
              actions={
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { tap(); refetch(); }}
                    disabled={isFetching}
                  >
                    <RefreshCwIcon className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                    {tAdmin("common.refresh")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleExportAll()}
                    disabled={total === 0 || isExporting}
                  >
                    {isExporting
                      ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      : <DownloadIcon className="mr-2 h-4 w-4" />}
                    {isExporting
                      ? tAdmin("auditLogs.exporting")
                      : tAdmin("auditLogs.exportCsvCount", { total: total.toLocaleString() })}
                  </Button>
                </>
              }
            />
            <AdminFilterChips
              filters={[
                ...(actionFilter !== "all" ? [{ key: "action", label: tAdmin("auditLogs.filters.action", { value: actionFilter }), onRemove: () => { tap(); setActionFilter("all"); } }] : []),
                ...(tableFilter !== "all" ? [{ key: "table", label: tAdmin("auditLogs.filters.table", { value: tableFilter }), onRemove: () => { tap(); setTableFilter("all"); } }] : []),
                ...(actorFilter !== "all" ? [{ key: "actor", label: tAdmin("auditLogs.filters.actor", { value: filterOptions?.actors?.find((a: any) => a.id === actorFilter)?.name ?? actorFilter }), onRemove: () => { tap(); setActorFilter("all"); } }] : []),
                ...(dateFrom !== "" ? [{ key: "dateFrom", label: tAdmin("transactions.filterChips.dateFrom", { value: dateFrom }), onRemove: () => setDateFrom("") }] : []),
                ...(dateTo !== "" ? [{ key: "dateTo", label: tAdmin("transactions.filterChips.dateTo", { value: dateTo }), onRemove: () => setDateTo("") }] : []),
              ]}
              onClearAll={clearFilters}
            />
          </div>
          {/* Collapsible Filters */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent>
              <div className="flex items-end gap-3 flex-wrap pb-4 px-6">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{tAdmin("common.fromDate")}</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{tAdmin("common.toDate")}</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{tAdmin("auditLogs.actionType")}</Label>
                  <Select value={actionFilter} onValueChange={(v) => { tap(); setActionFilter(v); }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder={tAdmin("common.all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tAdmin("auditLogs.allActions")}</SelectItem>
                      {(filterOptions?.action_types ?? []).map((t) => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{tAdmin("auditLogs.tableEntity")}</Label>
                  <Select value={tableFilter} onValueChange={(v) => { tap(); setTableFilter(v); }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder={tAdmin("common.all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tAdmin("auditLogs.allTables")}</SelectItem>
                      {(filterOptions?.tables ?? []).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{tAdmin("auditLogs.actor")}</Label>
                  <Select value={actorFilter} onValueChange={(v) => { tap(); setActorFilter(v); }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder={tAdmin("common.all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tAdmin("auditLogs.allActors")}</SelectItem>
                      {(filterOptions?.actors ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>


          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty */}
          {isEmptyResult && (
            <Empty className="min-h-[400px]">
              <EmptyMedia variant="icon">
                <ScrollTextIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>{tAdmin("auditLogs.noResultsTitle")}</EmptyTitle>
                <EmptyDescription>
                  {hasActiveFilters
                    ? tAdmin("auditLogs.noResultsFiltered")
                    : tAdmin("auditLogs.noResultsEmpty")}
                </EmptyDescription>
              </EmptyHeader>
              {hasActiveFilters && (
                <EmptyContent>
                  <Button variant="outline" onClick={clearFilters}>{tAdmin("common.clearFilters")}</Button>
                </EmptyContent>
              )}
            </Empty>
          )}

          {/* Data Table */}
          {!isLoading && entries.length > 0 && (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[160px]">{tAdmin("auditLogs.timestamp")}</TableHead>
                      <TableHead className="w-[180px]">{tAdmin("auditLogs.actor")}</TableHead>
                      <TableHead className="w-[100px]">{tAdmin("auditLogs.actionType")}</TableHead>
                      <TableHead className="w-[130px]">{tAdmin("auditLogs.tableEntity")}</TableHead>
                      <TableHead className="w-[80px]">{tAdmin("auditLogs.sourceLabel")}</TableHead>
                      <TableHead>{tAdmin("common.details")}</TableHead>
                      <TableHead className="w-[80px] text-center">{tAdmin("auditLogs.revert")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <motion.tbody
                    key={animationKey}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="[&_tr:last-child]:border-0"
                  >
                    {entries.map((entry, index) => (
                      <motion.tr
                        key={entry.id}
                        custom={index}
                        variants={rowVariants}
                        data-slot="table-row"
                        className="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors cursor-pointer hover:bg-accent/50 group"
                        onClick={() => {
                          tap();
                          setSelectedEntry(entry);
                          setDetailOpen(true);
                        }}
                      >
                        <TableCell className="text-sm font-mono text-muted-foreground tabular-nums">
                          {formatDate(entry.timestamp)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {(entry.actor_name || entry.actor_email || "?")[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate max-w-[120px]">
                              {entry.actor_name || entry.actor_email || tAdmin("common.system")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const action = entry.action_type;
                            if (action === "DELETE") return <Badge variant="destructive" className="gap-1 text-xs"><Trash2Icon className="size-3" aria-hidden="true" />DELETE</Badge>;
                            if (action === "INSERT") return <Badge className="gap-1 text-xs"><PlusIcon className="size-3" aria-hidden="true" />INSERT</Badge>;
                            if (action === "UPDATE") return <Badge variant="secondary" className="gap-1 text-xs"><PencilIcon className="size-3" aria-hidden="true" />UPDATE</Badge>;
                            return <Badge variant="outline" className="gap-1 text-xs">{action}</Badge>;
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {entry.table_name ?? entry.entity_type ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={entry.source === "audit_logs" ? "secondary" : "outline"}
                            className="text-xs font-mono"
                          >
                            {entry.source === "audit_logs" ? "DB" : "Trail"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[200px] group-hover:text-foreground transition-colors">
                          {getDetailSummary(entry, tAdmin)}
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          {canRevertEntry(entry) ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-[var(--status-warning-foreground)]"
                              aria-label={tAdmin("auditLogs.revertAria")}
                              onClick={() => {
                                warning();
                                setRevertEntry(entry);
                                setRevertDialogOpen(true);
                              }}
                            >
                              <Undo2Icon className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">
                  {tAdmin("auditLogs.showingResults", {
                    from: page * PAGE_SIZE + 1,
                    to: Math.min((page + 1) * PAGE_SIZE, total),
                    total: total.toLocaleString(),
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => { tap(); setPage((p) => p - 1); }}>
                    {tAdmin("common.previous")}
                  </Button>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={page + 1}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (v >= 1 && v <= totalPages) { tap(); setPage(v - 1); }
                      }}
                      className="h-8 w-14 text-center tabular-nums"
                    />
                    <span className="text-sm text-muted-foreground">/ {totalPages}</span>
                  </div>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => { tap(); setPage((p) => p + 1); }}>
                    {tAdmin("common.next")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <AuditDetailDialog entry={selectedEntry} open={detailOpen} onOpenChange={setDetailOpen} />

      {/* Revert Dialog */}
      <RevertAuditDialog
        entry={revertEntry}
        open={revertDialogOpen}
        onOpenChange={(open) => {
          setRevertDialogOpen(open);
          if (!open) setRevertEntry(null);
        }}
        onConfirm={() => {
          if (revertEntry) {
            revertMutation.mutate(revertEntry.id, {
              onSuccess: () => {
                setRevertDialogOpen(false);
                setRevertEntry(null);
                refetch();
              },
            });
          }
        }}
        isReverting={revertMutation.isPending}
      />
    </AdminSection>
  );
}


// ─── Helpers ────────────────────────────────────────────────────────

function getDetailSummary(entry: AuditLogEntry, tAdmin: ReturnType<typeof useAdminTranslation>["tAdmin"]): string {
  if (entry.old_data || entry.new_data) {
    const data = entry.new_data ?? entry.old_data ?? {};
    const keys = Object.keys(data);
    if (keys.length === 0) return `Record ${entry.entity_id?.slice(0, 8) ?? "—"}`;

    // For UPDATE, show changed fields
    if (entry.action_type === "UPDATE" && entry.old_data && entry.new_data) {
      const changed = keys.filter(
        (k) => JSON.stringify(entry.old_data?.[k]) !== JSON.stringify(entry.new_data?.[k])
      );
      if (changed.length > 0) {
        return tAdmin("auditLogs.changedFields", {
          fields: `${changed.slice(0, 3).join(", ")}${changed.length > 3 ? "..." : ""}`,
        });
      }
    }

    return `${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "..." : ""}`;
  }
  if (entry.metadata) {
    const keys = Object.keys(entry.metadata);
    if (keys.length === 0) return `Entity ${entry.entity_id?.slice(0, 8) ?? "—"}`;
    return `${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "..." : ""}`;
  }
  return entry.entity_id?.slice(0, 8) || "—";
}
