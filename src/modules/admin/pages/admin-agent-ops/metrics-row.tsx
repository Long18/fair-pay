import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2Icon,
  AlertTriangleIcon,
} from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import { AdminMetricCard, AdminMetricGrid } from "../../components/AdminMetricCard";
import type {
  AgentOperationMetrics,
  ExternalAgentSubmissionMetrics,
} from "../../types";
import {
  evaluateAgentOpsAlerts,
  AGENT_ALERT_MIN_OPS,
} from "../admin-agent-operations.utils";
import type { AgentOpsFeed } from "./constants";

export function MetricsRow({
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
