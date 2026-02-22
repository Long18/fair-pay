import { memo, useEffect, useRef, useCallback, useMemo, useState } from 'react';
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
import { AlertCircleIcon, ExternalLinkIcon, Loader2Icon, LogInIcon, SparklesIcon, Trash2Icon } from '@/components/ui/icons';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ConfirmActionCard } from './ConfirmActionCard';
import { TypingIndicator } from './TypingIndicator';
import { useAiChat } from '../hooks/use-ai-chat';
import type { Profile } from '@/modules/profile/types';
import { getPuter, kickoffPuterSigninFromUserGesture, waitForPuter } from '@/lib/puter-auth';

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

type PuterConnectionState = 'checking' | 'disconnected' | 'connected' | 'sdk_unavailable' | 'connecting';

const getPuterConnectErrorMessage = (error: unknown): string => {
  const err = error as { error?: string; msg?: string; message?: string } | undefined;
  const rawMessage = err?.msg || err?.message || '';

  if (err?.error === 'auth_window_closed') {
    return 'Puter sign-in was closed before completion.';
  }

  if (rawMessage.includes('closed') && rawMessage.includes('null')) {
    return 'Popup was blocked. Please allow popups for this site and try again.';
  }

  if (rawMessage) {
    return rawMessage;
  }

  return 'Could not connect to Puter right now. Please try again.';
};

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
  const [puterState, setPuterState] = useState<PuterConnectionState>('checking');
  const [puterConnectError, setPuterConnectError] = useState<string | null>(null);

  const userInfo = useMemo(() => ({
    full_name: identity?.full_name,
    avatar_url: identity?.avatar_url,
  }), [identity?.full_name, identity?.avatar_url]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isPuterConnected = puterState === 'connected';
  const isPuterConnecting = puterState === 'connecting';

  const refreshPuterConnection = useCallback(async () => {
    setPuterConnectError(null);

    const immediate = getPuter();
    if (immediate?.auth) {
      setPuterState(immediate.auth.isSignedIn() ? 'connected' : 'disconnected');
      return;
    }

    setPuterState('checking');
    const puter = await waitForPuter(2500, 100);
    if (!puter?.auth) {
      setPuterState('sdk_unavailable');
      return;
    }

    setPuterState(puter.auth.isSignedIn() ? 'connected' : 'disconnected');
  }, []);

  const handleConnectPuter = useCallback(async () => {
    setPuterConnectError(null);

    // Avoid invoking Puter signIn when popups are blocked: its SDK currently spams console on null popup.
    const popupProbe = window.open('', '_blank', 'popup,width=10,height=10,left=-10000,top=-10000');
    if (!popupProbe) {
      setPuterState('disconnected');
      setPuterConnectError('Popup is blocked by the browser. Allow popups for this site to connect Puter.');
      return;
    }
    popupProbe.close();

    setPuterState('connecting');
    try {
      const result = await kickoffPuterSigninFromUserGesture();
      if (result === 'unavailable') {
        setPuterState('sdk_unavailable');
        setPuterConnectError('AI service is still loading. Please try again in a moment.');
        return;
      }
      setPuterState('connected');
    } catch (error) {
      setPuterState('disconnected');
      setPuterConnectError(getPuterConnectErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pendingAction, isLoading]);

  useEffect(() => {
    if (!open) return;
    void refreshPuterConnection();
  }, [open, refreshPuterConnection]);

  const handleSuggestion = useCallback((text: string) => {
    if (!isPuterConnected) return;
    void sendMessage(text);
  }, [isPuterConnected, sendMessage]);

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
                  {isPuterConnected ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Connect Third-Party AI to Start Chatting
                      </p>
                      <p className="text-xs text-muted-foreground/80 mb-2 max-w-[280px]">
                        FairPay Assistant uses Puter (third-party AI). Messages you send in this chat will be sent to Puter to generate responses.
                      </p>
                      <a
                        href="https://docs.puter.com/getting-started/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Learn more about Puter <ExternalLinkIcon size={12} aria-hidden="true" />
                      </a>
                    </>
                  )}
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

        {!isPuterConnected && (
          <div className="mx-3 mb-2 rounded-md border bg-muted/40 px-3 py-3">
            <div className="flex items-start gap-2">
              <AlertCircleIcon size={14} className="mt-0.5 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">
                  Third-party sign-in required for AI chat
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Connect your Puter session to use AI chat in FairPay.
                </p>
                {puterConnectError && (
                  <p role="alert" className="mt-1.5 text-xs text-destructive">
                    {puterConnectError}
                  </p>
                )}
                {puterState === 'sdk_unavailable' && !puterConnectError && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    AI script is still loading. Try again in a moment.
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleConnectPuter}
                    disabled={isPuterConnecting || puterState === 'checking'}
                    className="h-9"
                  >
                    {isPuterConnecting || puterState === 'checking' ? (
                      <>
                        <Loader2Icon size={14} className="mr-1.5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <LogInIcon size={14} className="mr-1.5" />
                        Connect Puter
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void refreshPuterConnection()}
                    disabled={isPuterConnecting}
                    className="h-9"
                  >
                    Refresh status
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ChatInput
          onSend={(message) => { void sendMessage(message); }}
          isLoading={isLoading || isPuterConnecting}
          disabled={!isPuterConnected}
        />
      </SheetContent>
    </Sheet>
  );
});
