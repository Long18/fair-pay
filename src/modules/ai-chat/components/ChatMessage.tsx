import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SparklesIcon, UserIcon } from '@/components/ui/icons';
import type { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isError = message.metadata?.status === 'failure';

  return (
    <div className={cn('flex gap-3 py-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className={cn(
          'text-xs',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}>
          {isUser ? <UserIcon size={14} /> : <SparklesIcon size={14} />}
        </AvatarFallback>
      </Avatar>

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
              <span key={i} className="inline-block rounded-md bg-background/50 px-2 py-0.5 text-xs text-muted-foreground border">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
