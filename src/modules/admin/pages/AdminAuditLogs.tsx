import { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabaseClient } from "@/utility/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-display";
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
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  FilterIcon,
  XIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";
import { AdminSection } from "@/modules/admin/components/AdminSection";
import { AdminPageHeader } from "@/modules/admin/components/AdminPageHeader";
import { AdminFilterChips } from "@/modules/admin/components/AdminFilterChips";
import {
  AdminMobileCard,
  AdminMobileCards,
  AdminMobilePagination,
} from "@/modules/admin/components/AdminMobileCards";
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


// ─── Action Badge ────────────────────────────────────────────────────

const SETTLEMENT_SUMMARY_ACTIONS = new Set([
  "SETTLE_SUMMARY",
  "settle_batch",
  "settle_all_with_person",
  "manual_settle_all",
  "settle_all_user_splits",
  "settle_all",
]);

function ActionBadge({ action }: { action: string }) {
  if (action === "DELETE") return (
    <Badge className="gap-1 text-xs font-medium border bg-[var(--status-error-bg)] text-[var(--status-error-foreground)] border-[var(--status-error-border)] hover:bg-[var(--status-error-bg)]">
      <Trash2Icon className="size-3" aria-hidden="true" />DELETE
    </Badge>
  );
  if (action === "INSERT") return (
    <Badge className="gap-1 text-xs font-medium border bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] border-[var(--status-success-border)] hover:bg-[var(--status-success-bg)]">
      <PlusIcon className="size-3" aria-hidden="true" />INSERT
    </Badge>
  );
  if (action === "UPDATE") return (
    <Badge className="gap-1 text-xs font-medium border bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] border-[var(--status-warning-border)] hover:bg-[var(--status-warning-bg)]">
      <PencilIcon className="size-3" aria-hidden="true" />UPDATE
    </Badge>
  );
  if (SETTLEMENT_SUMMARY_ACTIONS.has(action)) {
    return (
      <Badge className="gap-1 text-xs font-medium border bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
        Settle Up
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-xs">{action}</Badge>;
}


// ─── Audit KPI Strip ─────────────────────────────────────────────────

function AuditKpiStrip({ stats, loading }: { stats: AuditStats | undefined; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card px-4 py-3 space-y-1.5">
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            <div className="h-6 w-10 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }
  if (!stats) return null;

  const total = stats.total || 1;
  const insertPct = Math.round((stats.inserts / total) * 100);
  const updatePct = Math.round((stats.updates / total) * 100);
  const deletePct = Math.round((stats.deletes / total) * 100);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="rounded-xl border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground mb-1">Total</p>
        <p className="text-xl font-bold tabular-nums">{stats.total.toLocaleString()}</p>
      </div>
      <div className="rounded-xl border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground mb-1">Today</p>
        <p className="text-xl font-bold tabular-nums">{stats.today.toLocaleString()}</p>
      </div>
      <div className="rounded-xl border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground mb-1">This Week</p>
        <p className="text-xl font-bold tabular-nums">{stats.this_week.toLocaleString()}</p>
      </div>
      <div className="rounded-xl border bg-card px-4 py-3 space-y-2">
        <p className="text-xs text-muted-foreground">Action split</p>
        <div className="flex h-2 w-full rounded-full overflow-hidden gap-0.5">
          {insertPct > 0 && (
            <div
              className="bg-[var(--status-success-foreground)] rounded-full transition-all"
              style={{ width: `${insertPct}%` }}
              title={`INSERT ${insertPct}%`}
            />
          )}
          {updatePct > 0 && (
            <div
              className="bg-[var(--status-warning-foreground)] rounded-full transition-all"
              style={{ width: `${updatePct}%` }}
              title={`UPDATE ${updatePct}%`}
            />
          )}
          {deletePct > 0 && (
            <div
              className="bg-[var(--status-error-foreground)] rounded-full transition-all"
              style={{ width: `${deletePct}%` }}
              title={`DELETE ${deletePct}%`}
            />
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-[var(--status-success-foreground)]" />I:{stats.inserts}</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-[var(--status-warning-foreground)]" />U:{stats.updates}</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-[var(--status-error-foreground)]" />D:{stats.deletes}</span>
        </div>
      </div>
    </div>
  );
}


// ─── Filter Popover ──────────────────────────────────────────────────

function AuditFilterPopover({
  filterCount,
  actionFilter, setActionFilter,
  tableFilter, setTableFilter,
  actorFilter, setActorFilter,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  filterOptions,
  onClear,
  tap,
}: {
  filterCount: number;
  actionFilter: string; setActionFilter: (v: string) => void;
  tableFilter: string; setTableFilter: (v: string) => void;
  actorFilter: string; setActorFilter: (v: string) => void;
  dateFrom: string; setDateFrom: (v: string) => void;
  dateTo: string; setDateTo: (v: string) => void;
  filterOptions: AuditFilterOptions | undefined;
  onClear: () => void;
  tap: () => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 sm:h-9 gap-2 shrink-0">
          <FilterIcon className="h-4 w-4" />
          <span className="hidden min-[420px]:inline">{tAdmin("common.filter")}</span>
          {filterCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">{filterCount}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-4" align="start">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Filters</p>
          {filterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => { onClear(); setOpen(false); }}>
              <XIcon className="h-3 w-3 mr-1" />
              {tAdmin("common.clearAll")}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{tAdmin("auditLogs.actionType")}</Label>
            <Select value={actionFilter} onValueChange={(v) => { tap(); setActionFilter(v); }}>
              <SelectTrigger className="h-8 text-xs">
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
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{tAdmin("auditLogs.tableEntity")}</Label>
            <Select value={tableFilter} onValueChange={(v) => { tap(); setTableFilter(v); }}>
              <SelectTrigger className="h-8 text-xs">
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
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">{tAdmin("auditLogs.actor")}</Label>
            <Select value={actorFilter} onValueChange={(v) => { tap(); setActorFilter(v); }}>
              <SelectTrigger className="h-8 text-xs">
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
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{tAdmin("common.fromDate")}</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{tAdmin("common.toDate")}</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
        <Separator className="my-3" />
        <Button size="sm" className="w-full h-8 text-xs" onClick={() => setOpen(false)}>
          Apply
        </Button>
      </PopoverContent>
    </Popover>
  );
}

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

  // Count changed fields for the tab badge
  const changedFieldCount = useMemo(() => {
    if (!entry || (!entry.old_data && !entry.new_data)) return 0;
    const allKeys = new Set([
      ...Object.keys(entry.old_data ?? {}),
      ...Object.keys(entry.new_data ?? {}),
    ]);
    let count = 0;
    for (const key of allKeys) {
      if (JSON.stringify(entry.old_data?.[key]) !== JSON.stringify(entry.new_data?.[key])) count++;
    }
    return count;
  }, [entry]);

  if (!entry) return null;

  const hasOldNewData = entry.old_data || entry.new_data;
  const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ActionBadge action={entry.action_type} />
            <span>{entry.table_name ?? entry.entity_type ?? "—"}</span>
          </DialogTitle>
          <DialogDescription>
            {formatDate(entry.timestamp)} · {entry.actor_name || entry.actor_email || tAdmin("common.system")} · {tAdmin("auditLogs.sourceLabel")}: {entry.source}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start shrink-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="changes" className="gap-1.5">
              Changes
              {changedFieldCount > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">{changedFieldCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 -mx-6 px-6 mt-3">
            <TabsContent value="overview" className="mt-0 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <DetailItem
                  label={tAdmin("auditLogs.actor")}
                  value={
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        size="sm"
                        user={{
                          full_name: entry.actor_name || entry.actor_email || "?",
                          avatar_url: entry.actor_avatar_url ?? null,
                        }}
                      />
                      <span>{entry.actor_name || entry.actor_email || tAdmin("common.system")}</span>
                    </div>
                  }
                />
                <DetailItem label={tAdmin("common.email")} value={entry.actor_email || "—"} />
                <DetailItem label={tAdmin("auditLogs.actionType")} value={<ActionBadge action={entry.action_type} />} />
                <DetailItem label={tAdmin("auditLogs.tableEntity")} value={
                  <code className="font-mono text-xs bg-muted rounded px-1.5 py-0.5">{entry.table_name ?? entry.entity_type ?? "—"}</code>
                } />
                <DetailItem label={tAdmin("auditLogs.entityId")} value={<span className="font-mono text-xs">{entry.entity_id || "—"}</span>} />
                <DetailItem label="Audit ID" value={<span className="font-mono text-xs">{entry.id}</span>} />
                <DetailItem label={tAdmin("auditLogs.timestamp")} value={formatDate(entry.timestamp)} />
                <DetailItem label={tAdmin("auditLogs.sourceLabel")} value={
                  <Badge variant="outline" className="text-xs">
                    {entry.source === "audit_logs" ? tAdmin("auditLogs.dataChanges") : "Settlement"}
                  </Badge>
                } />
              </div>
              {hasMetadata && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-1">Metadata</h4>
                  <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </TabsContent>

            <TabsContent value="changes" className="mt-0 pb-4">
              {hasOldNewData ? (
                <DiffView oldData={entry.old_data} newData={entry.new_data} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {tAdmin("auditLogs.noDetailData")}
                </p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
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
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-stats"] });
    },
    onError: (error) => {
      toast.error(tAdmin("auditLogs.revertError", { message: error.message }));
    },
  });
}

function hasSettlementRevertPayload(entry: AuditLogEntry): boolean {
  const splits = entry.old_data?.splits;
  if (Array.isArray(splits) && splits.length > 0) return true;

  const priorStates = entry.metadata?.priorStates;
  if (Array.isArray(priorStates) && priorStates.length > 0) return true;

  const splitIds = entry.metadata?.splitIds ?? entry.new_data?.split_ids;
  return Array.isArray(splitIds) && splitIds.length > 0;
}

function canRevertEntry(entry: AuditLogEntry): boolean {
  if (entry.source === "audit_logs") {
    if (entry.action_type === "SETTLE_SUMMARY" && hasSettlementRevertPayload(entry)) return true;
    if (entry.action_type === "DELETE" && entry.old_data) return true;
    if (entry.action_type === "UPDATE" && entry.old_data) return true;
    if (entry.action_type === "INSERT" && entry.entity_id) return true;
    return false;
  }

  // Settlement trail summaries (incl. legacy settle_all_* without SETTLE_SUMMARY)
  if (
    entry.source === "audit_trail" &&
    SETTLEMENT_SUMMARY_ACTIONS.has(entry.action_type) &&
    hasSettlementRevertPayload(entry)
  ) {
    return true;
  }

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
        : SETTLEMENT_SUMMARY_ACTIONS.has(entry.action_type)
          ? "Settle Up"
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

export function AdminAuditLogs({ embedded = false }: { embedded?: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
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
    setPage(0);
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

  const filterCount = [actionFilter !== "all", tableFilter !== "all", actorFilter !== "all", dateFrom !== "", dateTo !== ""].filter(Boolean).length;

  return (
    <AdminSection>
      <AdminPageHeader
        title={tAdmin("auditLogs.title")}
        description={tAdmin("auditLogs.description")}
        density={embedded ? "section" : "page"}
      />

      {/* KPI Strip */}
      <AuditKpiStrip stats={stats} loading={statsLoading} />

      {/* Analytics breakdown — collapsible */}
      {!statsLoading && stats && (stats.by_table.length > 0 || stats.by_actor.length > 0) && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center gap-3 cursor-pointer group text-left">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                Analytics
              </span>
              <div className="flex-1 h-px bg-border/60" />
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground transition-transform duration-200" style={{ transform: "rotate(0deg)" }} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.by_table.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{tAdmin("auditLogs.byTable")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stats.by_table.map((item) => {
                      const pct = stats.total > 0 ? (item.count / stats.total) * 100 : 0;
                      return (
                        <div key={item.name} className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs min-w-[100px] justify-center">
                            {item.name}
                          </Badge>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${Math.max(pct, 1)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                            {item.count.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
              {stats.by_actor.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{tAdmin("auditLogs.byActor")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stats.by_actor.map((item) => {
                      const pct = stats.total > 0 ? (item.count / stats.total) * 100 : 0;
                      return (
                        <div key={item.name} className="flex items-center gap-2">
                          <span className="text-xs min-w-[100px] truncate">{item.name}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary/40 rounded-full transition-all" style={{ width: `${Math.max(pct, 1)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                            {item.count.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Main Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{tAdmin("auditLogs.title")}</CardTitle>
        </CardHeader>

        <CardContent className="p-0 space-y-0">
          {/* Toolbar */}
          <div className="px-6 pt-2">
            <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="relative w-full sm:max-w-xs">
                  <ScrollTextIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={tAdmin("auditLogs.searchPlaceholder")}
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                    className="h-10 pl-9 sm:h-9"
                  />
                </div>
                {search && (
                  <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 shrink-0" onClick={() => setSearch("")}>
                    <XIcon className="h-4 w-4" />
                  </Button>
                )}
                <AuditFilterPopover
                  filterCount={filterCount}
                  actionFilter={actionFilter} setActionFilter={(v) => { setActionFilter(v); setPage(0); }}
                  tableFilter={tableFilter} setTableFilter={(v) => { setTableFilter(v); setPage(0); }}
                  actorFilter={actorFilter} setActorFilter={(v) => { setActorFilter(v); setPage(0); }}
                  dateFrom={dateFrom} setDateFrom={(v) => { setDateFrom(v); setPage(0); }}
                  dateTo={dateTo} setDateTo={(v) => { setDateTo(v); setPage(0); }}
                  filterOptions={filterOptions}
                  onClear={clearFilters}
                  tap={tap}
                />
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
                <Button variant="outline" size="sm" onClick={() => { tap(); refetch(); }} disabled={isFetching}>
                  <RefreshCwIcon className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                  {tAdmin("common.refresh")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => void handleExportAll()} disabled={total === 0 || isExporting}>
                  {isExporting ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <DownloadIcon className="mr-2 h-4 w-4" />}
                  {isExporting ? tAdmin("auditLogs.exporting") : tAdmin("auditLogs.exportCsvCount", { total: total.toLocaleString() })}
                </Button>
              </div>
            </div>
            <AdminFilterChips
              filters={[
                ...(actionFilter !== "all" ? [{ key: "action", label: tAdmin("auditLogs.filters.action", { value: actionFilter }), onRemove: () => { tap(); setActionFilter("all"); setPage(0); } }] : []),
                ...(tableFilter !== "all" ? [{ key: "table", label: tAdmin("auditLogs.filters.table", { value: tableFilter }), onRemove: () => { tap(); setTableFilter("all"); setPage(0); } }] : []),
                ...(actorFilter !== "all" ? [{ key: "actor", label: tAdmin("auditLogs.filters.actor", { value: filterOptions?.actors?.find((a) => a.id === actorFilter)?.name ?? actorFilter }), onRemove: () => { tap(); setActorFilter("all"); setPage(0); } }] : []),
                ...(dateFrom !== "" ? [{ key: "dateFrom", label: tAdmin("transactions.filterChips.dateFrom", { value: dateFrom }), onRemove: () => { setDateFrom(""); setPage(0); } }] : []),
                ...(dateTo !== "" ? [{ key: "dateTo", label: tAdmin("transactions.filterChips.dateTo", { value: dateTo }), onRemove: () => { setDateTo(""); setPage(0); } }] : []),
              ]}
              onClearAll={clearFilters}
            />
          </div>


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
              <div className="hidden overflow-x-auto rounded-none border-y lg:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-[160px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tAdmin("auditLogs.timestamp")}</TableHead>
                      <TableHead className="w-[200px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tAdmin("auditLogs.actor")}</TableHead>
                      <TableHead className="w-[110px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tAdmin("auditLogs.actionType")}</TableHead>
                      <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tAdmin("auditLogs.tableEntity")}</TableHead>
                      <TableHead className="w-[80px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tAdmin("auditLogs.sourceLabel")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tAdmin("common.details")}</TableHead>
                      <TableHead className="w-[80px] text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tAdmin("auditLogs.revert")}</TableHead>
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
                        className="data-[state=selected]:bg-muted border-b transition-colors cursor-pointer hover:bg-accent/30 group"
                        onClick={() => {
                          tap();
                          setSelectedEntry(entry);
                          setDetailOpen(true);
                        }}
                      >
                        <TableCell className="border-l-2 border-transparent group-hover:border-primary/40 transition-colors">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium tabular-nums">{formatDate(entry.timestamp)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              size="sm"
                              user={{
                                full_name: entry.actor_name || entry.actor_email || "?",
                                avatar_url: entry.actor_avatar_url ?? null,
                              }}
                              className="h-7 w-7"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium truncate max-w-[140px]">
                                {entry.actor_name || entry.actor_email || tAdmin("common.system")}
                              </span>
                              {entry.actor_name && entry.actor_email && (
                                <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{entry.actor_email}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={entry.action_type} />
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

              <div className="space-y-3 lg:hidden">
                <AdminMobileCards
                  items={entries}
                  getKey={(entry) => entry.id}
                  renderItem={(entry) => (
                    <AdminMobileCard
                      title={entry.table_name ?? entry.entity_type ?? "—"}
                      description={`${entry.actor_name || entry.actor_email || tAdmin("common.system")} · ${formatDate(entry.timestamp)}`}
                      leading={
                        <UserAvatar
                          size="sm"
                          user={{
                            full_name: entry.actor_name || entry.actor_email || "?",
                            avatar_url: entry.actor_avatar_url ?? null,
                          }}
                        />
                      }
                      badges={
                        <>
                          <ActionBadge action={entry.action_type} />
                          <Badge variant={entry.source === "audit_logs" ? "secondary" : "outline"} className="text-xs font-mono">
                            {entry.source === "audit_logs" ? "DB" : "Trail"}
                          </Badge>
                        </>
                      }
                      meta={[
                        { label: tAdmin("auditLogs.actor"), value: entry.actor_name || entry.actor_email || tAdmin("common.system") },
                        { label: tAdmin("auditLogs.entityId"), value: <span className="font-mono text-xs">{entry.entity_id?.slice(0, 8) || "—"}</span> },
                        { label: tAdmin("common.details"), value: getDetailSummary(entry, tAdmin) },
                        { label: "Audit ID", value: <span className="font-mono text-xs">{entry.id.slice(0, 8)}</span> },
                      ]}
                      actions={canRevertEntry(entry) ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 cursor-pointer text-muted-foreground hover:text-[var(--status-warning-foreground)]"
                          aria-label={tAdmin("auditLogs.revertAria")}
                          onClick={() => {
                            warning();
                            setRevertEntry(entry);
                            setRevertDialogOpen(true);
                          }}
                        >
                          <Undo2Icon className="h-4 w-4" />
                        </Button>
                      ) : undefined}
                      onClick={() => {
                        tap();
                        setSelectedEntry(entry);
                        setDetailOpen(true);
                      }}
                      ariaLabel={entry.table_name ?? entry.entity_type ?? entry.id}
                    />
                  )}
                />
              </div>

              {/* Pagination */}
              <div className="hidden items-center justify-between pt-2 lg:flex">
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
              <div className="lg:hidden">
                <AdminMobilePagination
                  summary={tAdmin("auditLogs.showingResults", {
                    from: page * PAGE_SIZE + 1,
                    to: Math.min((page + 1) * PAGE_SIZE, total),
                    total: total.toLocaleString(),
                  })}
                  previousLabel={tAdmin("common.previous")}
                  nextLabel={tAdmin("common.next")}
                  canPrevious={page > 0}
                  canNext={page < totalPages - 1}
                  onPrevious={() => { tap(); setPage((p) => p - 1); }}
                  onNext={() => { tap(); setPage((p) => p + 1); }}
                >
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
                </AdminMobilePagination>
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

function getSettlementSummary(entry: AuditLogEntry): string | null {
  if (!SETTLEMENT_SUMMARY_ACTIONS.has(entry.action_type)) return null;

  const amount =
    (entry.new_data?.total_amount as number | undefined) ??
    (entry.metadata?.totalAmount as number | undefined);
  const currency =
    (entry.new_data?.currency as string | undefined) ??
    (entry.metadata?.currency as string | undefined) ??
    "";
  const splitCount =
    (entry.new_data?.splits_updated as number | undefined) ??
    (entry.metadata?.splitsUpdated as number | undefined) ??
    (Array.isArray(entry.new_data?.split_ids) ? entry.new_data.split_ids.length : undefined) ??
    (Array.isArray(entry.metadata?.splitIds) ? (entry.metadata.splitIds as unknown[]).length : undefined);

  const parts: string[] = ["Settle Up"];
  if (typeof amount === "number") {
    parts.push(currency ? `${amount} ${currency}` : String(amount));
  }
  if (typeof splitCount === "number") {
    parts.push(`${splitCount} split(s)`);
  }
  return parts.join(" · ");
}

function getDetailSummary(entry: AuditLogEntry, tAdmin: ReturnType<typeof useAdminTranslation>["tAdmin"]): string {
  const settlementSummary = getSettlementSummary(entry);
  if (settlementSummary) return settlementSummary;

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
