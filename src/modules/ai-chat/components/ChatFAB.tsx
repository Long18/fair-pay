import { memo, useState, useCallback } from 'react';
import { useHaptics } from "@/hooks/use-haptics";
import { AlertCircleIcon, CheckIcon, XIcon } from '@/components/ui/icons';
import { FloatingActionStack, FloatingPill } from '@/components/ui/floating-stack';
import { cn } from '@/lib/utils';
import { AiChatProvider, useAiChatContext } from '../AiChatContext';
import { ChatPanel } from './ChatPanel';

// ─── FAB state machine ────────────────────────────────────────────────────────
// idle       → animated muted dots + label
// loading    → spinner + "Loading model… XX%"
// responding → pulsing primary dots + "Thinking…"
// done       → checkmark + "Replied" (1.4 s flash)
// error      → error icon + "Model error"

type FabState = 'idle' | 'loading' | 'responding' | 'done' | 'error';

function useFabState() {
  const { localLlmStatus, isLoading, fabDone } = useAiChatContext();

  if (localLlmStatus.state === 'error' || localLlmStatus.state === 'unsupported') return 'error' as FabState;
  if (localLlmStatus.state === 'loading') return 'loading' as FabState;
  if (isLoading) return 'responding' as FabState;
  if (fabDone) return 'done' as FabState;
  return 'idle' as FabState;
}

function FabLabel({ state, progress }: { state: FabState; progress?: number }) {
  if (state === 'loading') {
    const pct = progress != null ? `${Math.round(progress * 100)}%` : '';
    return <span className="text-[13px] font-semibold whitespace-nowrap">Loading model… {pct}</span>;
  }
  if (state === 'responding') return <span className="text-[13px] font-semibold whitespace-nowrap">Thinking…</span>;
  if (state === 'done') return <span className="text-[13px] font-semibold whitespace-nowrap">Replied</span>;
  if (state === 'error') return <span className="text-[13px] font-semibold whitespace-nowrap">Model error</span>;
  return <span className="text-[13px] font-semibold whitespace-nowrap">Ask FairPay AI</span>;
}

function FabIcon({ state }: { state: FabState }) {
  if (state === 'loading') {
    return (
      <span className="h-[13px] w-[13px] rounded-full border-2 border-muted-foreground/40 border-t-primary animate-spin inline-block shrink-0" />
    );
  }
  if (state === 'responding') {
    return (
      <span className="inline-flex items-center gap-[3px] shrink-0">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-[6px] w-[6px] rounded-full bg-primary"
            style={{ animation: `fabDotPulse 0.8s ease-in-out ${i * 0.16}s infinite` }}
          />
        ))}
      </span>
    );
  }
  if (state === 'done') {
    return <CheckIcon size={15} className="text-emerald-500 shrink-0" />;
  }
  if (state === 'error') {
    return <AlertCircleIcon size={15} className="text-destructive shrink-0" />;
  }
  // idle — muted dots
  return (
    <span className="inline-flex items-center gap-[3px] shrink-0">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-[6px] w-[6px] rounded-full bg-muted-foreground"
          style={{ animation: `fabDotPulse 1.7s ease-in-out ${i * 0.25}s infinite` }}
        />
      ))}
    </span>
  );
}

// Inner component — must be inside AiChatProvider to call useAiChatContext
const ChatFABInner = memo(function ChatFABInner() {
  const [open, setOpen] = useState(false);
  const { tap } = useHaptics();
  const fabState = useFabState();
  const { localLlmStatus } = useAiChatContext();

  const toggle = useCallback(() => { tap(); setOpen((prev) => !prev); }, [tap]);

  const progress = localLlmStatus.state === 'loading' ? localLlmStatus.progress : undefined;

  return (
    <>
      {/* keyframes injected once */}
      <style>{`
        @keyframes fabDotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.45); opacity: 0.5; }
        }
      `}</style>

      <ChatPanel open={open} onOpenChange={setOpen} />

      <FloatingActionStack
        side="left"
        trigger={
          open ? (
            // When panel is open: compact square close button
            <FloatingPill
              variant="glass"
              size="default"
              onClick={toggle}
              ariaLabel="Close chat assistant"
              className="aspect-square !px-0 !min-w-[48px]"
            >
              <XIcon size={20} />
            </FloatingPill>
          ) : (
            // When panel is closed: state-machine pill
            <FloatingPill
              variant="glass"
              size="default"
              onClick={toggle}
              ariaLabel="Open FairPay Assistant"
              className={cn(
                "gap-2 px-4",
                fabState === 'done' && "border-emerald-300 dark:border-emerald-800",
                fabState === 'error' && "border-destructive/40",
              )}
            >
              <FabIcon state={fabState} />
              <FabLabel state={fabState} progress={progress} />
            </FloatingPill>
          )
        }
      />
    </>
  );
});

export const ChatFAB = memo(function ChatFAB() {
  return (
    <AiChatProvider>
      <ChatFABInner />
    </AiChatProvider>
  );
});
