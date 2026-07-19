import { useMemo, useState, useCallback, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabaseClient } from "@/utility/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-display";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import type { AuditLogEntry, AuditLogsResponse } from "../types";
import { useHaptics } from "@/hooks/use-haptics";
import { onButtonKeyDown } from "@/lib/a11y-keyboard";
import { motion } from "framer-motion";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import { AnimatedList } from "@/components/ui/animated-list";
import { AnimatedRow } from "@/components/ui/animated-row";
import { PAGE_SIZE } from "./admin-audit-logs/constants";
import {
  useAuditLogs,
  useAuditStats,
  useAuditFilterOptions,
  useRevertAuditEntry,
} from "./admin-audit-logs/hooks";
import {
  canRevertEntry,
  exportToCsv,
  getDetailSummary,
} from "./admin-audit-logs/helpers";
import { ActionBadge } from "./admin-audit-logs/action-badge";
import { AuditKpiStrip } from "./admin-audit-logs/kpi-strip";
import { AuditFilterPopover } from "./admin-audit-logs/filter-popover";
import { AuditDetailDialog } from "./admin-audit-logs/detail-dialog";
import { RevertAuditDialog } from "./admin-audit-logs/revert-dialog";

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
            <button type="button" className="w-full flex items-center gap-3 cursor-pointer group text-left">
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
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          tap();
                          setSelectedEntry(entry);
                          setDetailOpen(true);
                        }}
                        onKeyDown={onButtonKeyDown(() => {
                          tap();
                          setSelectedEntry(entry);
                          setDetailOpen(true);
                        })}
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
