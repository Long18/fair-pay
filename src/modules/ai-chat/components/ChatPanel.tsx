import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { useGetIdentity } from "@refinedev/core";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  Loader2Icon,
  SparklesIcon,
  Trash2Icon,
  ZapIcon,
} from "@/components/ui/icons";
import { AgentConfirmationCard } from "@/components/agent/AgentConfirmationCard";
import type { Profile } from "@/modules/profile/types";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import type { LocalLlmStatus } from "@/lib/local-llm/types";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import { useAiChat } from "../hooks/use-ai-chat";

interface ChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUGGESTIONS = [
  "Who owes me money?",
  "Show my groups",
  "Add a group expense",
  "Recent expenses",
];

function modelStatusCopy(status: LocalLlmStatus): { label: string; detail: string; tone: string } {
  if (status.state === "unsupported") {
    return { label: "Local AI unavailable", detail: status.reason, tone: "text-destructive" };
  }

  if (status.state === "loading") {
    const pct = Math.round(status.progress * 100);
    return {
      label: `Loading local model${Number.isFinite(pct) ? ` ${pct}%` : ""}`,
      detail: status.message,
      tone: "text-amber-600 dark:text-amber-400",
    };
  }

  if (status.state === "ready") {
    return { label: "Local AI ready", detail: status.model, tone: "text-emerald-600 dark:text-emerald-400" };
  }

  if (status.state === "error") {
    return { label: "Local AI error", detail: status.message, tone: "text-destructive" };
  }

  return { label: "Local AI idle", detail: status.model, tone: "text-muted-foreground" };
}

export const ChatPanel = memo(function ChatPanel({ open, onOpenChange }: ChatPanelProps) {
  const { data: identity } = useGetIdentity<Profile>();
  const {
    messages,
    isLoading,
    error,
    pendingPreview,
    localLlmStatus,
    loadLocalModel,
    sendMessage,
    clearPreview,
    clearChat,
  } = useAiChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { tap } = useHaptics();

  const statusCopy = useMemo(() => modelStatusCopy(localLlmStatus), [localLlmStatus]);
  const canLoad = localLlmStatus.state === "idle" || localLlmStatus.state === "error";
  const inputDisabled = localLlmStatus.state !== "ready" || Boolean(pendingPreview);

  useEffect(() => {
    if (!open) return;
    const viewport = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [messages.length, isLoading, pendingPreview, open]);

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      tap();
      void sendMessage(suggestion);
    },
    [sendMessage, tap],
  );

  const handleLoadModel = useCallback(() => {
    tap();
    void loadLocalModel();
  }, [loadLocalModel, tap]);

  const handleClearChat = useCallback(() => {
    tap();
    clearChat();
  }, [clearChat, tap]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-[420px]">
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="min-w-0">
              <SheetTitle className="flex items-center gap-2 text-base">
                <SparklesIcon size={16} className="text-primary" />
                FairPay Assistant
              </SheetTitle>
              <SheetDescription className="truncate">Local browser AI for FairPay workflows</SheetDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClearChat}
              disabled={messages.length === 0 && !pendingPreview}
              aria-label="Clear chat"
              className="h-9 w-9 shrink-0"
            >
              <Trash2Icon size={16} />
            </Button>
          </div>
        </SheetHeader>

        <div className="border-b px-4 py-3">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background",
                statusCopy.tone,
              )}
              aria-hidden="true"
            >
              {localLlmStatus.state === "loading" ? (
                <Loader2Icon size={16} className="animate-spin" />
              ) : localLlmStatus.state === "ready" ? (
                <CheckCircleIcon size={16} />
              ) : localLlmStatus.state === "unsupported" || localLlmStatus.state === "error" ? (
                <AlertCircleIcon size={16} />
              ) : (
                <ZapIcon size={16} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn("text-sm font-medium", statusCopy.tone)}>{statusCopy.label}</div>
              <div className="break-words text-xs text-muted-foreground">{statusCopy.detail}</div>
              {localLlmStatus.state === "loading" && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${Math.max(2, Math.min(100, localLlmStatus.progress * 100))}%` }}
                  />
                </div>
              )}
            </div>
            {canLoad && (
              <Button type="button" size="sm" onClick={handleLoadModel} className="shrink-0">
                Load
              </Button>
            )}
          </div>
        </div>

        <ScrollArea ref={scrollRef} className="min-h-0 flex-1 px-4">
          <div className="space-y-4 py-4">
            {messages.length === 0 && !pendingPreview && (
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Ask about balances, groups, recent expenses, or prepare a safe expense preview.
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestion(suggestion)}
                      disabled={localLlmStatus.state !== "ready" || isLoading}
                      className="h-auto min-h-10 justify-start whitespace-normal px-3 py-2 text-left text-xs"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} userInfo={identity} />
            ))}

            {pendingPreview && (
              <AgentConfirmationCard
                preview={pendingPreview}
                onDone={clearPreview}
                onCancel={clearPreview}
                onError={(err) => console.error(err)}
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

        <div className="border-t p-4">
          <ChatInput onSend={sendMessage} isLoading={isLoading} disabled={inputDisabled} />
          {pendingPreview && (
            <p className="mt-2 text-xs text-muted-foreground">
              Resolve the pending preview before sending another request.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
});

export default ChatPanel;
