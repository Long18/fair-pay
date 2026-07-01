import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGetIdentity } from "@refinedev/core";
import { AgentConfirmationCard } from "@/components/agent/AgentConfirmationCard";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertCircleIcon,
  FairPayIcon,
  Loader2Icon,
  SparklesIcon,
  MessageSquareIcon,
  Trash2Icon,
  ZapIcon,
} from "@/components/ui/icons";
import { loadModel } from "@/lib/local-llm/client";
import { getWebLlmModelEntry, type LocalLlmStatus, type WebLlmModelId } from "@/lib/local-llm/types";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import type { Profile } from "@/modules/profile/types";
import { ChatInput } from "./ChatInput";
import ChatMessage from "./ChatMessage";
import { ModelSelectDialog } from "./ModelSelectDialog";
import { TypingIndicator } from "./TypingIndicator";
import { useAiChatContext } from "../AiChatContext";
import type { ChatMessage as ChatMessageType } from "../types";

interface ChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ActiveTab = "chat" | "insights";
type InsightsState = "idle" | "loading" | "ready";

function statusDotColor(status: LocalLlmStatus): string {
  switch (status.state) {
    case "ready":        return "bg-emerald-500";
    case "loading":      return "bg-amber-500 animate-pulse";
    case "error":
    case "unsupported":  return "bg-destructive";
    default:             return "bg-muted-foreground/40";
  }
}

function statusLabel(
  status: LocalLlmStatus,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  switch (status.state) {
    case "unsupported": return t("aiChat.status.unavailable");
    case "loading":     return t("aiChat.status.loading", { pct: Math.round(status.progress * 100) });
    case "ready":       return t("aiChat.status.ready");
    case "error":       return t("aiChat.status.error");
    default:            return t("aiChat.status.idle");
  }
}

