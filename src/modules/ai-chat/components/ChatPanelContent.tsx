/**
 * ChatPanelContent — the full chat UI (header, tabs, model strip, body, input)
 * without any container/sheet wrapper. Used by both the mobile Sheet and the
 * desktop FloatingChatWindow so layout logic stays in one place.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGetIdentity } from "@refinedev/core";
import { AgentConfirmationCard } from "@/components/agent/AgentConfirmationCard";
import { Button } from "@/components/ui/button";
import {
  AlertCircleIcon,
  ArrowDownIcon,
  ClockIcon,
  FairPayIcon,
  Loader2Icon,
  PencilIcon,
  SparklesIcon,
  MessageSquareIcon,
  Trash2Icon,
} from "@/components/ui/icons";
import { ChatHistoryDialog } from "./ChatHistoryDialog";
import { loadModel } from "@/lib/local-llm/client";
import { isWeakExpenseChatModel, type WebLlmModelId } from "@/lib/local-llm/types";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import type { Profile } from "@/modules/profile/types";
import { ChatInput } from "./ChatInput";
import ChatMessage from "./ChatMessage";
import { LoadingStatusBubble } from "./LoadingStatusBubble";
import { ModelSelectDialog } from "./ModelSelectDialog";
import { TypingIndicator } from "./TypingIndicator";
import { useAiChatContext } from "../AiChatContext";
import type { ChatMessage as ChatMessageType } from "../types";

type ActiveTab = "chat" | "insights";
type InsightsState = "idle" | "loading" | "ready";


/** Returns a locale date string like "Today", "Yesterday", or "Jun 30" for use as a date divider. */
function formatDateDivider(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getFullYear() === yesterday.getFullYear() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getDate() === yesterday.getDate();
    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

/** Returns "YYYY-MM-DD" from an ISO string for grouping. */
function isoDateKey(iso: string): string {
  return iso.slice(0, 10);
}

interface ChatPanelContentProps {
  onClear?: () => void;
}

export const ChatPanelContent = memo(function ChatPanelContent({ onClear }: ChatPanelContentProps) {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const {
    messages,
    isLoading,
    error,
    conversationId,
    conversations,
    pendingPreview,
    localLlmStatus,
    selectedModel,
    selectLocalModel,
    sendMessage,
    attachReceiptImage,
    clearPreview,
    confirmPreview,
    clearChat,
    newChat,
    selectConversation,
    deleteConversation,
  } = useAiChatContext();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("chat");
  const [insightsState, setInsightsState] = useState<InsightsState>("idle");
  const [insightBullets, setInsightBullets] = useState<string[]>([]);
  const insightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { tap } = useHaptics();

  // ── Scroll-to-bottom button ───────────────────────────────────────────────
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const lastMessageCountRef = useRef(messages.length);

  // Detect when user has scrolled up
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 100);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll to bottom only when: new messages arrive AND user was near bottom
  useEffect(() => {
    if (activeTab !== "chat") return;
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const newMessages = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;
    // Always scroll on first message; otherwise only if within 200px of bottom
    if (messages.length === 1 || distFromBottom < 200 || newMessages) {
      el.scrollTo({ top: el.scrollHeight, behavior: messages.length === 1 ? "instant" : "smooth" });
    }
  }, [messages, isLoading, pendingPreview, activeTab]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setShowScrollBtn(false);
  }, []);

  // Switch to chat tab when a new conversation starts
  useEffect(() => {
    if (messages.length === 1) setActiveTab("chat");
  }, [messages.length]);

  const suggestions = useMemo(() => [
    t("aiChat.suggestions.whoOwes"),
    t("aiChat.suggestions.recentActivity"),
    t("aiChat.suggestions.dinnerExpense"),
    t("aiChat.suggestions.groupsAttention"),
  ], [t]);

  const inputDisabled =
    isLoading || Boolean(pendingPreview) || localLlmStatus.state === "unsupported";

  const handleSuggestion = useCallback(
    (suggestion: string) => { tap(); void sendMessage(suggestion); },
    [sendMessage, tap],
  );

  const handleClearChat = useCallback(() => {
    tap();
    clearChat();
    onClear?.();
  }, [clearChat, tap, onClear]);

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

    const insightPrompt =
      "Summarize my spending patterns, active balances, and any groups needing attention in 3 concise bullet points. Use plain text, no markdown headers.";

    if (insightTimerRef.current) clearTimeout(insightTimerRef.current);

    void sendMessage(insightPrompt).then(() => {
      insightTimerRef.current = setTimeout(() => {
        setInsightsState("ready");
      }, 300);
    }).catch(() => {
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

  const showWeakModelWarning = useMemo(
    () => isWeakExpenseChatModel(selectedModel),
    [selectedModel],
  );

  const showInsightsDot = insightsState === "ready" && activeTab !== "insights";

  return (
    <>
      {/* ── Header ── */}
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            <FairPayIcon size={18} className="rounded-sm shrink-0" />
            <div className="min-w-0">
              <p className="text-base font-semibold leading-tight">{t("aiChat.title")}</p>
              <p className="truncate text-xs text-muted-foreground">{t("aiChat.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* History button — ghost, always shows icon + label */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { tap(); setHistoryOpen(true); }}
              disabled={conversations.length === 0}
              aria-label={t("aiChat.chatHistory")}
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ClockIcon size={13} />
              <span>History</span>
            </Button>
            {/* New chat button — outline, always shows icon + label (ChatGPT/Claude style) */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { tap(); newChat(); }}
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium"
              aria-label={t("aiChat.newChat")}
            >
              <PencilIcon size={13} />
              <span>New chat</span>
            </Button>
            {/* Clear (delete current) button — icon only, destructive utility */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClearChat}
              disabled={messages.length === 0 && !pendingPreview}
              aria-label={t("aiChat.clearChat")}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
            >
              <Trash2Icon size={14} />
            </Button>
          </div>
        </div>
      </div>

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

      {/* ── Chat tab ── */}
      {activeTab === "chat" && (
        <>
          {/* Scroll area + history overlay — overflow-hidden ensures absolute child is constrained after resize */}
          <div className="relative flex-1 min-h-0 overflow-hidden">
            <ChatHistoryDialog
              open={historyOpen}
              onClose={() => setHistoryOpen(false)}
              conversations={conversations}
              activeId={conversationId}
              onSelect={selectConversation}
              onDelete={deleteConversation}
            />
            <div ref={scrollRef} className="absolute inset-0 overflow-y-auto px-4 scroll-smooth">
              <div className="py-5 space-y-1">
                {messages.length === 0 && !pendingPreview && (
                  <div className="space-y-4 pb-2">
                    <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground leading-relaxed">
                      {t("aiChat.welcome")}
                    </div>
                    <p className="text-xs font-medium text-muted-foreground px-1">Suggestions</p>
                    <div className="grid grid-cols-2 gap-2">
                      {suggestions.map((suggestion) => (
                        <Button
                          key={suggestion}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestion(suggestion)}
                          disabled={isLoading || localLlmStatus.state === "unsupported"}
                          className="h-auto min-h-[52px] justify-start whitespace-normal rounded-xl px-3 py-2.5 text-left text-xs leading-snug"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages with date dividers */}
                {messages.reduce<React.ReactNode[]>((nodes, message, index) => {
                  const dateKey = isoDateKey(message.created_at);
                  const prevDateKey = index > 0 ? isoDateKey(messages[index - 1].created_at) : null;
                  const showDivider = dateKey !== prevDateKey;

                  if (showDivider) {
                    const label = formatDateDivider(message.created_at);
                    if (label) {
                      nodes.push(
                        <div
                          key={`divider-${dateKey}`}
                          className="flex items-center gap-3 py-3"
                        >
                          <div className="h-px flex-1 bg-border" />
                          <span className="shrink-0 text-[11px] font-medium text-muted-foreground/60">
                            {label}
                          </span>
                          <div className="h-px flex-1 bg-border" />
                        </div>,
                      );
                    }
                  }

                  nodes.push(
                    <div key={message.id} className="py-1">
                      <ChatMessage
                        message={message}
                        userInfo={identity}
                        isStreaming={
                          isLoading &&
                          index === messages.length - 1 &&
                          message.role === "assistant"
                        }
                      />
                    </div>,
                  );

                  return nodes;
                }, [])}

                {pendingPreview && (
                  <AgentConfirmationCard
                    preview={pendingPreview}
                    onDone={(result) => confirmPreview(result)}
                    onCancel={clearPreview}
                    onError={(err: Error) => console.error(err)}
                  />
                )}

                {/* Loading status bubble — shown while model is loading/downloading */}
                {isLoading && localLlmStatus.state === "loading" && (
                  <div className="py-1">
                    <LoadingStatusBubble localLlmStatus={localLlmStatus} />
                  </div>
                )}

                {/* Typing indicator — shown when model is ready but still generating */}
                {isLoading && localLlmStatus.state !== "loading" && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="py-1">
                    <TypingIndicator />
                  </div>
                )}

                {error && (
                  <div className="flex gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Scroll-to-bottom button — shown when scrolled up and there are messages */}
            {showScrollBtn && messages.length > 0 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                <button
                  type="button"
                  onClick={scrollToBottom}
                  aria-label="Scroll to latest message"
                  className="flex items-center gap-1.5 rounded-full border bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur-sm transition-all hover:bg-accent"
                >
                  <ArrowDownIcon size={12} />
                  Latest
                </button>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {showWeakModelWarning && (
              <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
                <p className="font-medium">{t("aiChat.weakModelWarning.title")}</p>
                <p className="mt-0.5 text-[11px] opacity-90">{t("aiChat.weakModelWarning.body")}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => {
                    tap();
                    setModelDialogOpen(true);
                  }}
                >
                  {t("aiChat.weakModelWarning.action")}
                </Button>
              </div>
            )}
            <ChatInput
              onSend={sendMessage}
              onAttachImage={attachReceiptImage}
              isLoading={isLoading}
              disabled={inputDisabled}
              selectedModel={selectedModel}
              localLlmStatus={localLlmStatus}
              onOpenModelDialog={handleOpenModelDialog}
            />
            {pendingPreview && (
              <p className="mt-2 text-xs text-muted-foreground">{t("aiChat.pendingPreview")}</p>
            )}
          </div>
        </>
      )}

      {/* ── Insights tab ── */}
      {activeTab === "insights" && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            <div className="py-4 space-y-4">
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
                  disabled={insightsState === "loading" || isLoading || localLlmStatus.state !== "ready"}
                >
                  {insightsState === "loading" ? (
                    <Loader2Icon size={11} className="animate-spin" />
                  ) : (
                    <SparklesIcon size={11} />
                  )}
                  {insightsState === "ready" ? "Regenerate" : "Generate"}
                </Button>
              </div>

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

          <div className="shrink-0 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <p className="text-[11px] text-muted-foreground">
              Insights are generated locally in your browser — no data is sent to any server.
            </p>
          </div>
        </>
      )}

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

export default ChatPanelContent;
