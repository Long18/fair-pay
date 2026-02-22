import { memo, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGetIdentity } from '@refinedev/core';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { SparklesIcon, Trash2Icon } from '@/components/ui/icons';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ConfirmActionCard } from './ConfirmActionCard';
import { TypingIndicator } from './TypingIndicator';
import { useAiChat } from '../hooks/use-ai-chat';
import type { Profile } from '@/modules/profile/types';

interface ChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUGGESTIONS = [
  'Who owes me money?',
  'Show my groups',
  'Add an expense',
  'Recent expenses',
];

export const ChatPanel = memo(function ChatPanel({ open, onOpenChange }: ChatPanelProps) {
  const { data: identity } = useGetIdentity<Profile>();
  const {
    messages,
    isLoading,
    error,
    pendingAction,
    sendMessage,
    confirmAction,
    rejectAction,
    clearChat,
  } = useAiChat();

  const userInfo = useMemo(() => ({
    full_name: identity?.full_name,
    avatar_url: identity?.avatar_url,
  }), [identity?.full_name, identity?.avatar_url]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pendingAction, isLoading]);

  const handleSuggestion = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col p-0 w-full sm:max-w-md overscroll-contain"
      >
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <SparklesIcon size={18} className="text-primary" aria-hidden="true" />
              <SheetTitle className="text-base">FairPay Assistant</SheetTitle>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                className="h-11 w-11"
                aria-label="Clear chat history"
              >
                <Trash2Icon size={14} />
              </Button>
            )}
          </div>
          <SheetDescription className="sr-only">
            AI assistant to help manage expenses, groups, and payments
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-hidden">
          <div ref={scrollRef} className="h-full overflow-y-auto">
            <div className="px-3 pb-3" role="log" aria-live="polite" aria-label="Chat messages">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <SparklesIcon size={32} className="text-muted-foreground/40 mb-3" aria-hidden="true" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    How can I help?
                  </p>
                  <p className="text-xs text-muted-foreground/70 mb-4 max-w-[240px]">
                    Ask about your expenses, groups, balances, or let me help you add transactions.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSuggestion(s)}
                        className="rounded-full border px-3 py-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer min-h-[44px]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} userInfo={userInfo} />
                ))
              )}
              {isLoading && messages.length > 0 && <TypingIndicator />}
            </div>
          </div>
        </ScrollArea>

        {pendingAction && (
          <ConfirmActionCard
            action={pendingAction}
            onConfirm={confirmAction}
            onReject={rejectAction}
            isLoading={isLoading}
          />
        )}

        {error && (
          <div role="alert" className="mx-3 mb-1 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </SheetContent>
    </Sheet>
  );
});
