import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SparklesIcon } from '@/components/ui/icons';
import type { ChatMessage as ChatMessageType } from '../types';

interface UserInfo {
  full_name?: string;
  avatar_url?: string | null;
}

interface ChatMessageProps {
  message: ChatMessageType;
  userInfo?: UserInfo;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export const ChatMessage = memo(function ChatMessage({ message, userInfo }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isError = message.metadata?.status === 'failure';

  return (
    <div className={cn('flex gap-3 py-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {isUser ? (
        <Avatar className="h-7 w-7 shrink-0 ring-2 ring-primary/20" aria-hidden="true">
          {userInfo?.avatar_url ? (
            <AvatarImage src={userInfo.avatar_url} alt={userInfo.full_name ?? 'User'} />
          ) : null}
          <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-semibold">
            {getInitials(userInfo?.full_name)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="relative h-7 w-7 shrink-0" aria-hidden="true">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
              <SparklesIcon size={14} />
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
        </div>
      )}

      <div className={cn(
        'max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
        isUser
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : isError
            ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-sm'
            : 'bg-muted rounded-bl-sm',
      )}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>ul]:mb-1.5 [&>ol]:mb-1.5">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {message.metadata?.next_suggestions && message.metadata.next_suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.metadata.next_suggestions.map((s, i) => (
              <span key={i} className="inline-block rounded-md bg-background/50 px-2 py-0.5 text-xs text-muted-foreground border" aria-hidden="true">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
