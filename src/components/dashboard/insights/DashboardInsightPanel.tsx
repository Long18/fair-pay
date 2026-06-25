import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, Loader2Icon, SparklesIcon } from "@/components/ui/icons";
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

export function DashboardInsightPanel({ context }: DashboardInsightPanelProps) {
  const { t } = useTranslation();
  const [insight, setInsight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sanitizedContext = useMemo(() => compactContext(context), [context]);

  const generateInsights = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      if (emptyContext(sanitizedContext)) {
        setInsight(t('dashboard.insights.noData'));
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
            content:
              `You write compact FairPay dashboard insights. Use only the provided JSON data. Do not invent numbers. Return 2 short actionable insights and 2 suggested chat prompts.\nRespond in ${i18n.language === 'vi' ? 'Vietnamese' : 'English'}.`,
          },
          { role: "user", content: JSON.stringify(sanitizedContext) },
        ],
        { model: status.model },
      );

      setInsight(response.message?.content?.trim() || response.text?.trim() || t('dashboard.insights.noInsight'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboard.insights.error'));
    } finally {
      setLoading(false);
    }
  }, [sanitizedContext]);

  return (
    <section className="mx-auto mt-4 w-full max-w-5xl rounded-lg border bg-card px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SparklesIcon size={16} className="text-primary" />
            {t('dashboard.insights.title')}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Uses only the balances, activity, and history already loaded on this dashboard.
          </p>
        </div>
        <Button type="button" size="sm" onClick={generateInsights} disabled={loading} className="shrink-0">
          {loading ? <Loader2Icon size={14} className="animate-spin" /> : <SparklesIcon size={14} />}
          Generate
        </Button>
      </div>

      {insight && (
        <div className="mt-3 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm leading-6 text-foreground">
          {insight}
        </div>
      )}

      {error && (
        <div className="mt-3 flex gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}
