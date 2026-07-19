import { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabaseClient } from "@/utility/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  AlertTriangleIcon,
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
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminMetricCard, AdminMetricGrid } from "../components/AdminMetricCard";
import type {
  AgentOperationRow,
  AgentOperationStatus,
  AgentOperationMetrics,
  AdminAgentOperationsResponse,
  ExternalAgentSubmissionRow,
  ExternalAgentSubmissionStatus,
  ExternalAgentSubmissionMetrics,
  AdminExternalAgentSubmissionsResponse,
} from "../types";
import {
  STATUS_VARIANT,
  EXTERNAL_STATUS_VARIANT,
  formatVndAmount,
  buildDetailViewModel,
  isKnownAgentSource,
  normalizeAgentSource,
  evaluateAgentOpsAlerts,
  AGENT_ALERT_MIN_OPS,
} from "./admin-agent-operations.utils";

// ─── Constants ──────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type AgentOpsFeed = "external" | "operations";

const STATUS_VALUES: ReadonlyArray<AgentOperationStatus> = [
  "pending",
  "previewed",
  "confirmed",
  "committed",
  "failed",
  "expired",
] as const;

const EXTERNAL_STATUS_VALUES: ReadonlyArray<ExternalAgentSubmissionStatus> = [
  "pending",
  "approved",
  "rejected",
  "expired",
  "failed",
] as const;

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

// Typed shim for RPCs not yet in generated Database types.
const rpc = supabaseClient.rpc.bind(supabaseClient) as unknown as (
  fn: string,
  args?: Record<string, unknown>
) => PromiseLike<{ data: unknown; error: Error | null }>;

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
  status: string;
  source: string;
  dateFrom: string;
  dateTo: string;
  page: number;
}

