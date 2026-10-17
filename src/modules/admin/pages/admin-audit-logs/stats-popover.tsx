import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ActivityIcon } from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import type { AuditStats } from "../../types";
import { AuditActionSplitBar } from "./kpi-strip";

function BreakdownList({
  title,
  items,
  total,
  mono,
}: {
  title: string;
  items: AuditStats["by_table"];
  total: number;
  mono?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="min-w-0 space-y-1.5">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <ul className="space-y-1">
        {items.map((item) => {
          const pct = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <li key={item.name} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_3rem] items-center gap-2">
              <span className={mono ? "truncate font-mono text-xs" : "truncate text-xs"} title={item.name}>
                {item.name}
              </span>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.max(pct, 1)}%` }} />
              </div>
              <span className="text-right text-xs tabular-nums text-muted-foreground">
                {item.count.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AuditStatsPopover({
  stats,
  loading,
}: {
  stats: AuditStats | undefined;
  loading: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const hasBreakdown = Boolean(stats && (stats.by_table.length > 0 || stats.by_actor.length > 0));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 gap-2 sm:h-9" disabled={loading && !stats}>
          <ActivityIcon className="h-4 w-4" />
          <span className="hidden min-[420px]:inline">{tAdmin("layout.devtool.stats")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,34rem)] p-0">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-semibold">{tAdmin("layout.devtool.statsTitle")}</p>
        </div>
        {stats ? (
          <div className="max-h-[min(70vh,32rem)] space-y-3 overflow-y-auto px-3 py-3">
            <dl className="grid grid-cols-3 gap-2">
              {[
                { label: tAdmin("layout.devtool.kpiToday"), value: stats.today },
                { label: tAdmin("layout.devtool.kpiThisWeek"), value: stats.this_week },
                { label: tAdmin("layout.devtool.kpiTotal"), value: stats.total },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-md border bg-muted/30 px-2.5 py-1.5">
                  <dt className="text-[11px] text-muted-foreground">{kpi.label}</dt>
                  <dd className="text-base font-semibold tabular-nums">{kpi.value.toLocaleString()}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {tAdmin("layout.devtool.actionSplit")}
              </p>
              <AuditActionSplitBar stats={stats} className="h-2 w-full" />
              <p className="text-xs text-muted-foreground">
                {tAdmin("layout.devtool.actionSplitLegend", {
                  inserts: stats.inserts.toLocaleString(),
                  updates: stats.updates.toLocaleString(),
                  deletes: stats.deletes.toLocaleString(),
                })}
              </p>
            </div>
            {hasBreakdown ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <BreakdownList title={tAdmin("auditLogs.byTable")} items={stats.by_table} total={stats.total} mono />
                <BreakdownList title={tAdmin("auditLogs.byActor")} items={stats.by_actor} total={stats.total} />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {tAdmin("layout.devtool.statsEmpty")}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
