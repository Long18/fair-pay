import type { AuditStats } from "../../types";

export function AuditKpiStrip({ stats, loading }: { stats: AuditStats | undefined; loading: boolean }) {
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