function useAgentOperations(params: ListParams, enabled: boolean) {
  return useQuery<AdminAgentOperationsResponse>({
    queryKey: ["admin", "agent-operations", params],
    enabled,
    queryFn: async () => {
      const { data, error } = await rpc("admin_list_agent_operations", {
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
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

function useExternalSubmissions(params: ListParams, enabled: boolean) {
  return useQuery<AdminExternalAgentSubmissionsResponse>({
    queryKey: ["admin", "external-agent-submissions", params],
    enabled,
    queryFn: async () => {
      const { data, error } = await rpc("admin_list_external_agent_submissions", {
        p_status: params.status === "all" ? null : params.status,
        p_source: params.source === "all" ? null : params.source,
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
      }) as AdminExternalAgentSubmissionsResponse;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

function useAgentMetrics(params: { dateFrom: string; dateTo: string }) {
  return useQuery<AgentOperationMetrics>({
    queryKey: ["admin", "agent-operation-metrics", params],
    queryFn: async () => {
      const { data, error } = await rpc("admin_get_agent_operation_metrics", {
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
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

function useExternalMetrics(params: { dateFrom: string; dateTo: string }) {
  return useQuery<ExternalAgentSubmissionMetrics>({
    queryKey: ["admin", "external-agent-submission-metrics", params],
    queryFn: async () => {
      const { data, error } = await rpc(
        "admin_get_external_agent_submission_metrics",
        {
          p_date_from: params.dateFrom
            ? new Date(params.dateFrom).toISOString()
            : null,
          p_date_to: params.dateTo
            ? new Date(params.dateTo + "T23:59:59").toISOString()
            : null,
        }
      );
      if (error) throw error;
      return (data ?? {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        by_source: {},
      }) as ExternalAgentSubmissionMetrics;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

// ─── Subcomponents ──────────────────────────────────────────────────

function useAgentSourceLabel() {
  const { tAdmin } = useAdminTranslation();
  return useCallback(
    (source: string | null | undefined) => {
      const normalized = normalizeAgentSource(source);
      if (!normalized) return tAdmin("agentOperations.sources.unknown");
      if (isKnownAgentSource(normalized)) {
        return tAdmin(
          `agentOperations.sources.${normalized}` as `agentOperations.sources.${typeof normalized}`
        );
      }
      return normalized;
    },
    [tAdmin]
  );
}

function AgentSourceBadge({ source }: { source: string | null | undefined }) {
  const label = useAgentSourceLabel()(source);
  return (
    <Badge variant="outline" className="font-normal">
      {label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: AgentOperationStatus }) {
  const { tAdmin } = useAdminTranslation();
  return (
    <Badge variant={STATUS_VARIANT[status]} className="capitalize">
      {tAdmin(`agentOperations.status.${status}` as `agentOperations.status.${AgentOperationStatus}`)}
    </Badge>
  );
}

function ExternalStatusBadge({ status }: { status: ExternalAgentSubmissionStatus }) {
  const { tAdmin } = useAdminTranslation();
  return (
    <Badge variant={EXTERNAL_STATUS_VARIANT[status]} className="capitalize">
      {tAdmin(
        `agentOperations.externalStatus.${status}` as `agentOperations.externalStatus.${ExternalAgentSubmissionStatus}`
      )}
    </Badge>
  );
}

function MetricsRow({
  feed,
  operationMetrics,
  externalMetrics,
  isLoading,
}: {
  feed: AgentOpsFeed;
  operationMetrics: AgentOperationMetrics | undefined;
  externalMetrics: ExternalAgentSubmissionMetrics | undefined;
  isLoading: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const alerts = evaluateAgentOpsAlerts(operationMetrics);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2Icon className="h-4 w-4 animate-spin" />
        {tAdmin("common.loading")}
      </div>
    );
  }

  const alertBanners = alerts ? (
      <div className="flex flex-col gap-2">
        {alerts.highErrorRate ? (
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>{tAdmin("agentOperations.metrics.failed")}</AlertTitle>
            <AlertDescription>
              {tAdmin("agentOperations.alerts.highErrorRate", {
                rate: alerts.failureRate,
                min: AGENT_ALERT_MIN_OPS,
              })}
            </AlertDescription>
          </Alert>
        ) : null}
        {alerts.opsSpike ? (
          <Alert>
            <AlertTriangleIcon />
            <AlertTitle>{tAdmin("agentOperations.metrics.today")}</AlertTitle>
            <AlertDescription>
              {tAdmin("agentOperations.alerts.opsSpike", {
                today: alerts.opsToday,
                avg: alerts.dailyAvg7d,
              })}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    ) : null;

  if (feed === "external") {
    if (!externalMetrics) return null;
    const topSource = Object.entries(externalMetrics.by_source ?? {}).sort(
      (a, b) => b[1] - a[1]
    )[0];
    return (
      <>
        {alertBanners}
        <AdminMetricGrid columns={3} className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          <AdminMetricCard
            variant="plain"
            label={tAdmin("agentOperations.metrics.externalTotal")}
            value={externalMetrics.total}
          />
          <AdminMetricCard
            variant="plain"
            label={tAdmin("agentOperations.metrics.externalPending")}
            value={externalMetrics.pending}
          />
          <AdminMetricCard
            variant="plain"
            label={tAdmin("agentOperations.metrics.externalApproved")}
            value={externalMetrics.approved}
          />
          <AdminMetricCard
            variant="plain"
            label={tAdmin("agentOperations.columns.agent")}
            value={topSource?.[0] ?? tAdmin("agentOperations.sources.unknown")}
          />
        </AdminMetricGrid>
      </>
    );
  }

  if (!operationMetrics) return null;

  const p95 = operationMetrics.p95_commit_seconds;
  const p95Display =
    p95 == null
      ? tAdmin("agentOperations.metrics.notAvailable")
      : tAdmin("agentOperations.metrics.seconds", { n: p95 });

  return (
    <>
      {alertBanners}
      <AdminMetricGrid columns={3} className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <AdminMetricCard
          variant="plain"
          label={tAdmin("agentOperations.metrics.total")}
          value={operationMetrics.total}
        />
        <AdminMetricCard
          variant="plain"
          label={tAdmin("agentOperations.metrics.committed")}
          value={operationMetrics.by_status?.committed ?? 0}
        />
        <AdminMetricCard
          variant="plain"
          label={tAdmin("agentOperations.metrics.failed")}
          value={operationMetrics.by_status?.failed ?? 0}
        />
        <AdminMetricCard
          variant="plain"
          label={tAdmin("agentOperations.metrics.completionRate")}
          value={`${operationMetrics.completion_rate}%`}
        />
        <AdminMetricCard
          variant="plain"
          label={tAdmin("agentOperations.metrics.activePreviews")}
          value={operationMetrics.active_previews}
        />
        <AdminMetricCard
          variant="plain"
          label={tAdmin("agentOperations.metrics.p95CommitTime")}
          value={p95Display}
        />
      </AdminMetricGrid>
    </>
  );
}

function FiltersBar({
  feed,
  onFeedChange,
  search,
  onSearchChange,
  status,
  onStatusChange,
  source,
  onSourceChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onRefresh,
  isFetching,
}: {
  feed: AgentOpsFeed;
  onFeedChange: (v: AgentOpsFeed) => void;
  search: string;
  onSearchChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  source: string;
  onSourceChange: (v: string) => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  onRefresh: () => void;
  isFetching: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const sourceLabel = useAgentSourceLabel();

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <div className="min-w-[180px]">
        <Label className="text-xs text-muted-foreground">
          {tAdmin("agentOperations.columns.agent")}
        </Label>
        <Select value={feed} onValueChange={(v) => onFeedChange(v as AgentOpsFeed)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="external">
              {tAdmin("agentOperations.feed.external")}
            </SelectItem>
            <SelectItem value="operations">
              {tAdmin("agentOperations.feed.operations")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
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
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tAdmin("agentOperations.allStatuses")}</SelectItem>
            {feed === "external"
              ? EXTERNAL_STATUS_VALUES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {tAdmin(
                      `agentOperations.externalStatus.${s}` as `agentOperations.externalStatus.${ExternalAgentSubmissionStatus}`
                    )}
                  </SelectItem>
                ))
              : STATUS_VALUES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {tAdmin(
                      `agentOperations.status.${s}` as `agentOperations.status.${AgentOperationStatus}`
                    )}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
      </div>
      {feed === "external" ? (
        <div className="min-w-[160px]">
          <Label className="text-xs text-muted-foreground">
            {tAdmin("agentOperations.columns.agent")}
          </Label>
          <Select value={source} onValueChange={onSourceChange}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAdmin("agentOperations.allSources")}</SelectItem>
              {(["chatgpt", "external_agent"] as const).map((s) => (
                <SelectItem key={s} value={s}>
                  {sourceLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
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
            <TableHead>{tAdmin("agentOperations.columns.agent")}</TableHead>
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
                  <AgentSourceBadge source={row.source} />
                </TableCell>
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

function ExternalSubmissionsTable({
  rows,
  onRowClick,
}: {
  rows: ExternalAgentSubmissionRow[];
  onRowClick: (row: ExternalAgentSubmissionRow) => void;
}) {
  const { tAdmin } = useAdminTranslation();

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tAdmin("agentOperations.columns.agent")}</TableHead>
            <TableHead>{tAdmin("agentOperations.columns.target")}</TableHead>
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
                key={row.submission_id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick(row)}
              >
                <TableCell>
                  <AgentSourceBadge source={row.source} />
                </TableCell>
                <TableCell>
                  <span className="font-medium">{row.target_email}</span>
                </TableCell>
                <TableCell>
                  <ExternalStatusBadge status={row.status} />
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
  const sourceLabel = useAgentSourceLabel();

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
            badges={
              <div className="flex flex-wrap gap-1">
                <AgentSourceBadge source={row.source} />
                <StatusBadge status={row.status} />
              </div>
            }
            meta={[
              {
                label: tAdmin("agentOperations.columns.agent"),
                value: sourceLabel(row.source),
              },
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

function ExternalCardsList({
  rows,
  onRowClick,
}: {
  rows: ExternalAgentSubmissionRow[];
  onRowClick: (row: ExternalAgentSubmissionRow) => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const sourceLabel = useAgentSourceLabel();

  return (
    <AdminMobileCards
      items={rows}
      getKey={(row) => row.submission_id}
      renderItem={(row) => {
        const amount = formatVndAmount(row.total_amount);
        return (
          <AdminMobileCard
            title={row.target_email}
            description={row.description ?? undefined}
            badges={
              <div className="flex flex-wrap gap-1">
                <AgentSourceBadge source={row.source} />
                <ExternalStatusBadge status={row.status} />
              </div>
            }
            meta={[
              {
                label: tAdmin("agentOperations.columns.agent"),
                value: sourceLabel(row.source),
              },
              {
                label: tAdmin("agentOperations.columns.group"),
                value: row.group_name ?? "—",
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
            ariaLabel={`Submission ${row.submission_id}`}
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
  const sourceLabel = useAgentSourceLabel();

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
            <div className="flex flex-wrap gap-2">
              <AgentSourceBadge source={view.source} />
              <StatusBadge status={view.status} />
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y">
          <DetailRow
            label={tAdmin("agentOperations.detail.agent")}
            value={sourceLabel(view.source)}
          />
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

function ExternalDetailDialog({
  open,
  row,
  onOpenChange,
}: {
  open: boolean;
  row: ExternalAgentSubmissionRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const sourceLabel = useAgentSourceLabel();

  if (!row) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const amount = formatVndAmount(row.total_amount);
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
            {tAdmin("agentOperations.detail.externalTitle")}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap gap-2">
              <AgentSourceBadge source={row.source} />
              <ExternalStatusBadge status={row.status} />
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y">
          <DetailRow
            label={tAdmin("agentOperations.detail.agent")}
            value={sourceLabel(row.source)}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.submissionId")}
            value={row.submission_id}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.targetEmail")}
            value={row.target_email}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.group")}
            value={row.group_name ?? dash}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.description")}
            value={row.description || dash}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.amount")}
            value={amount ?? dash}
          />
          <DetailRow
            label={tAdmin("agentOperations.detail.splitMethod")}
            value={row.split_method || dash}
          />
          {row.status === "approved" && (
            <DetailRow
              label={tAdmin("agentOperations.detail.expense")}
              value={row.expense_id ?? dash}
            />
          )}
          {row.status === "rejected" && (
            <DetailRow
              label={tAdmin("agentOperations.detail.rejectReason")}
              value={row.reject_reason || dash}
            />
          )}
          {(row.status === "failed" || row.error_code) && (
            <>
              <DetailRow
                label={tAdmin("agentOperations.detail.errorCode")}
                value={row.error_code || dash}
              />
              <DetailRow
                label={tAdmin("agentOperations.detail.errorMessage")}
                value={row.error_message || dash}
              />
            </>
          )}
          <DetailRow
            label={tAdmin("common.createdAt")}
            value={formatDate(row.created_at, DATE_TIME_FORMAT)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

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
