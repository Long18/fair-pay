import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { useGetIdentity } from "@refinedev/core";
import { AgentConfirmationCard } from "@/components/agent/AgentConfirmationCard";
import {
  AlertCircleIcon,
  ArrowDownIcon,
} from "@/components/ui/icons";
import type { Profile } from "@/modules/profile/types";
import { cn } from "@/lib/utils";
import ChatMessage from "./ChatMessage";
import { LoadingStatusBubble } from "./LoadingStatusBubble";
import { TypingIndicator } from "./TypingIndicator";
import { useAiChatContext } from "../AiChatContext";

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

function isoDateKey(iso: string): string {
  return iso.slice(0, 10);
}

interface ChatThreadProps {
  emptyState?: ReactNode;
  className?: string;
}

export const ChatThread = memo(function ChatThread({
  emptyState,
  className,
}: ChatThreadProps) {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const {
    messages,
    isLoading,
    error,
    pendingPreview,
    localLlmStatus,
    clearPreview,
  } = useAiChatContext();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const lastMessageCountRef = useRef(messages.length);
  const isEmpty = messages.length === 0 && !pendingPreview;

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isEmpty) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const newMessages = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;
    if (messages.length === 1 || distFromBottom < 200 || newMessages) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: messages.length === 1 ? "instant" : "smooth",
      });
    }
  }, [messages, isLoading, pendingPreview, isEmpty]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setShowScrollBtn(false);
  }, []);

  return (
    <div className={cn("relative min-h-0 flex-1 overflow-hidden", className)}>
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto scroll-smooth">
        <div className="mx-auto max-w-3xl px-4 py-5 space-y-1">
          {isEmpty && emptyState}

          {messages.reduce<ReactNode[]>((nodes, message, index) => {
            const dateKey = isoDateKey(message.created_at);
            const prevDateKey =
              index > 0 ? isoDateKey(messages[index - 1].created_at) : null;
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
              onDone={clearPreview}
              onCancel={clearPreview}
              onError={(err: Error) => console.error(err)}
            />
          )}

          {isLoading && localLlmStatus.state === "loading" && (
            <div className="py-1">
              <LoadingStatusBubble localLlmStatus={localLlmStatus} />
            </div>
          )}

          {isLoading &&
            localLlmStatus.state !== "loading" &&
            messages[messages.length - 1]?.role !== "assistant" && (
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

      {showScrollBtn && messages.length > 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={scrollToBottom}
            aria-label={t("aiChat.scrollToLatest")}
            className="flex items-center gap-1.5 rounded-full border bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur-sm transition-all hover:bg-accent"
          >
            <ArrowDownIcon size={12} />
            {t("aiChat.scrollToLatest")}
          </button>
        </div>
      )}
    </div>
  );
});
