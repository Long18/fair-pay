import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircleIcon, ChevronDownIcon, Loader2Icon, SparklesIcon } from "@/components/ui/icons";
import { chat as localLlmChat, getLocalLlmStatus, getSelectedModel, loadModel } from "@/lib/local-llm/client";
import i18n from "@/i18n";

type DashboardBalanceSummary = {
  counterparty_name?: string;
  amount?: number;
  currency?: string;
  is_owed?: boolean;
  transaction_count?: number;
  last_transaction_date?: string;
};

type DashboardActivitySummary = {
  type?: string;
  description?: string;
  amount?: number;
  currency?: string;
  date?: string;
  groupName?: string;
  paymentState?: string;
};

export interface DashboardInsightContext {
  activeTab: string;
  balances: DashboardBalanceSummary[];
  recentActivities: DashboardActivitySummary[];
  historyActivities: DashboardActivitySummary[];
}

interface DashboardInsightPanelProps {
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
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const prompts = lines.filter(l => l.endsWith('?')).slice(0, 2);
  const insights = lines.filter(l => !prompts.includes(l)).slice(0, 2);
  return { insights: insights.length ? insights : [raw], prompts };
}

function formatRelativeTime(date: Date): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

export function DashboardInsightPanel({ context }: DashboardInsightPanelProps) {
  const { t } = useTranslation();
  const [insight, setInsight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const sanitizedContext = useMemo(() => compactContext(context), [context]);

  const parsed = useMemo(
    () => (insight ? parseInsightResponse(insight) : { insights: [], prompts: [] }),
    [insight],
  );

  // Auto-open when new insight arrives
  useEffect(() => {
    if (insight) setIsOpen(true);
  }, [insight]);

  const generateInsights = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      if (emptyContext(sanitizedContext)) {
        setInsight(t('dashboard.insights.noData'));
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
        if (loaded.state === "unsupported") {
          setError(loaded.reason);
          return;
        }
        if (loaded.state === "error") {
          setError(loaded.message);
          return;
        }
        if (loaded.state !== "ready") {
          setError(t('dashboard.insights.modelLoading'));
          return;
        }

        status = loaded;
      }

      const response = await localLlmChat(
        [
          {
            role: "system",
            content: `You write compact FairPay dashboard insights. Use only the provided JSON data. Do not invent numbers. Return 2 short actionable insights and 2 suggested chat prompts.\nRespond in ${i18n.language === 'vi' ? 'Vietnamese' : 'English'}.`,
          },
          { role: "user", content: JSON.stringify(sanitizedContext) },
        ],
        { model: status.model },
      );

      setInsight(
        response.message?.content?.trim() ||
        response.text?.trim() ||
        t('dashboard.insights.noInsight'),
      );
      setLastGenerated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboard.insights.error'));
    } finally {
      setLoading(false);
    }
  }, [sanitizedContext, t]);

  return (
    <section className="mx-auto mt-4 w-full max-w-5xl">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="gap-0 py-0 shadow-sm">
          <CardHeader className="px-4 py-3 [grid-template-rows:auto] [grid-template-columns:1fr]">
            {/* Title row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SparklesIcon size={16} className="text-primary" />
                <CardTitle className="text-sm font-semibold">
                  {t('dashboard.insights.title')}
                </CardTitle>
                {lastGenerated && (
                  <Badge variant="secondary" className="text-xs">
                    {formatRelativeTime(lastGenerated)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
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
                  {insight ? t('dashboard.insights.regenerate') ?? 'Regenerate' : t('dashboard.insights.generate') ?? 'Generate'}
                </Button>
                {insight && (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <ChevronDownIcon
                        size={14}
                        className={cn("transition-transform duration-200", isOpen && "rotate-180")}
                      />
                    </Button>
                  </CollapsibleTrigger>
                )}
              </div>
            </div>

            {/* Subtitle — only shown before first generation */}
            {!insight && (
              <p className="mt-1 text-xs text-muted-foreground">
                Uses only the balances, activity, and history already loaded on this dashboard.
              </p>
            )}
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0">
              {/* Loading skeleton */}
              {loading && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              )}

              {/* Parsed insights */}
              {!loading && parsed.insights.length > 0 && (
                <div className="space-y-3">
                  {parsed.insights.map((ins, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      {/* Lightbulb substitute — amber dot indicator */}
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
                      <div className="flex flex-wrap gap-2">
                        {parsed.prompts.map((prompt, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="cursor-pointer text-xs hover:bg-muted"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click();
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
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </section>
  );
}
