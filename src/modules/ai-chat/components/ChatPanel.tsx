import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGetIdentity } from "@refinedev/core";
import { AgentConfirmationCard } from "@/components/agent/AgentConfirmationCard";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useAiChat } from "../hooks/use-ai-chat";
import type { ChatMessage as ChatMessageType } from "../types";

interface ChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function statusDotColor(status: LocalLlmStatus): string {
  switch (status.state) {
    case "ready":    return "bg-emerald-500";
    case "loading":  return "bg-amber-500 animate-pulse";
    case "error":
    case "unsupported": return "bg-destructive";
    default:         return "bg-muted-foreground/40";
  }
}

function statusLabel(status: LocalLlmStatus, t: (key: string, opts?: Record<string, unknown>) => string): string {
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
  } = useAiChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const { tap } = useHaptics();

  const suggestions = useMemo(() => [
    t("aiChat.suggestions.whoOwes"),
    t("aiChat.suggestions.recentActivity"),
    t("aiChat.suggestions.dinnerExpense"),
    t("aiChat.suggestions.groupsAttention"),
  ], [t]);

  const selectedEntry = useMemo(() => getWebLlmModelEntry(selectedModel), [selectedModel]);

  // Input is only blocked while actively processing a message or waiting for confirmation.
  // If the model isn't loaded yet, sendMessage auto-loads it on first send.
  const inputDisabled = isLoading || Boolean(pendingPreview) || localLlmStatus.state === "unsupported";

  useEffect(() => {
    if (!open) return;
    const viewport = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    viewport?.scrollTo({ top: viewport.scrollHeight, behavior: messages.length === 1 ? "instant" : "smooth" });
  }, [messages, isLoading, pendingPreview, open]);

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      tap();
      void sendMessage(suggestion);
    },
    [sendMessage, tap],
  );

  const handleClearChat = useCallback(() => {
    tap();
    clearChat();
  }, [clearChat, tap]);

  // Select a new model and immediately trigger load using the explicit model id,
  // bypassing the React state timing issue.
  const handleSelectAndLoad = useCallback(
    async (model: WebLlmModelId) => {
      tap();
      selectLocalModel(model);
      await loadModel(model);
    },
    [selectLocalModel, tap],
  );

  const handleOpenModelDialog = useCallback(() => {
    tap();
    setModelDialogOpen(true);
  }, [tap]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col w-full h-[100dvh] sm:h-full gap-0 p-0 sm:max-w-[520px]">
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

          {/* Compact model status strip */}
          <div className="shrink-0 border-b px-4 py-2">
            <div className="flex items-center gap-2">
              {/* Status dot */}
              <span
                className={cn("h-2 w-2 shrink-0 rounded-full", statusDotColor(localLlmStatus))}
                aria-hidden="true"
              />

              {/* Status label */}
              <span className="flex-1 truncate text-xs font-medium text-muted-foreground">
                {statusLabel(localLlmStatus, t)}
              </span>

              {/* Loading % */}
              {localLlmStatus.state === "loading" && (
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {Math.round(localLlmStatus.progress * 100)}%
                </span>
              )}

              {/* Open model selector */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 gap-1.5 px-2 text-xs"
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

            {/* Loading progress bar */}
            {localLlmStatus.state === "loading" && (
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${Math.max(2, Math.min(100, localLlmStatus.progress * 100))}%` }}
                />
              </div>
            )}
          </div>

          <ScrollArea ref={scrollRef} className="min-h-0 flex-1 px-4">
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
          </ScrollArea>

          <div className="shrink-0 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <ChatInput onSend={sendMessage} isLoading={isLoading} disabled={inputDisabled} />
            {pendingPreview && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("aiChat.pendingPreview")}
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Model selector dialog — rendered outside Sheet to avoid stacking context issues */}
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
