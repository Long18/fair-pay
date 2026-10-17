import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useQueryClient } from "@tanstack/react-query";

import { supabaseClient } from "@/utility/supabaseClient";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../i18n";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminPageToolbar } from "../components/AdminPageToolbar";
import { AdminFilterChips } from "../components/AdminFilterChips";
import { AdminMasterDetail } from "../components/AdminMasterDetail";
import type {
  AgentOperationRow,
  ExternalAgentSubmissionRow,
} from "../types";
import { evaluateAgentOpsAlerts } from "./admin-agent-operations.utils";
import { PAGE_SIZE, type AgentOpsFeed, type ListParams } from "./admin-agent-ops/constants";
import {
  useAgentOperations,
  useExternalSubmissions,
  useAgentMetrics,
  useExternalMetrics,
} from "./admin-agent-ops/hooks";
import { AgentOpsAlerts, AgentOpsMetricChips } from "./admin-agent-ops/metrics-row";
import { AgentOpsFeedToggle, AgentOpsFilterFields } from "./admin-agent-ops/filters-bar";
import { useAgentSourceLabel, useStatusLabel } from "./admin-agent-ops/badges";
import { AgentOpsFeedList } from "./admin-agent-ops/feed-list";
import {
  AgentOpsDetailTitle,
  ExternalDetailBadges,
  ExternalDetailBody,
  OperationDetailBadges,
  OperationDetailBody,
} from "./admin-agent-ops/detail-panels";
import { useRowKeyboardNav } from "../hooks/use-row-keyboard-nav";

type FeedRow = AgentOperationRow | ExternalAgentSubmissionRow;

function rowId(row: FeedRow) {
  return "submission_id" in row ? row.submission_id : row.operation_id;
}

