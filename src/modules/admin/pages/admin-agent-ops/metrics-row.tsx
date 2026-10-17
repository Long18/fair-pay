import { AlertTriangleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";
import type {
  AgentOperationMetrics,
  ExternalAgentSubmissionMetrics,
} from "../../types";
import {
  evaluateAgentOpsAlerts,
  AGENT_ALERT_MIN_OPS,
} from "../admin-agent-operations.utils";
import type { AgentOpsFeed } from "./constants";

function StatChip({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: string | number;
  tone?: "danger";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border bg-card px-2 text-xs",
        tone === "danger" && "border-destructive/40 text-destructive",
        className
      )}
    >
      <span className={tone === "danger" ? "opacity-80" : "text-muted-foreground"}>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}

interface MetricsProps {
  feed: AgentOpsFeed;
  operationMetrics: AgentOperationMetrics | undefined;
  externalMetrics: ExternalAgentSubmissionMetrics | undefined;
  isLoading: boolean;
}

/** Inline stat chips for the toolbar `meta` slot (and a mobile row). */
export function AgentOpsMetricChips({
  feed,
  operationMetrics,
  externalMetrics,
  isLoading,
}: MetricsProps) {
  const { tAdmin } = useAdminTranslation();

  if (isLoading) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="h-7 w-20 shrink-0 animate-pulse rounded-md bg-muted" />
        ))}
      </>
    );
  }

  if (feed === "external") {
    if (!externalMetrics) return null;
    const topSource = Object.entries(externalMetrics.by_source ?? {}).sort(
      (a, b) => b[1] - a[1]
    )[0];
    return (
      <>
        <StatChip label={tAdmin("agentOperations.metrics.externalTotal")} value={externalMetrics.total} />
        <StatChip label={tAdmin("agentOperations.metrics.externalPending")} value={externalMetrics.pending} />
        <StatChip label={tAdmin("agentOperations.metrics.externalApproved")} value={externalMetrics.approved} />
        <StatChip
          label={tAdmin("agentOperations.columns.agent")}
          value={topSource?.[0] ?? tAdmin("agentOperations.sources.unknown")}
          className="hidden xl:inline-flex"
        />
      </>
    );
  }

  if (!operationMetrics) return null;

  const p95 = operationMetrics.p95_commit_seconds;
  const p95Display =
    p95 == null
      ? tAdmin("agentOperations.metrics.notAvailable")
      : tAdmin("agentOperations.metrics.seconds", { n: p95 });
  const failed = operationMetrics.by_status?.failed ?? 0;

  return (
    <>
      <StatChip label={tAdmin("agentOperations.metrics.total")} value={operationMetrics.total} />
      <StatChip label={tAdmin("agentOperations.metrics.committed")} value={operationMetrics.by_status?.committed ?? 0} />
      <StatChip
        label={tAdmin("agentOperations.metrics.failed")}
        value={failed}
        tone={failed > 0 ? "danger" : undefined}
      />
      <StatChip label={tAdmin("agentOperations.metrics.completionRate")} value={`${operationMetrics.completion_rate}%`} />
      <StatChip
        label={tAdmin("agentOperations.metrics.activePreviews")}
        value={operationMetrics.active_previews}
        className="hidden xl:inline-flex"
      />
      <StatChip
        label={tAdmin("agentOperations.metrics.p95CommitTime")}
        value={p95Display}
        className="hidden xl:inline-flex"
      />
    </>
  );
}

/** Slim one-line alert banners; render nothing when no threshold is crossed. */
export function AgentOpsAlerts({
  operationMetrics,
}: {
  operationMetrics: AgentOperationMetrics | undefined;
}) {
  const { tAdmin } = useAdminTranslation();
  const alerts = evaluateAgentOpsAlerts(operationMetrics);
  if (!alerts || (!alerts.highErrorRate && !alerts.opsSpike)) return null;

  return (
    <div role="status" className="flex flex-col gap-1.5">
      {alerts.highErrorRate ? (
        <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">
          <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold">{tAdmin("layout.devtool.alertFailureShort")}</span>
          <span className="truncate opacity-90">
            {tAdmin("agentOperations.alerts.highErrorRate", {
              rate: alerts.failureRate,
              min: AGENT_ALERT_MIN_OPS,
            })}
          </span>
        </p>
      ) : null}
      {alerts.opsSpike ? (
        <p className="flex items-center gap-2 rounded-md border border-[var(--status-warning-foreground)]/40 bg-[var(--status-warning-foreground)]/5 px-3 py-1.5 text-xs">
          <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0 text-[var(--status-warning-foreground)]" />
          <span className="font-semibold">{tAdmin("layout.devtool.alertSpikeShort")}</span>
          <span className="truncate text-muted-foreground">
            {tAdmin("agentOperations.alerts.opsSpike", {
              today: alerts.opsToday,
              avg: alerts.dailyAvg7d,
            })}
          </span>
        </p>
      ) : null}
    </div>
  );
}