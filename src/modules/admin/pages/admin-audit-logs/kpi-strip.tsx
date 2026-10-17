import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";
import type { AuditStats } from "../../types";

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

function KpiChip({ label, value, title }: { label: string; value: number; title?: string }) {
  return (
    <span
      title={title ?? value.toLocaleString()}
      className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border bg-card px-2 text-xs"
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{compactNumber.format(value)}</span>
    </span>
  );
}

export function AuditActionSplitBar({
  stats,
  className,
}: {
  stats: AuditStats;
  className?: string;
}) {
  const { tAdmin } = useAdminTranslation();
  const total = stats.total || 1;
  const segments = [
    { key: "I", count: stats.inserts, color: "bg-[var(--status-success-foreground)]" },
    { key: "U", count: stats.updates, color: "bg-[var(--status-warning-foreground)]" },
    { key: "D", count: stats.deletes, color: "bg-[var(--status-error-foreground)]" },
  ];
  const legend = tAdmin("layout.devtool.actionSplitLegend", {
    inserts: stats.inserts.toLocaleString(),
    updates: stats.updates.toLocaleString(),
    deletes: stats.deletes.toLocaleString(),
  });

  return (
    <div
      role="img"
      aria-label={`${tAdmin("layout.devtool.actionSplit")}: ${legend}`}
      title={legend}
      className={cn("flex h-1.5 w-[7.5rem] shrink-0 gap-px overflow-hidden rounded-full bg-muted", className)}
    >
      {segments.map((segment) =>
        segment.count > 0 ? (
          <div
            key={segment.key}
            className={cn("h-full", segment.color)}
            style={{ width: `${Math.max((segment.count / total) * 100, 2)}%` }}
          />
        ) : null
      )}
    </div>
  );
}

/** Inline KPI chips for the toolbar `meta` slot: Today · Week · Total + I/U/D bar. */
export function AuditKpiChips({ stats, loading }: { stats: AuditStats | undefined; loading: boolean }) {
  const { tAdmin } = useAdminTranslation();

  if (loading) {
    return (
      <>
        {Array.from({ length: 3 }).map((_, i) => (
          <span key={i} className="h-7 w-20 shrink-0 animate-pulse rounded-md bg-muted" />
        ))}
      </>
    );
  }
  if (!stats) return null;

  return (
    <>
      <KpiChip label={tAdmin("layout.devtool.kpiToday")} value={stats.today} />
      <KpiChip label={tAdmin("layout.devtool.kpiWeek")} value={stats.this_week} />
      <KpiChip label={tAdmin("layout.devtool.kpiTotal")} value={stats.total} />
      <AuditActionSplitBar stats={stats} className="ml-1" />
    </>
  );
}
