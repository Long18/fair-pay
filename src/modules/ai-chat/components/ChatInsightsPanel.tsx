import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Loader2Icon, SparklesIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { useAiChatContext } from "../AiChatContext";

type InsightsState = "idle" | "loading" | "ready";

export const ChatInsightsPanel = memo(function ChatInsightsPanel({
  onAskPrompt,
}: {
  onAskPrompt: (prompt: string) => void;
}) {
  const { t } = useTranslation();
  const { messages, isLoading, localLlmStatus, sendMessage } = useAiChatContext();
  const [insightsState, setInsightsState] = useState<InsightsState>("idle");
  const [insightBullets, setInsightBullets] = useState<string[]>([]);
  const insightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { tap } = useHaptics();

  const handleGenerateInsights = useCallback(() => {
    if (insightsState === "loading") return;
    setInsightsState("loading");

    const insightPrompt =
      "Summarize my spending patterns, active balances, and any groups needing attention in 3 concise bullet points. Use plain text, no markdown headers.";

    if (insightTimerRef.current) clearTimeout(insightTimerRef.current);

    void sendMessage(insightPrompt)
      .then(() => {
        insightTimerRef.current = setTimeout(() => {
          setInsightsState("ready");
        }, 300);
      })
      .catch(() => {
        setInsightsState("idle");
      });
  }, [insightsState, sendMessage]);

  const derivedBullets = useMemo(() => {
    if (insightsState !== "ready" || messages.length === 0) return insightBullets;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last?.content) return insightBullets;
    const raw = last.content
      .split(/\n+/)
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter((l) => l.length > 10)
      .slice(0, 4);
    return raw.length > 0 ? raw : [last.content.slice(0, 200)];
  }, [insightsState, messages, insightBullets]);

  useEffect(() => {
    if (insightsState === "ready" && derivedBullets.length > 0) {
      setInsightBullets(derivedBullets);
    }
  }, [insightsState, derivedBullets]);

  const insightPrompts = useMemo(
    () => [t("aiChat.suggestions.whoOwes"), t("aiChat.suggestions.groupsAttention")],
    [t],
  );

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-4 py-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <SparklesIcon size={15} className="shrink-0 text-primary" />
          <span className="text-sm font-bold">{t("aiChat.insights.title")}</span>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-7 gap-1.5 px-3 text-xs shrink-0"
          onClick={() => {
            tap();
            handleGenerateInsights();
          }}
          disabled={
            insightsState === "loading" || isLoading || localLlmStatus.state !== "ready"
          }
        >
          {insightsState === "loading" ? (
            <Loader2Icon size={11} className="animate-spin" />
          ) : (
            <SparklesIcon size={11} />
          )}
          {insightsState === "ready"
            ? t("aiChat.insights.regenerate")
            : t("aiChat.insights.generate")}
        </Button>
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto">
        {insightsState === "idle" && (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("aiChat.insights.privacyNote")}
            </p>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              {t("aiChat.insights.idleHint")}
            </div>
            {localLlmStatus.state !== "ready" && (
              <p className="text-xs text-muted-foreground">
                {t("aiChat.insights.loadModelFirst")}
              </p>
            )}
          </>
        )}

        {insightsState === "loading" && (
          <div className="space-y-3">
            {[70, 55, 40].map((w) => (
              <div
                key={w}
                className="h-3 animate-pulse rounded-md bg-muted"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        )}

        {insightsState === "ready" && insightBullets.length > 0 && (
          <>
            <div className="space-y-3">
              {insightBullets.map((bullet, i) => (
                <div key={i} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <p className="text-[13px] leading-relaxed text-foreground">{bullet}</p>
                </div>
              ))}
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("aiChat.insights.suggestedQuestions")}
              </p>
              <div className="flex flex-wrap gap-2">
                {insightPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      tap();
                      onAskPrompt(prompt);
                    }}
                    className="rounded-full border bg-background px-3 py-1.5 text-[11.5px] text-foreground transition-colors hover:bg-accent"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <p className="mt-3 shrink-0 text-[11px] text-muted-foreground">
        {t("aiChat.insights.footer")}
      </p>
    </div>
  );
});
