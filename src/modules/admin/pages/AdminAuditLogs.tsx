import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import {
  AUDIT_PREVIEW_ENTITY_HINTS,
  AUDIT_PREVIEW_ENTRY,
} from "./admin-audit-logs/audit-preview.fixture";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

import { supabaseClient } from "@/utility/supabaseClient";
import { Button } from "@/components/ui/button";
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
  ChevronUpIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";
import { AdminPageHeader } from "@/modules/admin/components/AdminPageHeader";
import { AdminPageToolbar } from "@/modules/admin/components/AdminPageToolbar";
import { AdminFilterChips } from "@/modules/admin/components/AdminFilterChips";
import { AdminTableScroll } from "@/modules/admin/components/AdminTableScroll";
import { AdminMasterDetail } from "@/modules/admin/components/AdminMasterDetail";
import { useAdminTranslation } from "../i18n";
import type { AuditLogEntry, AuditLogsResponse } from "../types";
import { useHaptics } from "@/hooks/use-haptics";
import { PAGE_SIZE } from "./admin-audit-logs/constants";
import {
  useAuditLogs,
  useAuditStats,
  useAuditFilterOptions,
  useRevertAuditEntry,
} from "./admin-audit-logs/hooks";
import { canRevertEntry, exportToCsv } from "./admin-audit-logs/helpers";
import { AuditKpiChips } from "./admin-audit-logs/kpi-strip";
import { AuditStatsPopover } from "./admin-audit-logs/stats-popover";
import { AuditFilterFields } from "./admin-audit-logs/filter-popover";
import {
  AuditDetailBody,
  AuditDetailMeta,
  AuditDetailTitle,
} from "./admin-audit-logs/audit-detail-body";
import {
  AuditLogCards,
  AuditLogTable,
  AuditPagination,
} from "./admin-audit-logs/audit-log-table";
import { RevertAuditDialog } from "./admin-audit-logs/revert-dialog";
import { useRowKeyboardNav } from "../hooks/use-row-keyboard-nav";

const ENTRY_PARAM = "entry";

