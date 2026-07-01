import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FairPayIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "../types";

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

export const ChatMessage = memo(function ChatMessage({ message, userInfo, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.metadata?.status === "failure";
  const userInitials = useMemo(() => getInitials(userInfo?.full_name), [userInfo?.full_name]);
  const hasContent = message.content.length > 0;
  // Inline cursor rides at the end of the last rendered block (paragraph/li/etc.)
  const showInlineCursor = !isUser && isStreaming && hasContent;
  // Placeholder cursor for the empty-content edge case (no tokens yet)
  const showPlaceholderCursor = !isUser && !hasContent;

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0 border bg-background">
          <AvatarFallback className="bg-background p-1 text-primary">
            <FairPayIcon size={22} className="rounded-sm" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "max-w-[82%] rounded-lg px-3 py-2 text-sm leading-6 shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border bg-card text-card-foreground",
          isError && "border-destructive/30 bg-destructive/10 text-destructive",
          // Inline blinking cursor at the end of the last block, so it tracks
          // the last character of the streaming text instead of dropping to a
          // new line below the paragraph.
          showInlineCursor && "[&>*:last-child]:after:content-['▊'] [&>*:last-child]:after:ml-0.5 [&>*:last-child]:after:inline-block [&>*:last-child]:after:animate-pulse [&>*:last-child]:after:text-primary [&>*:last-child]:after:font-normal [&>*:last-child]:after:align-baseline",
        )}
      >
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
          {message.content}
        </ReactMarkdown>
        {showPlaceholderCursor && (
          <span className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 animate-pulse rounded-full bg-primary" />
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
