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
import ReadDigestCard from "./ReadDigestCard";
import ChatEntityListCard from "./ChatEntityListCard";
import AssistantCapabilitiesCard from "./AssistantCapabilitiesCard";
import AssistantToolTrace from "./AssistantToolTrace";

interface UserInfo {
  full_name?: string;
  avatar_url?: string | null;
}

interface ChatMessageProps {
  message: ChatMessageType;
  userInfo?: UserInfo;
  isStreaming?: boolean;
  onQuickPrompt?: (prompt: string) => void;
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

export const ChatMessage = memo(function ChatMessage({
  message,
  userInfo,
  isStreaming = false,
  onQuickPrompt,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.metadata?.status === "failure";
  const readDigest = !isUser ? message.metadata?.read_digest : undefined;
  const entitySurface = !isUser ? message.metadata?.entity_surface : undefined;
  const assistantCapabilities = !isUser ? message.metadata?.assistant_capabilities : undefined;
  const toolTrace = !isUser ? message.metadata?.tool_trace : undefined;
  const responseLanguage = message.metadata?.response_language;
  const richSurface = Boolean(readDigest || entitySurface || assistantCapabilities);
  const userInitials = useMemo(() => getInitials(userInfo?.full_name), [userInfo?.full_name]);

  // Parse the raw model output for assistant messages only
  const parsed = useMemo(
    () => (isUser ? null : parseAssistantStream(message.content)),
    [isUser, message.content],
  );

  const displayContent = isUser ? message.content : (parsed?.displayContent ?? "");
  const hasContent = displayContent.length > 0;
  const timestamp = useMemo(() => formatTime(message.created_at), [message.created_at]);

  const isAssistantStreaming = !isUser && isStreaming && !parsed?.isReasoningOpen;
  // Cursor at end of last markdown block while any answer text is visible (including partial JSON).
  const showInlineCursor = isAssistantStreaming && hasContent && !richSurface;
  // Lone cursor only before the first visible token.
  const showPlaceholderCursor = isAssistantStreaming && !hasContent && !richSurface;

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

      <div
        className={cn(
          "flex flex-col",
          isUser
            ? "max-w-[85%] items-end"
            : richSurface
              ? "w-full max-w-[min(100%,40rem)] items-stretch"
              : "max-w-[85%] items-start",
        )}
      >
        <div
          className={cn(
            "break-words",
            richSurface && !isUser
              ? "w-full"
              : "rounded-2xl px-3.5 py-2.5 text-[14px] leading-[1.55] shadow-sm",
            isUser
              ? "rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-[14px] leading-[1.55] text-primary-foreground shadow-sm"
              : !richSurface && "rounded-bl-sm border bg-card text-card-foreground",
            isError && !richSurface && "border-destructive/30 bg-destructive/10 text-destructive",
            // Inline blinking cursor at the end of the last block, so it tracks
            // the last character of the streaming text.
            showInlineCursor &&
              "[&_*:last-child]:after:ml-0.5 [&_*:last-child]:after:inline-block [&_*:last-child]:after:h-[1.1em] [&_*:last-child]:after:w-0.5 [&_*:last-child]:after:shrink-0 [&_*:last-child]:after:rounded-sm [&_*:last-child]:after:bg-primary/60 [&_*:last-child]:after:align-text-bottom [&_*:last-child]:after:content-['']",
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

          {toolTrace && toolTrace.length > 0 ? (
            <AssistantToolTrace
              steps={toolTrace}
              language={responseLanguage}
              defaultOpen={isStreaming && toolTrace.some((s) => s.status === "running")}
            />
          ) : null}

          {readDigest ? (
            <ReadDigestCard
              bag={readDigest}
              language={responseLanguage}
              viewerUserId={message.metadata?.viewer_user_id}
            />
          ) : entitySurface ? (
            <ChatEntityListCard surface={entitySurface} language={responseLanguage} />
          ) : assistantCapabilities ? (
            <AssistantCapabilitiesCard
              language={responseLanguage}
              onQuickPrompt={onQuickPrompt}
            />
          ) : (
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
          )}

          {showPlaceholderCursor && (
            <span
              className="inline-block h-[1.1em] w-0.5 shrink-0 rounded-sm bg-primary/60 align-text-bottom"
              aria-hidden
            />
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