function isAuditPreviewMode() {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("auditPreview") === "1"
  );
}

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
  const [filterOpen, setFilterOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get(ENTRY_PARAM);
  /** Last clicked entry, so the pane survives paging away from its row */
  const [pinnedEntry, setPinnedEntry] = useState<AuditLogEntry | null>(() =>
    isAuditPreviewMode() ? AUDIT_PREVIEW_ENTRY : null
  );
  const [revertEntry, setRevertEntry] = useState<AuditLogEntry | null>(null);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const revertMutation = useRevertAuditEntry();
  const { tap, warning } = useHaptics();

  useEffect(() => {
    if (!isAuditPreviewMode()) return;
    setSearchParams(
      (prev) => {
        if (prev.get(ENTRY_PARAM)) return prev;
        const next = new URLSearchParams(prev);
        next.set(ENTRY_PARAM, AUDIT_PREVIEW_ENTRY.id);
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

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

  const selectedEntry = selectedId
    ? (entries.find((e) => e.id === selectedId) ??
      (pinnedEntry?.id === selectedId ? pinnedEntry : null))
    : null;
  const detailOpen = selectedEntry !== null;

  const selectEntry = useCallback(
    (entry: AuditLogEntry | null) => {
      setPinnedEntry(entry);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (entry) next.set(ENTRY_PARAM, entry.id);
          else next.delete(ENTRY_PARAM);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const handleSelect = useCallback(
    (entry: AuditLogEntry) => {
      tap();
      selectEntry(entry);
    },
    [tap, selectEntry]
  );

  const openRevert = useCallback(
    (entry: AuditLogEntry) => {
      warning();
      setRevertEntry(entry);
      setRevertDialogOpen(true);
    },
    [warning]
  );

  useRowKeyboardNav({
    enabled: detailOpen && !revertDialogOpen,
    rows: entries,
    getId: (entry) => entry.id,
    selectedId,
    onSelect: handleSelect,
    containerRef: scrollRef,
  });

  const selectedIndex = selectedEntry ? entries.findIndex((e) => e.id === selectedEntry.id) : -1;

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

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(0); };

  const chipFilters = [
    ...(actionFilter !== "all" ? [{ key: "action", label: tAdmin("auditLogs.filters.action", { value: actionFilter }), onRemove: () => { tap(); setActionFilter("all"); setPage(0); } }] : []),
    ...(tableFilter !== "all" ? [{ key: "table", label: tAdmin("auditLogs.filters.table", { value: tableFilter }), onRemove: () => { tap(); setTableFilter("all"); setPage(0); } }] : []),
    ...(actorFilter !== "all" ? [{ key: "actor", label: tAdmin("auditLogs.filters.actor", { value: filterOptions?.actors?.find((a) => a.id === actorFilter)?.name ?? actorFilter }), onRemove: () => { tap(); setActorFilter("all"); setPage(0); } }] : []),
    ...(dateFrom !== "" ? [{ key: "dateFrom", label: tAdmin("transactions.filterChips.dateFrom", { value: dateFrom }), onRemove: () => { setDateFrom(""); setPage(0); } }] : []),
    ...(dateTo !== "" ? [{ key: "dateTo", label: tAdmin("transactions.filterChips.dateTo", { value: dateTo }), onRemove: () => { setDateTo(""); setPage(0); } }] : []),
  ];

  // Chrome above/below the table at lg+: navbar, (page header), toolbar, chips, pagination.
  const tableOffset = `${(embedded ? 15.75 : 19.75) + (chipFilters.length > 0 ? 2.25 : 0)}rem`;

  const master = isLoading ? (
    <div className="flex items-center justify-center rounded-md border py-12">
      <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ) : isEmptyResult ? (
    <Empty className="min-h-[200px] rounded-md border">
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
  ) : (
    <div className="flex min-w-0 flex-col gap-3">
      <AdminTableScroll ref={scrollRef} offset={tableOffset} className="hidden lg:block">
        <AuditLogTable
          entries={entries}
          selectedId={selectedEntry?.id ?? null}
          compact={detailOpen}
          onSelect={handleSelect}
          onRevert={openRevert}
        />
      </AdminTableScroll>
      <div className="lg:hidden">
        <AuditLogCards entries={entries} onSelect={handleSelect} onRevert={openRevert} />
      </div>
      <AuditPagination
        page={page}
        total={total}
        totalPages={totalPages}
        onPage={(p) => { tap(); setPage(p); }}
      />
    </div>
  );

  const stepSelection = (step: 1 | -1) => {
    const next = entries[selectedIndex + step];
    if (next) handleSelect(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {!embedded ? (
        <AdminPageHeader
          title={tAdmin("auditLogs.title")}
          description={tAdmin("auditLogs.description")}
          className="mb-1"
        />
      ) : null}

      <AdminPageToolbar
        search={search}
        onSearchChange={resetPage(setSearch)}
        searchPlaceholder={tAdmin("auditLogs.searchPlaceholder")}
        filterCount={filterCount}
        filterOpen={filterOpen}
        onFilterOpenChange={setFilterOpen}
        filterContent={
          <AuditFilterFields
            filterCount={filterCount}
            actionFilter={actionFilter} setActionFilter={resetPage(setActionFilter)}
            tableFilter={tableFilter} setTableFilter={resetPage(setTableFilter)}
            actorFilter={actorFilter} setActorFilter={resetPage(setActorFilter)}
            dateFrom={dateFrom} setDateFrom={resetPage(setDateFrom)}
            dateTo={dateTo} setDateTo={resetPage(setDateTo)}
            filterOptions={filterOptions}
            onClear={clearFilters}
            onDone={() => setFilterOpen(false)}
            tap={tap}
          />
        }
        meta={<AuditKpiChips stats={stats} loading={statsLoading} />}
        actions={
          <>
            <AuditStatsPopover stats={stats} loading={statsLoading} />
            <Button
              variant="outline"
              size="sm"
              className="h-10 sm:h-9"
              onClick={() => { tap(); void refetch(); }}
              disabled={isFetching}
              aria-label={tAdmin("common.refresh")}
            >
              <RefreshCwIcon className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              <span className="hidden 2xl:inline">{tAdmin("common.refresh")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 sm:h-9"
              onClick={() => void handleExportAll()}
              disabled={total === 0 || isExporting}
            >
              {isExporting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <DownloadIcon className="h-4 w-4" />}
              {isExporting ? tAdmin("auditLogs.exporting") : tAdmin("auditLogs.exportCsvCount", { total: total.toLocaleString() })}
            </Button>
          </>
        }
      />

      <AdminFilterChips filters={chipFilters} onClearAll={clearFilters} />

      <AdminMasterDetail
        id="audit-logs"
        open={detailOpen}
        onOpenChange={(open) => { if (!open) selectEntry(null); }}
        size="xl"
        title={selectedEntry ? <AuditDetailTitle entry={selectedEntry} /> : tAdmin("auditLogs.title")}
        description={selectedEntry ? <AuditDetailMeta entry={selectedEntry} /> : undefined}
        headerActions={
          selectedIndex !== -1 ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={selectedIndex <= 0}
                aria-label={tAdmin("layout.devtool.previousRow")}
                title={tAdmin("layout.devtool.keyboardHint")}
                onClick={() => stepSelection(-1)}
              >
                <ChevronUpIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={selectedIndex >= entries.length - 1}
                aria-label={tAdmin("layout.devtool.nextRow")}
                title={tAdmin("layout.devtool.keyboardHint")}
                onClick={() => stepSelection(1)}
              >
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </>
          ) : null
        }
        footer={
          selectedEntry ? (
            <>
              <span className="mr-auto hidden text-[11px] text-muted-foreground xl:inline">
                {tAdmin("layout.devtool.keyboardHint")}
              </span>
              {canRevertEntry(selectedEntry) ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 hover:text-[var(--status-warning-foreground)]"
                  onClick={() => openRevert(selectedEntry)}
                >
                  <Undo2Icon className="h-4 w-4" />
                  {tAdmin("auditLogs.revert")}
                </Button>
              ) : null}
            </>
          ) : undefined
        }
        master={master}
        detail={
          selectedEntry ? (
            <AuditDetailBody
              key={selectedEntry.id}
              entry={selectedEntry}
              entityHints={
                selectedEntry.id === AUDIT_PREVIEW_ENTRY.id ? AUDIT_PREVIEW_ENTITY_HINTS : undefined
              }
            />
          ) : null
        }
      />

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
                void refetch();
              },
            });
          }
        }}
        isReverting={revertMutation.isPending}
      />
    </div>
  );
}
