import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  UsersIcon,
  ActivityIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import { formatNumber } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import { AdminDetailSheet } from "../../components/AdminDetailSheet";
import { AdminMetricCard } from "../../components/AdminMetricCard";
import type { Experiment } from "./types";
import { useExperiments, useExperimentAssignments } from "./hooks";
import { PanelCard, PanelEmpty } from "./panel-card";

type VariantSummary = Array<{ variant: string; count: number; pct: number }>;

function ExperimentDetail({
  experiment,
  variants,
  totalAssignments,
  loading,
}: {
  experiment: Experiment;
  variants: VariantSummary;
  totalAssignments: number;
  loading: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <AdminMetricCard variant="compact" icon={ActivityIcon} label={tAdmin("marketing.experimentAssignments")} value={formatNumber(totalAssignments)} loading={loading} />
        <AdminMetricCard variant="compact" icon={UsersIcon} label={tAdmin("marketing.experimentVariants")} value={experiment.variants.length} />
      </div>

      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {tAdmin("layout.insights.marketing.variantDistribution")}
        </p>
        {variants.length === 0 ? (
          <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
            {tAdmin("layout.insights.marketing.noAssignments")}
          </p>
        ) : (
          <div className="space-y-3">
            {variants.map((v) => (
              <div key={v.variant} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <Badge variant="outline" className="px-2 font-mono text-xs">{v.variant}</Badge>
                  <div className="flex items-center gap-3 text-right">
                    <span className="tabular-nums text-muted-foreground">
                      {tAdmin("overview.usersCount", { count: v.count })}
                    </span>
                    <span className="w-10 text-right font-bold tabular-nums">{v.pct}%</span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full w-full origin-left rounded-full bg-primary"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: v.pct / 100 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {tAdmin("layout.insights.marketing.experimentDetails")}
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-md border p-3 text-sm">
          <div className="col-span-2">
            <dt className="mb-0.5 text-xs text-muted-foreground">{tAdmin("marketing.experimentKey")}</dt>
            <dd className="break-all font-mono text-sm font-semibold">{experiment.key}</dd>
          </div>
          <div>
            <dt className="mb-0.5 text-xs text-muted-foreground">{tAdmin("marketing.experimentDescription")}</dt>
            <dd>{experiment.description ?? "—"}</dd>
          </div>
          <div>
            <dt className="mb-0.5 text-xs text-muted-foreground">{tAdmin("common.createdAt")}</dt>
            <dd>{new Date(experiment.created_at).toLocaleDateString()}</dd>
          </div>
          <div className="col-span-2">
            <dt className="mb-1 text-xs text-muted-foreground">{tAdmin("layout.insights.marketing.allVariants")}</dt>
            <dd className="flex flex-wrap gap-1">
              {experiment.variants.map((v) => (
                <Badge key={v} variant="secondary" className="font-mono text-xs">{v}</Badge>
              ))}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function ExperimentTile({
  experiment,
  total,
  variants,
  index,
  selected,
  onSelect,
}: {
  experiment: Experiment;
  total: number;
  variants: VariantSummary;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { tAdmin } = useAdminTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
    >
      <Card
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        className={cn(
          "group h-full cursor-pointer gap-2 p-3 transition-all duration-200 hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected && "border-primary/60 bg-primary/5",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-semibold">{experiment.key}</p>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {experiment.description ?? tAdmin("layout.insights.marketing.noDescription")}
            </p>
          </div>
          <Badge variant={experiment.is_active ? "default" : "outline"} className="shrink-0 text-xs">
            {experiment.is_active ? tAdmin("status.active") : tAdmin("status.inactive")}
          </Badge>
        </div>
        {variants.length > 0 ? (
          <div className="space-y-1">
            {variants.map((v) => (
              <div key={v.variant} className="flex items-center gap-2">
                <span className="w-16 shrink-0 truncate font-mono text-xs text-muted-foreground">{v.variant}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full w-full origin-left rounded-full bg-primary"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: v.pct / 100 }}
                    transition={{ duration: 0.5, delay: index * 0.05 + 0.2 }}
                  />
                </div>
                <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{v.pct}%</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {experiment.variants.map((v) => (
              <Badge key={v} variant="outline" className="font-mono text-xs">{v}</Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {tAdmin("layout.insights.marketing.usersAssigned", { count: total })} ·{" "}
            {tAdmin("layout.insights.marketing.variantsCount", { count: experiment.variants.length })}
          </span>
          <ChevronRightIcon className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        </div>
      </Card>
    </motion.div>
  );
}

export function ExperimentsTab({ enabled }: { enabled: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const [selectedExp, setSelectedExp] = useState<Experiment | null>(null);

  const { data: experiments, isLoading: experimentsLoading } = useExperiments(enabled);
  const { data: assignments, isLoading: assignmentsLoading } = useExperimentAssignments(enabled);

  const assignmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of assignments ?? []) {
      counts[a.experiment_key] = (counts[a.experiment_key] ?? 0) + 1;
    }
    return counts;
  }, [assignments]);

  const variantSummary = useMemo(() => {
    const result: Record<string, VariantSummary> = {};
    const perExp: Record<string, Record<string, number>> = {};
    for (const a of assignments ?? []) {
      if (!perExp[a.experiment_key]) perExp[a.experiment_key] = {};
      perExp[a.experiment_key][a.variant] = (perExp[a.experiment_key][a.variant] ?? 0) + 1;
    }
    for (const [expKey, varCounts] of Object.entries(perExp)) {
      const total = Object.values(varCounts).reduce((s, c) => s + c, 0);
      result[expKey] = Object.entries(varCounts).map(([variant, count]) => ({
        variant,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
    }
    return result;
  }, [assignments]);

  const isLoading = experimentsLoading || assignmentsLoading;

  return (
    <>
      <PanelCard
        title={tAdmin("marketing.experimentsTitle")}
        description={tAdmin("marketing.experimentsSubtitle")}
        action={
          <Badge variant="secondary" className="tabular-nums">
            {tAdmin("layout.insights.marketing.experimentsCount", { count: experiments?.length ?? 0 })}
          </Badge>
        }
      >
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-xl border p-3">
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-48 rounded bg-muted animate-pulse" />
                <div className="mt-3 h-2 w-full rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : !experiments?.length ? (
          <PanelEmpty>{tAdmin("marketing.noExperiments")}</PanelEmpty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {experiments.map((exp, index) => (
              <ExperimentTile
                key={exp.id}
                experiment={exp}
                total={assignmentCounts[exp.key] ?? 0}
                variants={variantSummary[exp.key] ?? []}
                index={index}
                selected={selectedExp?.id === exp.id}
                onSelect={() => setSelectedExp(exp)}
              />
            ))}
          </div>
        )}
      </PanelCard>

      <AdminDetailSheet
        open={selectedExp !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedExp(null);
        }}
        title={<span className="font-mono">{selectedExp?.key}</span>}
        description={selectedExp?.description ?? undefined}
        headerActions={
          selectedExp ? (
            <Badge variant={selectedExp.is_active ? "default" : "outline"} className="text-xs">
              {selectedExp.is_active ? tAdmin("status.active") : tAdmin("status.inactive")}
            </Badge>
          ) : null
        }
        size="md"
      >
        {selectedExp ? (
          <ExperimentDetail
            experiment={selectedExp}
            variants={variantSummary[selectedExp.key] ?? []}
            totalAssignments={assignmentCounts[selectedExp.key] ?? 0}
            loading={isLoading}
          />
        ) : null}
      </AdminDetailSheet>
    </>
  );
}
