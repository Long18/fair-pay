import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FloatingActionStack, FloatingPill } from "@/components/ui/floating-stack";
import {
  AlertCircleIcon,
  Loader2Icon,
  SparklesIcon,
  XIcon,
} from "@/components/ui/icons";
import {
  chat as localLlmChat,
  getLocalLlmStatus,
  getSelectedModel,
  loadModel,
} from "@/lib/local-llm/client";
import { useHaptics } from "@/hooks/use-haptics";
import i18n from "@/i18n";
import type { DashboardInsightContext } from "./types";

interface InsightsFABProps {
  context: DashboardInsightContext;
}

function compactContext(context: DashboardInsightContext): DashboardInsightContext {
  return {
    activeTab: context.activeTab,
    balances: context.balances.slice(0, 8),
    recentActivities: context.recentActivities.slice(0, 8),
    historyActivities: context.historyActivities.slice(0, 6),
  };
}

function emptyContext(context: DashboardInsightContext): boolean {
  return (
    context.balances.length === 0 &&
    context.recentActivities.length === 0 &&
    context.historyActivities.length === 0
  );
}

function parseInsightResponse(raw: string): { insights: string[]; prompts: string[] } {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const prompts = lines.filter((l) => l.endsWith("?")).slice(0, 2);
  const insights = lines.filter((l) => !prompts.includes(l)).slice(0, 2);
  return { insights: insights.length ? insights : [raw], prompts };
}

function formatRelativeTime(date: Date): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

export const InsightsFAB = memo(function InsightsFAB({ context }: InsightsFABProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const { tap } = useHaptics();

  const sanitizedContext = useMemo(() => compactContext(context), [context]);
  const parsed = useMemo(
    () => (insight ? parseInsightResponse(insight) : { insights: [], prompts: [] }),
    [insight],
  );

  // Open the panel when insights finish generating
  useEffect(() => {
    if (insight && loading === false) setOpen(true);
  }, [insight, loading]);

  const toggle = useCallback(() => {
    tap();
    setOpen((prev) => !prev);
  }, [tap]);

  const generateInsights = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      if (emptyContext(sanitizedContext)) {
        setInsight(t("dashboard.insights.noData"));
        setLastGenerated(new Date());
        return;
      }

      let status = getLocalLlmStatus();
      if (status.state === "unsupported") {
        setError(status.reason);
        return;
      }

      if (status.state !== "ready") {
        const loaded = await loadModel(getSelectedModel());
        if (loaded.state === "unsupported") { setError(loaded.reason); return; }
        if (loaded.state === "error") { setError(loaded.message); return; }
        if (loaded.state !== "ready") { setError(t("dashboard.insights.modelLoading")); return; }
        status = loaded;
      }

      const response = await localLlmChat(
        [
          {
            role: "system",
            content: `You write compact FairPay dashboard insights. Use only the provided JSON data. Do not invent numbers. Return 2 short actionable insights and 2 suggested chat prompts.\nRespond in ${i18n.language === "vi" ? "Vietnamese" : "English"}.`,
          },
          { role: "user", content: JSON.stringify(sanitizedContext) },
        ],
        { model: status.model },
      );

      setInsight(
        response.message?.content?.trim() ||
          response.text?.trim() ||
          t("dashboard.insights.noInsight"),
      );
      setLastGenerated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dashboard.insights.error"));
    } finally {
      setLoading(false);
    }
  }, [sanitizedContext, t]);

  return (
    <>
      {/* Insights sheet panel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col w-full h-[100dvh] sm:h-full gap-0 p-0 sm:max-w-[420px]">
          <SheetHeader className="shrink-0 border-b px-4 py-3">
            <div className="flex items-center justify-between gap-3 pr-8">
              <div className="flex min-w-0 items-center gap-2">
                <SparklesIcon size={16} className="shrink-0 text-primary" />
                <SheetTitle className="text-base">{t("dashboard.insights.title")}</SheetTitle>
                {lastGenerated && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {formatRelativeTime(lastGenerated)}
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={generateInsights}
                disabled={loading}
                className="shrink-0"
              >
                {loading ? (
                  <Loader2Icon size={14} className="animate-spin" />
                ) : (
                  <SparklesIcon size={14} />
                )}
                {insight
                  ? t("dashboard.insights.regenerate")
                  : t("dashboard.insights.generate")}
              </Button>
            </div>
            {!insight && (
              <SheetDescription>
                {t("dashboard.insights.subtitle", "Uses only the balances, activity, and history already loaded on this dashboard.")}
              </SheetDescription>
            )}
          </SheetHeader>

          <ScrollArea className="min-h-0 flex-1 px-4">
            <div className="space-y-4 py-4">
              {/* Empty / call-to-action state */}
              {!loading && !insight && !error && (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  {t("dashboard.insights.cta", "Tap Generate to get AI-powered insights from your current dashboard data.")}
                </div>
              )}

              {/* Loading skeleton */}
              {loading && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="mt-4 h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              )}

              {/* Parsed insights */}
              {!loading && parsed.insights.length > 0 && (
                <div className="space-y-3">
                  {parsed.insights.map((ins, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span
                        className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-400"
                        aria-hidden="true"
                      />
                      <div className="prose prose-sm dark:prose-invert max-w-none leading-6 text-foreground">
                        <ReactMarkdown>{ins}</ReactMarkdown>
                      </div>
                    </div>
                  ))}

                  {parsed.prompts.length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("dashboard.insights.suggestedPrompts", "Suggested questions")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {parsed.prompts.map((prompt, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="cursor-pointer text-xs hover:bg-muted"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") e.currentTarget.click();
                            }}
                          >
                            {prompt}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Fallback: unstructured text when parser yields nothing */}
              {!loading && parsed.insights.length === 0 && insight && (
                <div className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {insight}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="shrink-0 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <p className="text-xs text-muted-foreground">
              {t("dashboard.insights.privacy", "Insights are generated locally in your browser — no data is sent to any server.")}
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Floating action button — left side, stacked above ChatFAB */}
      <FloatingActionStack
        side="left"
        className="bottom-[calc(env(safe-area-inset-bottom)+8.75rem)] md:bottom-[5.25rem]"
        trigger={
          <FloatingPill
            variant="primary"
            size="default"
            onClick={toggle}
            ariaLabel={open ? t("dashboard.insights.close", "Close AI Insights") : t("dashboard.insights.open", "Open AI Insights")}
            badge={insight && !open ? 1 : undefined}
          >
            {open ? <XIcon size={20} /> : <SparklesIcon size={22} />}
          </FloatingPill>
        }
      />
    </>
  );
});
