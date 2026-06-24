import { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabaseClient } from "@/utility/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
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
} from "@/components/ui/empty";
import {
  ZapIcon,
  Loader2Icon,
  RefreshCwIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
} from "@/components/ui/icons";
import {
  AdminMobileCard,
  AdminMobileCards,
  AdminMobilePagination,
} from "@/modules/admin/components/AdminMobileCards";
import { useAdminTranslation } from "../i18n";
import { formatDate } from "@/lib/locale-utils";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { cn } from "@/lib/utils";
import type {
  AgentOperationRow,
  AgentOperationStatus,
  AgentOperationMetrics,
  AdminAgentOperationsResponse,
} from "../types";
import {
  STATUS_VARIANT,
  formatVndAmount,
  buildDetailViewModel,
} from "./admin-agent-operations.utils";

// ─── Constants ──────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_VALUES: ReadonlyArray<AgentOperationStatus> = [
  "pending",
  "previewed",
  "confirmed",
  "committed",
  "failed",
  "expired",
] as const;

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

// ─── Hooks ──────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface ListParams {
  search: string;
  status: AgentOperationStatus | "all";
  dateFrom: string;
  dateTo: string;
  page: number;
}

function useAgentOperations(params: ListParams) {
  return useQuery<AdminAgentOperationsResponse>({
    queryKey: ["admin", "agent-operations", params],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("admin_list_agent_operations", {
        p_status: params.status === "all" ? null : params.status,
        p_user_id: null,
        p_date_from: params.dateFrom ? new Date(params.dateFrom).toISOString() : null,
        p_date_to: params.dateTo
          ? new Date(params.dateTo + "T23:59:59").toISOString()
          : null,
        p_search: params.search || null,
        p_limit: PAGE_SIZE,
        p_offset: params.page * PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? {
        data: [],
        total: 0,
        limit: PAGE_SIZE,
        offset: 0,
      }) as AdminAgentOperationsResponse;
    },
    refetchInterval: 30_000,    // fallback poll: catches any realtime misses
    refetchOnWindowFocus: true, // refresh when admin switches back to this tab
  });
}

function useAgentMetrics(params: { dateFrom: string; dateTo: string }) {
  return useQuery<AgentOperationMetrics>({
    queryKey: ["admin", "agent-operation-metrics", params],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("admin_get_agent_operation_metrics", {
        p_date_from: params.dateFrom ? new Date(params.dateFrom).toISOString() : null,
        p_date_to: params.dateTo
          ? new Date(params.dateTo + "T23:59:59").toISOString()
          : null,
      });
      if (error) throw error;
      return (data ?? {
        total: 0,
        by_status: {},
        ops_today: 0,
        ops_last_7d: 0,
        ops_last_30d: 0,
        unique_users: 0,
        avg_commit_seconds: null,
        median_commit_seconds: null,
        p95_commit_seconds: null,
        completion_rate: 0,
        failure_rate: 0,
        active_previews: 0,
      }) as AgentOperationMetrics;
    },
    refetchInterval: 60_000,    // metrics are less time-sensitive; poll once a minute
    refetchOnWindowFocus: true,
  });
}

// ─── Subcomponents ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: AgentOperationStatus }) {
  const { tAdmin } = useAdminTranslation();
  return (
    <Badge variant={STATUS_VARIANT[status]} className="capitalize">
      {tAdmin(`agentOperations.status.${status}` as `agentOperations.status.${AgentOperationStatus}`)}
    </Badge>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </div>
        <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function MetricsRow({
  metrics,
  isLoading,
}: {
  metrics: AgentOperationMetrics | undefined;
  isLoading: boolean;
}) {
  const { tAdmin } = useAdminTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2Icon className="h-4 w-4 animate-spin" />
        {tAdmin("common.loading")}
      </div>
    );
  }
  if (!metrics) return null;

  const p95 = metrics.p95_commit_seconds;
  const p95Display =
    p95 == null
      ? tAdmin("agentOperations.metrics.notAvailable")
      : tAdmin("agentOperations.metrics.seconds", { n: p95 });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <MetricCard label={tAdmin("agentOperations.metrics.total")} value={metrics.total} />
      <MetricCard
        label={tAdmin("agentOperations.metrics.committed")}
        value={metrics.by_status?.committed ?? 0}
      />
      <MetricCard
        label={tAdmin("agentOperations.metrics.failed")}
        value={metrics.by_status?.failed ?? 0}
      />
      <MetricCard
        label={tAdmin("agentOperations.metrics.completionRate")}
        value={`${metrics.completion_rate}%`}
      />
      <MetricCard
        label={tAdmin("agentOperations.metrics.activePreviews")}
        value={metrics.active_previews}
      />
      <MetricCard
        label={tAdmin("agentOperations.metrics.p95CommitTime")}
        value={p95Display}
      />
    </div>
  );
}

function FiltersBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onRefresh,
  isFetching,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  status: AgentOperationStatus | "all";
  onStatusChange: (v: AgentOperationStatus | "all") => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  onRefresh: () => void;
  isFetching: boolean;
}) {
  const { tAdmin } = useAdminTranslation();

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <div className="flex-1 min-w-[180px]">
        <Label className="text-xs text-muted-foreground">
          {tAdmin("common.search")}
        </Label>
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={tAdmin("agentOperations.searchPlaceholder")}
          className="mt-1"
        />
      </div>
      <div className="min-w-[160px]">
        <Label className="text-xs text-muted-foreground">
          {tAdmin("common.status")}
        </Label>
        <Select
          value={status}
          onValueChange={(v) => onStatusChange(v as AgentOperationStatus | "all")}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tAdmin("agentOperations.allStatuses")}</SelectItem>
            {STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {tAdmin(`agentOperations.status.${s}` as `agentOperations.status.${AgentOperationStatus}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">
          {tAdmin("common.fromDate")}
        </Label>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">
          {tAdmin("common.toDate")}
        </Label>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="mt-1"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        aria-label={tAdmin("common.refresh")}
        disabled={isFetching}
      >
        <RefreshCwIcon className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
        {tAdmin("common.refresh")}
      </Button>
    </div>
  );
}

function OperationsTable({
  rows,
  onRowClick,
}: {
  rows: AgentOperationRow[];
  onRowClick: (row: AgentOperationRow) => void;
}) {
  const { tAdmin } = useAdminTranslation();

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tAdmin("agentOperations.columns.user")}</TableHead>
            <TableHead>{tAdmin("agentOperations.columns.status")}</TableHead>
            <TableHead>{tAdmin("agentOperations.columns.group")}</TableHead>
            <TableHead className="text-right">
              {tAdmin("agentOperations.columns.amount")}
            </TableHead>
            <TableHead>{tAdmin("agentOperations.columns.createdAt")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const amount = formatVndAmount(row.total_amount);
            return (
              <TableRow
                key={row.operation_id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick(row)}
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {row.user_full_name ?? tAdmin("common.unknown")}
                    </span>
                    {row.user_email && (
                      <span className="text-xs text-muted-foreground">{row.user_email}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{row.group_name ?? "—"}</span>
                    {row.description && (
                      <span className="max-w-56 truncate text-xs text-muted-foreground">
                        {row.description}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {amount ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(row.created_at, DATE_TIME_FORMAT)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function OperationsCardsList({
  rows,
  onRowClick,
}: {
  rows: AgentOperationRow[];
  onRowClick: (row: AgentOperationRow) => void;
}) {
  const { tAdmin } = useAdminTranslation();

  return (
    <AdminMobileCards
      items={rows}
      getKey={(row) => row.operation_id}
      renderItem={(row) => {
        const amount = formatVndAmount(row.total_amount);
        return (
          <AdminMobileCard
            title={row.user_full_name ?? tAdmin("common.unknown")}
            description={row.user_email ?? undefined}
            badges={<StatusBadge status={row.status} />}
            meta={[
              {
                label: tAdmin("agentOperations.columns.group"),
                value: row.description
                  ? `${row.group_name ?? "—"} · ${row.description}`
                  : row.group_name ?? "—",
              },
              {
                label: tAdmin("agentOperations.columns.amount"),
                value: amount ?? "—",
              },
              {
                label: tAdmin("agentOperations.columns.createdAt"),
                value: formatDate(row.created_at, DATE_TIME_FORMAT),
              },
            ]}
            onClick={() => onRowClick(row)}
            ariaLabel={`Operation ${row.operation_id}`}
          />
        );
      }}
    />
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground col-span-1">{label}</span>
      <span className="col-span-2 break-all">{value}</span>
    </div>
  );
}

function OperationDetailDialog({
  open,
  row,
  onOpenChange,
}: {
  open: boolean;
  row: AgentOperationRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { tAdmin } = useAdminTranslation();

  if (!row) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const view = buildDetailViewModel(row);
  const amount = formatVndAmount(view.total_amount);
  const dash = (
    <span className="text-muted-foreground">
      {tAdmin("agentOperations.detail.na")}
    </span>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ZapIcon className="h-4 w-4" />
            {tAdmin("agentOperations.detail.title")}
          </DialogTitle>
          <DialogDescription asChild>
            <div>
              <StatusBadge status={view.status} />
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y">
          <DetailRow
            label={tAdmin("agentOperations.detail.operationId")}
            value={view.operation_id}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.previewId")}
            value={view.preview_id ?? dash}
          />
          <DetailRow
            label={tAdmin("common.user")}
            value={
              <div className="flex flex-col">
                <span>{view.user_full_name ?? tAdmin("common.unknown")}</span>
                {view.user_email && (
                  <span className="text-xs text-muted-foreground">{view.user_email}</span>
                )}
              </div>
            }
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.userId")}
            value={view.user_id}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.group")}
            value={view.group_name ?? dash}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.description")}
            value={view.description || dash}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.payer")}
            value={view.payer_full_name || dash}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.amount")}
            value={amount ?? dash}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.splitMethod")}
            value={view.split_method || dash}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.splits")}
            value={view.splits_count ?? dash}
          />
          {view.status === "committed" && (
              <DetailRow
                label={tAdmin("agentOperations.detail.expense")}
                value={view.expense_id ?? dash}
              />
          )}
          {(view.status === "failed" || view.status === "expired") && (
            <>
              <DetailRow
                label={tAdmin("agentOperations.detail.errorCode")}
                value={view.error_code || dash}
              />
              <DetailRow
                label={tAdmin("agentOperations.detail.errorMessage")}
                value={view.error_message || dash}
              />
            </>
          )}
          <DetailRow
            label={tAdmin("agentOperations.detail.previewExpiry")}
            value={
              view.preview_expires_at
                ? formatDate(view.preview_expires_at, DATE_TIME_FORMAT)
                : dash
            }
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.previewConsumed")}
            value={
              view.preview_is_consumed == null
                ? dash
                : view.preview_is_consumed
                  ? tAdmin("agentOperations.detail.yes")
                  : tAdmin("agentOperations.detail.no")
            }
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.confirmation")}
            value={
              view.has_confirmation
                ? view.confirmation_used
                  ? tAdmin("agentOperations.detail.used")
                  : tAdmin("agentOperations.detail.created")
                : tAdmin("agentOperations.detail.none")
            }
          />
          <DetailRow
            label={tAdmin("common.createdAt")}
            value={formatDate(view.created_at, DATE_TIME_FORMAT)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export function AdminAgentOperations() {
  const { tAdmin } = useAdminTranslation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AgentOperationStatus | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AgentOperationRow | null>(null);

  // Live updates: subscribe to agent_operations changes so the admin page
  // reflects status transitions (pending → previewed → committed) immediately
  // without requiring a manual Refresh click.
  useEffect(() => {
    const channel = supabaseClient
      .channel("admin:agent-operations-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_operations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin", "agent-operations"] });
          queryClient.invalidateQueries({ queryKey: ["admin", "agent-operation-metrics"] });
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [queryClient]);

  const debouncedSearch = useDebounce(search, 300);

  const listParams: ListParams = useMemo(
    () => ({ search: debouncedSearch, status, dateFrom, dateTo, page }),
    [debouncedSearch, status, dateFrom, dateTo, page]
  );

  const operationsQuery = useAgentOperations(listParams);
  const metricsQuery = useAgentMetrics({ dateFrom, dateTo });

  const handleRefresh = useCallback(() => {
    operationsQuery.refetch();
    metricsQuery.refetch();
  }, [operationsQuery, metricsQuery]);

  const handleRowClick = useCallback((row: AgentOperationRow) => {
    setSelected(row);
  }, []);

  // Filter change handlers reset page to 0 directly to avoid the
  // set-state-in-effect anti-pattern (react-hooks/set-state-in-effect).
  const handleSearchChange = useCallback((v: string) => {
    setSearch(v);
    setPage(0);
  }, []);

  const handleStatusChange = useCallback((v: AgentOperationStatus | "all") => {
    setStatus(v);
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

  const rows = operationsQuery.data?.data ?? [];
  const total = operationsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(debouncedSearch || status !== "all" || dateFrom || dateTo);

  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ZapIcon className="h-5 w-5" />
            {tAdmin("agentOperations.title")}
          </CardTitle>
          <CardDescription>{tAdmin("agentOperations.description")}</CardDescription>
        </CardHeader>
      </Card>

      <MetricsRow metrics={metricsQuery.data} isLoading={metricsQuery.isLoading} />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <FiltersBar
            search={search}
            onSearchChange={handleSearchChange}
            status={status}
            onStatusChange={handleStatusChange}
            dateFrom={dateFrom}
            onDateFromChange={handleDateFromChange}
            dateTo={dateTo}
            onDateToChange={handleDateToChange}
            onRefresh={handleRefresh}
            isFetching={operationsQuery.isFetching}
          />

          {operationsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2Icon className="h-5 w-5 animate-spin" />
              {tAdmin("common.loading")}
            </div>
          ) : operationsQuery.isError ? (
            <Empty>
              <EmptyMedia variant="icon">
                <AlertCircleIcon className="h-6 w-6 text-destructive" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>
                  {tAdmin("common.errorWithMessage", {
                    message:
                      operationsQuery.error instanceof Error
                        ? operationsQuery.error.message
                        : "",
                  })}
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : rows.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <CheckCircle2Icon className="h-6 w-6 text-muted-foreground" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>{tAdmin("agentOperations.noResultsTitle")}</EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? tAdmin("agentOperations.noResultsFiltered")
                    : tAdmin("agentOperations.noResultsEmpty")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {isMobile ? (
                <OperationsCardsList rows={rows} onRowClick={handleRowClick} />
              ) : (
                <OperationsTable rows={rows} onRowClick={handleRowClick} />
              )}

              <AdminMobilePagination
                summary={tAdmin("agentOperations.showingResults", { from, to, total })}
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
        open={selected !== null}
        row={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
