import { memo, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FairPayIcon } from "@/components/ui/icons";
import { useReducedMotion } from "@/hooks/ui/use-reduced-motion";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "../types";

interface UserInfo {
  full_name?: string;
  avatar_url?: string | null;
}

interface ChatMessageProps {
  message: ChatMessageType;
  userInfo?: UserInfo;
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

function useStreamingContent(content: string, enabled: boolean): string {
  const reducedMotion = useReducedMotion();
  const [visibleContent, setVisibleContent] = useState(() => (enabled && !reducedMotion ? "" : content));

  useEffect(() => {
    if (!enabled || reducedMotion || content.length === 0) {
      setVisibleContent(content);
      return;
    }

    let frame = 0;
    let cursor = 0;
    setVisibleContent("");

    const reveal = () => {
      cursor = Math.min(content.length, cursor + Math.max(2, Math.ceil(content.length / 80)));
      setVisibleContent(content.slice(0, cursor));

      if (cursor < content.length) {
        frame = window.setTimeout(reveal, 18);
      }
    };

    frame = window.setTimeout(reveal, 40);
    return () => window.clearTimeout(frame);
  }, [content, enabled, reducedMotion]);

  return visibleContent;
}

export const ChatMessage = memo(function ChatMessage({ message, userInfo }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.metadata?.status === "failure";
  const streamedContent = useStreamingContent(message.content, !isUser);
  const isStreaming = !isUser && streamedContent.length < message.content.length;
  const userInitials = useMemo(() => getInitials(userInfo?.full_name), [userInfo?.full_name]);

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
          {streamedContent}
        </ReactMarkdown>
        {isStreaming && (
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