export const ChatPanel = memo(function ChatPanel({ open, onOpenChange }: ChatPanelProps) {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const {
    messages,
    isLoading,
    error,
    pendingPreview,
    localLlmStatus,
    selectedModel,
    selectLocalModel,
    sendMessage,
    clearPreview,
    clearChat,
  } = useAiChatContext();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("chat");
  const [insightsState, setInsightsState] = useState<InsightsState>("idle");
  const [insightBullets, setInsightBullets] = useState<string[]>([]);
  const insightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { tap } = useHaptics();

  const suggestions = useMemo(() => [
    t("aiChat.suggestions.whoOwes"),
    t("aiChat.suggestions.recentActivity"),
    t("aiChat.suggestions.dinnerExpense"),
    t("aiChat.suggestions.groupsAttention"),
  ], [t]);

  const selectedEntry = useMemo(() => getWebLlmModelEntry(selectedModel), [selectedModel]);

  const inputDisabled =
    isLoading || Boolean(pendingPreview) || localLlmStatus.state === "unsupported";

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (!open || activeTab !== "chat") return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: messages.length === 1 ? "instant" : "smooth" });
  }, [messages, isLoading, pendingPreview, open, activeTab]);

  // Switch to chat tab when a new conversation starts
  useEffect(() => {
    if (messages.length === 1) setActiveTab("chat");
  }, [messages.length]);

  const handleSuggestion = useCallback(
    (suggestion: string) => { tap(); void sendMessage(suggestion); },
    [sendMessage, tap],
  );

  const handleClearChat = useCallback(() => { tap(); clearChat(); }, [clearChat, tap]);

  const handleSelectAndLoad = useCallback(
    async (model: WebLlmModelId) => {
      tap();
      selectLocalModel(model);
      await loadModel(model);
    },
    [selectLocalModel, tap],
  );

  const handleOpenModelDialog = useCallback(() => { tap(); setModelDialogOpen(true); }, [tap]);

  // ── Insights tab ─────────────────────────────────────────────────────────────

  const handleGenerateInsights = useCallback(() => {
    if (insightsState === "loading") return;
    setInsightsState("loading");

    // Ask the model a canned insights prompt and capture the response as bullets.
    const insightPrompt =
      "Summarize my spending patterns, active balances, and any groups needing attention in 3 concise bullet points. Use plain text, no markdown headers.";

    if (insightTimerRef.current) clearTimeout(insightTimerRef.current);

    // Send to the chat and listen for the last assistant reply.
    void sendMessage(insightPrompt).then(() => {
      // The reply will appear in `messages`; capture after a brief tick.
      insightTimerRef.current = setTimeout(() => {
        setInsightsState("ready");
      }, 300);
    }).catch(() => {
      setInsightsState("idle");
    });
  }, [insightsState, sendMessage]);

  // Derive insight bullets from the last assistant message when ready
  const derivedBullets = useMemo(() => {
    if (insightsState !== "ready" || messages.length === 0) return insightBullets;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last?.content) return insightBullets;
    // Split on newlines or ". " to extract up to 4 bullet sentences.
    const raw = last.content
      .split(/\n+/)
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter((l) => l.length > 10)
      .slice(0, 4);
    return raw.length > 0 ? raw : [last.content.slice(0, 200)];
  }, [insightsState, messages, insightBullets]);

  // Keep insightBullets in sync when insights are ready
  useEffect(() => {
    if (insightsState === "ready" && derivedBullets.length > 0) {
      setInsightBullets(derivedBullets);
    }
  }, [insightsState, derivedBullets]);

  const insightPrompts = useMemo(() => [
    t("aiChat.suggestions.whoOwes"),
    t("aiChat.suggestions.groupsAttention"),
  ], [t]);

  const handleInsightPrompt = useCallback(
    (prompt: string) => {
      setActiveTab("chat");
      setTimeout(() => { tap(); void sendMessage(prompt); }, 150);
    },
    [sendMessage, tap],
  );

  const showInsightsDot = insightsState === "ready" && activeTab !== "insights";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col w-full h-[100dvh] sm:h-full gap-0 p-0 sm:max-w-[520px]">

          {/* ── Header ── */}
          <SheetHeader className="shrink-0 border-b px-4 py-3">
            <div className="flex items-center justify-between gap-3 pr-8">
              <div className="min-w-0">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <FairPayIcon size={18} className="rounded-sm" />
                  {t("aiChat.title")}
                </SheetTitle>
                <SheetDescription className="truncate">{t("aiChat.subtitle")}</SheetDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClearChat}
                disabled={messages.length === 0 && !pendingPreview}
                aria-label={t("aiChat.clearChat")}
                className="h-9 w-9 shrink-0"
              >
                <Trash2Icon size={16} />
              </Button>
            </div>
          </SheetHeader>

          {/* ── Tabs ── */}
          <div className="shrink-0 flex justify-center border-b px-4 py-2.5">
            <div className="inline-flex gap-0.5 rounded-full bg-muted p-[3px]">
              {(["chat", "insights"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all",
                    activeTab === tab
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-current={activeTab === tab ? "page" : undefined}
                >
                  {tab === "chat" ? <MessageSquareIcon size={13} /> : <SparklesIcon size={13} />}
                  {tab === "chat" ? "Chat" : "Insights"}
                  {tab === "insights" && showInsightsDot && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Model status strip ── */}
          <div className="shrink-0 border-b px-4 py-2">
            <div className="flex items-center gap-2">
              <span
                className={cn("h-2 w-2 shrink-0 rounded-full", statusDotColor(localLlmStatus))}
                aria-hidden="true"
              />
              <span className="flex-1 truncate text-xs font-medium text-muted-foreground">
                {statusLabel(localLlmStatus, t)}
              </span>
              {localLlmStatus.state === "loading" && (
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {Math.round(localLlmStatus.progress * 100)}%
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-xs"
                onClick={handleOpenModelDialog}
                disabled={localLlmStatus.state === "unsupported"}
                aria-label={t("aiChat.selectModelAria")}
              >
                {localLlmStatus.state === "loading" ? (
                  <Loader2Icon size={11} className="animate-spin" />
                ) : (
                  <ZapIcon size={11} />
                )}
                <span className="max-w-[120px] truncate">
                  {selectedEntry?.label ?? selectedModel}
                </span>
              </Button>
            </div>
            {localLlmStatus.state === "loading" && (
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${Math.max(2, Math.min(100, localLlmStatus.progress * 100))}%` }}
                />
              </div>
            )}
          </div>

          {/* ── Chat tab ── */}
          {activeTab === "chat" && (
            <>
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-y-auto px-4"
              >
                <div className="space-y-4 py-4">
                  {messages.length === 0 && !pendingPreview && (
                    <div className="space-y-3">
                      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                        {t("aiChat.welcome")}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {suggestions.map((suggestion) => (
                          <Button
                            key={suggestion}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuggestion(suggestion)}
                            disabled={isLoading || localLlmStatus.state === "unsupported"}
                            className="h-auto min-h-10 justify-start whitespace-normal px-3 py-2 text-left text-xs"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message: ChatMessageType, index: number) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      userInfo={identity}
                      isStreaming={
                        isLoading &&
                        index === messages.length - 1 &&
                        message.role === "assistant"
                      }
                    />
                  ))}

                  {pendingPreview && (
                    <AgentConfirmationCard
                      preview={pendingPreview}
                      onDone={clearPreview}
                      onCancel={clearPreview}
                      onError={(err: Error) => console.error(err)}
                    />
                  )}

                  {isLoading && <TypingIndicator />}

                  {error && (
                    <div className="flex gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <ChatInput onSend={sendMessage} isLoading={isLoading} disabled={inputDisabled} />
                {pendingPreview && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("aiChat.pendingPreview")}
                  </p>
                )}
              </div>
            </>
          )}

          {/* ── Insights tab ── */}
          {activeTab === "insights" && (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto px-4">
                <div className="py-4 space-y-4">

                  {/* Header row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <SparklesIcon size={15} className="text-primary shrink-0" />
                      <span className="text-sm font-bold">AI Insights</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 gap-1.5 px-3 text-xs shrink-0"
                      onClick={handleGenerateInsights}
                      disabled={
                        insightsState === "loading" ||
                        isLoading ||
                        localLlmStatus.state !== "ready"
                      }
                    >
                      {insightsState === "loading" ? (
                        <Loader2Icon size={11} className="animate-spin" />
                      ) : (
                        <SparklesIcon size={11} />
                      )}
                      {insightsState === "ready" ? "Regenerate" : "Generate"}
                    </Button>
                  </div>

                  {/* Idle state */}
                  {insightsState === "idle" && (
                    <>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Uses only the balances, activity, and history already loaded on this dashboard.
                      </p>
                      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                        Tap Generate to get AI-powered insights from your current dashboard data.
                      </div>
                      {localLlmStatus.state !== "ready" && (
                        <p className="text-xs text-muted-foreground">
                          Load a model first using the selector above.
                        </p>
                      )}
                    </>
                  )}

                  {/* Loading skeleton */}
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

                  {/* Ready — bullet points */}
                  {insightsState === "ready" && insightBullets.length > 0 && (
                    <>
                      <div className="space-y-3">
                        {insightBullets.map((bullet, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                            <p className="text-[13px] leading-relaxed text-foreground">{bullet}</p>
                          </div>
                        ))}
                      </div>

                      <div className="h-px bg-border" />

                      <div className="space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Suggested questions
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {insightPrompts.map((prompt) => (
                            <button
                              key={prompt}
                              type="button"
                              onClick={() => handleInsightPrompt(prompt)}
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
              </div>

              {/* Insights footer */}
              <div className="shrink-0 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <p className="text-[11px] text-muted-foreground">
                  Insights are generated locally in your browser — no data is sent to any server.
                </p>
              </div>
            </>
          )}

        </SheetContent>
      </Sheet>

      <ModelSelectDialog
        open={modelDialogOpen}
        onOpenChange={setModelDialogOpen}
        selectedModel={selectedModel}
        localLlmStatus={localLlmStatus}
        onSelectAndLoad={handleSelectAndLoad}
      />
    </>
  );
});

export default ChatPanel;
