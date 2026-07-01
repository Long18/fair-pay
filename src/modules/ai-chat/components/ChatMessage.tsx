import { memo, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDownIcon, FairPayIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "../types";
import { parseAssistantStream } from "../utils/parse-assistant-stream";

interface UserInfo {
  full_name?: string;
  avatar_url?: string | null;
}

interface ChatMessageProps {
  message: ChatMessageType;
  userInfo?: UserInfo;
  isStreaming?: boolean;
}

function getInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/** Format an ISO timestamp as "HH:mm" (24-hour). Returns empty string on parse failure. */
function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "";
  }
}

export const ChatMessage = memo(function ChatMessage({ message, userInfo, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.metadata?.status === "failure";
  const userInitials = useMemo(() => getInitials(userInfo?.full_name), [userInfo?.full_name]);

  // Parse the raw model output for assistant messages only
  const parsed = useMemo(
    () => (isUser ? null : parseAssistantStream(message.content)),
    [isUser, message.content],
  );

  const displayContent = isUser ? message.content : (parsed?.displayContent ?? "");
  const hasContent = displayContent.length > 0;
  const timestamp = useMemo(() => formatTime(message.created_at), [message.created_at]);

  // Inline cursor rides at the end of the last rendered block (paragraph/li/etc.)
  const showInlineCursor = !isUser && isStreaming && hasContent && (parsed?.isFinalParsed ?? false);
  // Placeholder cursor for the empty-content edge case (no tokens yet, or still parsing JSON)
  const showPlaceholderCursor = !isUser && (!hasContent || (isStreaming && !parsed?.isFinalParsed && !parsed?.isReasoningOpen));

  const [reasoningOpen, setReasoningOpen] = useState(false);

  return (
    <div className={cn("flex gap-2.5", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0 border bg-background">
          <AvatarFallback className="bg-background p-1 text-primary">
            <FairPayIcon size={22} className="rounded-sm" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex max-w-[85%] flex-col", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-[14px] leading-[1.55] shadow-sm break-words",
            isUser
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm border bg-card text-card-foreground",
            isError && "border-destructive/30 bg-destructive/10 text-destructive",
            // Inline blinking cursor at the end of the last block, so it tracks
            // the last character of the streaming text.
            showInlineCursor && "[&>*:last-child]:after:content-['▊'] [&>*:last-child]:after:ml-0.5 [&>*:last-child]:after:inline-block [&>*:last-child]:after:animate-pulse [&>*:last-child]:after:text-primary [&>*:last-child]:after:font-normal [&>*:last-child]:after:align-baseline",
          )}
        >
          {/* Reasoning block — collapsed by default, pulsing while still streaming */}
          {!isUser && parsed?.reasoning != null && (
            <Collapsible open={reasoningOpen} onOpenChange={setReasoningOpen} className="mb-2">
              <CollapsibleTrigger
                className={cn(
                  "flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors select-none",
                  parsed.isReasoningOpen && "animate-pulse",
                )}
              >
                <ChevronDownIcon
                  size={12}
                  className={cn("transition-transform", reasoningOpen && "rotate-180")}
                />
                {parsed.isReasoningOpen ? "Thinking..." : "Reasoning"}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1.5 rounded border border-dashed border-muted-foreground/25 bg-muted/40 px-2.5 py-2 text-xs leading-5 text-muted-foreground/70 whitespace-pre-wrap">
                  {parsed.reasoning}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 list-disc pl-4 last:mb-0">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 list-decimal pl-4 last:mb-0">{children}</ol>,
              li: ({ children }) => <li className="mb-1 last:mb-0">{children}</li>,
              code: ({ children }) => (
                <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">{children}</code>
              ),
            }}
          >
            {displayContent}
          </ReactMarkdown>

          {showPlaceholderCursor && (
            <span className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 animate-pulse rounded-full bg-primary" />
          )}
        </div>

        {/* Timestamp below bubble */}
        {timestamp && (
          <span className={cn("mt-1 px-1 text-[10.5px] text-muted-foreground/70 tabular-nums", isUser ? "text-right" : "text-left")}>
            {timestamp}
          </span>
        )}
      </div>

      {isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={userInfo?.avatar_url ?? undefined} alt={userInfo?.full_name ?? "You"} />
          <AvatarFallback>{userInitials}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
});

export default ChatMessage;
