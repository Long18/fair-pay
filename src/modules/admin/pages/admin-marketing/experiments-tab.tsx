import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UsersIcon,
  ActivityIcon,
} from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import { formatNumber } from "@/lib/locale-utils";
import { AdminMetricCard } from "../../components/AdminMetricCard";
import type { Experiment } from "./types";
import { useExperiments, useExperimentAssignments } from "./hooks";

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
    const result: Record<string, Array<{ variant: string; count: number; pct: number }>> = {};
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

  // ── Detail view ──
  if (selectedExp) {
    const variants = variantSummary[selectedExp.key] ?? [];
    const totalAssignments = assignmentCounts[selectedExp.key] ?? 0;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => setSelectedExp(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {tAdmin("common.back") ?? "Back"}
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-mono font-medium">{selectedExp.key}</span>
          <Badge variant={selectedExp.is_active ? "default" : "outline"} className="text-xs ml-1">
            {selectedExp.is_active ? tAdmin("status.active") : tAdmin("status.inactive")}
          </Badge>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <AdminMetricCard icon={ActivityIcon} label={tAdmin("marketing.experimentAssignments")} value={formatNumber(totalAssignments)} loading={isLoading} />
          <AdminMetricCard icon={UsersIcon} label={tAdmin("marketing.experimentVariants")} value={selectedExp.variants.length} loading={false} />
          <Card className="p-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">{tAdmin("marketing.experimentKey")}</span>
              <span className="font-mono text-sm font-semibold break-all">{selectedExp.key}</span>
              <span className="text-xs text-muted-foreground mt-1">
                {new Date(selectedExp.created_at).toLocaleDateString()}
              </span>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Variant Distribution</CardTitle>
            <CardDescription>
              {selectedExp.description ?? selectedExp.key} · {formatNumber(totalAssignments)} users assigned
            </CardDescription>
          </CardHeader>
          <CardContent>
            {variants.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No assignments yet — experiment awaiting users</p>
            ) : (
              <div className="space-y-5">
                {variants.map((v) => (
                  <div key={v.variant} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs px-2">{v.variant}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <span className="text-muted-foreground tabular-nums">{formatNumber(v.count)} users</span>
                        <span className="font-bold tabular-nums w-10 text-right">{v.pct}%</span>
                      </div>
                    </div>
                    <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Experiment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Description</p>
                <p>{selectedExp.description ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Created</p>
                <p>{new Date(selectedExp.created_at).toLocaleDateString()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">All variants</p>
                <div className="flex flex-wrap gap-1">
                  {selectedExp.variants.map((v) => (
                    <Badge key={v} variant="secondary" className="font-mono text-xs">{v}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{tAdmin("marketing.experimentsTitle")}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{tAdmin("marketing.experimentsSubtitle")}</p>
        </div>
        <Badge variant="secondary">{experiments?.length ?? 0} experiments</Badge>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-5 space-y-3">
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-3 w-48 bg-muted rounded animate-pulse" />
              <div className="h-2 w-full bg-muted rounded animate-pulse mt-4" />
            </Card>
          ))}
        </div>
      ) : !experiments?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">{tAdmin("marketing.noExperiments")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {experiments.map((exp, index) => {
            const total = assignmentCounts[exp.key] ?? 0;
            const variants = variantSummary[exp.key] ?? [];
            return (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.25 }}
              >
                <Card
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
                  onClick={() => setSelectedExp(exp)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold truncate">{exp.key}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {exp.description ?? "No description"}
                        </p>
                      </div>
                      <Badge variant={exp.is_active ? "default" : "outline"} className="shrink-0 text-xs">
                        {exp.is_active ? tAdmin("status.active") : tAdmin("status.inactive")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatNumber(total)} users assigned</span>
                      <span>{exp.variants.length} variants</span>
                    </div>
                    {variants.length > 0 ? (
                      <div className="space-y-1.5">
                        {variants.map((v) => (
                          <div key={v.variant} className="flex items-center gap-2">
                            <span className="text-xs font-mono w-16 shrink-0 text-muted-foreground truncate">{v.variant}</span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className="h-full w-full origin-left bg-primary rounded-full"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: v.pct / 100 }}
                                transition={{ duration: 0.5, delay: index * 0.06 + 0.2 }}
                              />
                            </div>
                            <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{v.pct}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {exp.variants.map((v) => (
                          <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(exp.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        View details →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
