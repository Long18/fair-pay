import { useMemo, useState, useCallback, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useQueryClient } from "@tanstack/react-query";

import { supabaseClient } from "@/utility/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Loader2Icon,
  AlertCircleIcon,
  CheckCircle2Icon,
} from "@/components/ui/icons";
import { AdminMobilePagination } from "@/modules/admin/components/AdminMobileCards";
import { useAdminTranslation } from "../i18n";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { AdminPageHeader } from "../components/AdminPageHeader";
import type {
  AgentOperationRow,
  ExternalAgentSubmissionRow,
} from "../types";
import { PAGE_SIZE, type AgentOpsFeed, type ListParams } from "./admin-agent-ops/constants";
import {
  useAgentOperations,
  useExternalSubmissions,
  useAgentMetrics,
  useExternalMetrics,
} from "./admin-agent-ops/hooks";
import { MetricsRow } from "./admin-agent-ops/metrics-row";
import { FiltersBar } from "./admin-agent-ops/filters-bar";
import {
  OperationsTable,
  ExternalSubmissionsTable,
  OperationsCardsList,
  ExternalCardsList,
} from "./admin-agent-ops/tables-and-cards";
import {
  OperationDetailDialog,
  ExternalDetailDialog,
} from "./admin-agent-ops/detail-dialogs";

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
  const [selectedOp, setSelectedOp] = useState<AgentOperationRow | null>(null);
  const [selectedExt, setSelectedExt] = useState<ExternalAgentSubmissionRow | null>(
    null
  );

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
  }, []);

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v);
    setPage(0);
  }, []);

  const handleStatusChange = useCallback((v: string) => {
    setStatus(v);
    setPage(0);
  }, []);

  const handleSourceChange = useCallback((v: string) => {
    setSource(v);
    setPage(0);
  }, []);

  const handleDateFromChange = useCallback((v: string) => {
    setDateFrom(v);
    setPage(0);
  }, []);

  const handleDateToChange = useCallback((v: string) => {
    setDateTo(v);
    setPage(0);
  }, []);

  const opRows = operationsQuery.data?.data ?? [];
  const extRows = externalQuery.data?.data ?? [];
  const total =
    feed === "external"
      ? (externalQuery.data?.total ?? 0)
      : (operationsQuery.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(
    debouncedSearch || status !== "all" || source !== "all" || dateFrom || dateTo
  );

  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title={tAdmin("agentOperations.title")}
        description={tAdmin("agentOperations.description")}
        density={embedded ? "section" : "page"}
      />

      <MetricsRow
        feed={feed}
        operationMetrics={metricsQuery.data}
        externalMetrics={externalMetricsQuery.data}
        isLoading={
          feed === "external"
            ? externalMetricsQuery.isLoading
            : metricsQuery.isLoading
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <FiltersBar
            feed={feed}
            onFeedChange={handleFeedChange}
            search={search}
            onSearchChange={handleSearchChange}
            status={status}
            onStatusChange={handleStatusChange}
            source={source}
            onSourceChange={handleSourceChange}
            dateFrom={dateFrom}
            onDateFromChange={handleDateFromChange}
            dateTo={dateTo}
            onDateToChange={handleDateToChange}
            onRefresh={handleRefresh}
            isFetching={activeQuery.isFetching}
          />

          {activeQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2Icon className="h-5 w-5 animate-spin" />
              {tAdmin("common.loading")}
            </div>
          ) : activeQuery.isError ? (
            <Empty>
              <EmptyMedia variant="icon">
                <AlertCircleIcon className="h-6 w-6 text-destructive" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>
                  {tAdmin("common.errorWithMessage", {
                    message:
                      activeQuery.error instanceof Error
                        ? activeQuery.error.message
                        : "",
                  })}
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (feed === "external" ? extRows : opRows).length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <CheckCircle2Icon className="h-6 w-6 text-muted-foreground" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>
                  {feed === "external"
                    ? tAdmin("agentOperations.externalNoResultsTitle")
                    : tAdmin("agentOperations.noResultsTitle")}
                </EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? tAdmin("agentOperations.noResultsFiltered")
                    : feed === "external"
                      ? tAdmin("agentOperations.externalNoResultsEmpty")
                      : tAdmin("agentOperations.noResultsEmpty")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {feed === "external" ? (
                isMobile ? (
                  <ExternalCardsList
                    rows={extRows}
                    onRowClick={setSelectedExt}
                  />
                ) : (
                  <ExternalSubmissionsTable
                    rows={extRows}
                    onRowClick={setSelectedExt}
                  />
                )
              ) : isMobile ? (
                <OperationsCardsList rows={opRows} onRowClick={setSelectedOp} />
              ) : (
                <OperationsTable rows={opRows} onRowClick={setSelectedOp} />
              )}

              <AdminMobilePagination
                summary={tAdmin("agentOperations.showingResults", {
                  from,
                  to,
                  total,
                })}
                previousLabel={tAdmin("common.previous")}
                nextLabel={tAdmin("common.next")}
                canPrevious={page > 0}
                canNext={page < totalPages - 1}
                onPrevious={() => setPage((p) => Math.max(0, p - 1))}
                onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              />
            </>
          )}
        </CardContent>
      </Card>

      <OperationDetailDialog
        open={selectedOp !== null}
        row={selectedOp}
        onOpenChange={(open) => {
          if (!open) setSelectedOp(null);
        }}
      />
      <ExternalDetailDialog
        open={selectedExt !== null}
        row={selectedExt}
        onOpenChange={(open) => {
          if (!open) setSelectedExt(null);
        }}
      />
    </div>
  );
}