export function AdminAgentOperations({ embedded = false }: { embedded?: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Default to external — ChatGPT / no-key agents land there, not in agent_operations.
  const [feed, setFeed] = useState<AgentOpsFeed>("external");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedOp, setSelectedOp] = useState<AgentOperationRow | null>(null);
  const [selectedExt, setSelectedExt] = useState<ExternalAgentSubmissionRow | null>(
    null
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const statusLabel = useStatusLabel(feed);
  const sourceLabel = useAgentSourceLabel();

  useEffect(() => {
    const channel = supabaseClient
      .channel("admin:agent-operations-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_operations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin", "agent-operations"] });
          queryClient.invalidateQueries({
            queryKey: ["admin", "agent-operation-metrics"],
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "external_agent_submissions" },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["admin", "external-agent-submissions"],
          });
          queryClient.invalidateQueries({
            queryKey: ["admin", "external-agent-submission-metrics"],
          });
        }
      );

    void channel.subscribe();

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [queryClient]);

  const debouncedSearch = useDebounce(search, 300);

  const listParams: ListParams = useMemo(
    () => ({
      search: debouncedSearch,
      status,
      source,
      dateFrom,
      dateTo,
      page,
    }),
    [debouncedSearch, status, source, dateFrom, dateTo, page]
  );

  const operationsQuery = useAgentOperations(listParams, feed === "operations");
  const externalQuery = useExternalSubmissions(listParams, feed === "external");
  const metricsQuery = useAgentMetrics({ dateFrom, dateTo });
  const externalMetricsQuery = useExternalMetrics({ dateFrom, dateTo });

  const activeQuery = feed === "external" ? externalQuery : operationsQuery;

  const handleRefresh = useCallback(() => {
    operationsQuery.refetch();
    externalQuery.refetch();
    metricsQuery.refetch();
    externalMetricsQuery.refetch();
  }, [operationsQuery, externalQuery, metricsQuery, externalMetricsQuery]);

  const handleFeedChange = useCallback((v: AgentOpsFeed) => {
    setFeed(v);
    setStatus("all");
    setSource("all");
    setPage(0);
    setSelectedOp(null);
    setSelectedExt(null);
  }, []);

  const withPageReset = useCallback(
    (setter: (v: string) => void) => (v: string) => {
      setter(v);
      setPage(0);
    },
    []
  );

  const clearFilters = useCallback(() => {
    setStatus("all");
    setSource("all");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  }, []);

  const opRows = operationsQuery.data?.data ?? [];
  const extRows = externalQuery.data?.data ?? [];
  const rows: FeedRow[] = feed === "external" ? extRows : opRows;
  const total =
    feed === "external"
      ? (externalQuery.data?.total ?? 0)
      : (operationsQuery.data?.total ?? 0);
  const hasFilters = Boolean(
    debouncedSearch || status !== "all" || source !== "all" || dateFrom || dateTo
  );
  const filterCount = [status !== "all", source !== "all", dateFrom !== "", dateTo !== ""].filter(Boolean).length;

  const selectedRow: FeedRow | null = feed === "external" ? selectedExt : selectedOp;
  const selectedId = selectedRow ? rowId(selectedRow) : null;
  const detailOpen = selectedRow !== null;

  const selectRow = useCallback(
    (row: FeedRow) => {
      if ("submission_id" in row) setSelectedExt(row);
      else setSelectedOp(row);
    },
    []
  );
  const closeDetail = useCallback(() => {
    setSelectedOp(null);
    setSelectedExt(null);
  }, []);

  useRowKeyboardNav({
    enabled: detailOpen,
    rows,
    getId: rowId,
    selectedId,
    onSelect: selectRow,
    containerRef: scrollRef,
  });

  const chipFilters = [
    ...(status !== "all"
      ? [{ key: "status", label: `${tAdmin("common.status")}: ${statusLabel(status)}`, onRemove: () => withPageReset(setStatus)("all") }]
      : []),
    ...(source !== "all"
      ? [{ key: "source", label: `${tAdmin("agentOperations.columns.agent")}: ${sourceLabel(source)}`, onRemove: () => withPageReset(setSource)("all") }]
      : []),
    ...(dateFrom
      ? [{ key: "dateFrom", label: tAdmin("transactions.filterChips.dateFrom", { value: dateFrom }), onRemove: () => withPageReset(setDateFrom)("") }]
      : []),
    ...(dateTo
      ? [{ key: "dateTo", label: tAdmin("transactions.filterChips.dateTo", { value: dateTo }), onRemove: () => withPageReset(setDateTo)("") }]
      : []),
  ];

  const alerts = evaluateAgentOpsAlerts(metricsQuery.data);
  const alertCount = alerts ? Number(alerts.highErrorRate) + Number(alerts.opsSpike) : 0;
  // Chrome above/below the table at lg+: navbar, (page header), toolbar, banners, chips, pager.
  const tableOffset = `${(embedded ? 15.75 : 19.75) + alertCount * 2.25 + (chipFilters.length > 0 ? 2.25 : 0)}rem`;

  const metricChips = (
    <AgentOpsMetricChips
      feed={feed}
      operationMetrics={metricsQuery.data}
      externalMetrics={externalMetricsQuery.data}
      isLoading={
        feed === "external" ? externalMetricsQuery.isLoading : metricsQuery.isLoading
      }
    />
  );

  const master = (
    <AgentOpsFeedList
      feed={feed}
      isLoading={activeQuery.isLoading}
      error={activeQuery.isError ? activeQuery.error : undefined}
      hasFilters={hasFilters}
      isMobile={isMobile}
      opRows={opRows}
      extRows={extRows}
      onSelectOp={setSelectedOp}
      onSelectExt={setSelectedExt}
      selectedId={selectedId}
      compact={detailOpen}
      scrollRef={scrollRef}
      tableOffset={tableOffset}
      page={page}
      total={total}
      pageSize={PAGE_SIZE}
      onPage={setPage}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      {!embedded ? (
        <AdminPageHeader
          title={tAdmin("agentOperations.title")}
          description={tAdmin("agentOperations.description")}
          className="mb-1"
        />
      ) : null}

      <AdminPageToolbar
        search={search}
        onSearchChange={withPageReset(setSearch)}
        searchPlaceholder={tAdmin("agentOperations.searchPlaceholder")}
        filterCount={filterCount}
        filterOpen={filterOpen}
        onFilterOpenChange={setFilterOpen}
        filterContent={
          <AgentOpsFilterFields
            feed={feed}
            status={status}
            onStatusChange={withPageReset(setStatus)}
            source={source}
            onSourceChange={withPageReset(setSource)}
            dateFrom={dateFrom}
            onDateFromChange={withPageReset(setDateFrom)}
            dateTo={dateTo}
            onDateToChange={withPageReset(setDateTo)}
            filterCount={filterCount}
            onClear={clearFilters}
            onDone={() => setFilterOpen(false)}
          />
        }
        meta={metricChips}
        actions={
          <>
            <AgentOpsFeedToggle feed={feed} onFeedChange={handleFeedChange} />
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0 sm:h-9 sm:w-9"
              onClick={handleRefresh}
              aria-label={tAdmin("common.refresh")}
              title={tAdmin("common.refresh")}
              disabled={activeQuery.isFetching}
            >
              <RefreshCwIcon className={cn("h-4 w-4", activeQuery.isFetching && "animate-spin")} />
            </Button>
          </>
        }
      />

      <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 scrollbar-none lg:hidden">
        {metricChips}
      </div>

      <AgentOpsAlerts operationMetrics={metricsQuery.data} />

      <AdminFilterChips filters={chipFilters} onClearAll={clearFilters} />

      <AdminMasterDetail
        id="agent-ops"
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
        size="lg"
        title={<AgentOpsDetailTitle external={feed === "external"} />}
        description={
          selectedExt && feed === "external" ? (
            <ExternalDetailBadges row={selectedExt} />
          ) : selectedOp && feed === "operations" ? (
            <OperationDetailBadges row={selectedOp} />
          ) : undefined
        }
        footer={
          detailOpen ? (
            <span className="mr-auto hidden text-[11px] text-muted-foreground xl:inline">
              {tAdmin("layout.devtool.keyboardHint")}
            </span>
          ) : undefined
        }
        master={master}
        detail={
          selectedExt && feed === "external" ? (
            <ExternalDetailBody row={selectedExt} />
          ) : selectedOp && feed === "operations" ? (
            <OperationDetailBody row={selectedOp} />
          ) : null
        }
      />
    </div>
  );
}
