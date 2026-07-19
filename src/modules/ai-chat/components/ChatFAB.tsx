import { memo, useCallback } from "react";
import { useHaptics } from "@/hooks/use-haptics";
import { AlertCircleIcon, CheckIcon } from "@/components/ui/icons";
import { FloatingActionStack, FloatingPill } from "@/components/ui/floating-stack";
import { cn } from "@/lib/utils";
import { useAiChatContext } from "../AiChatContext";

type FabState = "idle" | "loading" | "responding" | "done" | "error";

function useFabState() {
  const { localLlmStatus, isLoading, fabDone } = useAiChatContext();

  if (localLlmStatus.state === "error" || localLlmStatus.state === "unsupported")
    return "error" as FabState;
  if (localLlmStatus.state === "loading") return "loading" as FabState;
  if (isLoading) return "responding" as FabState;
  if (fabDone) return "done" as FabState;
  return "idle" as FabState;
}

function FabIcon({ state }: { state: FabState }) {
  if (state === "loading") {
    return (
      <span className="h-[13px] w-[13px] rounded-full border-2 border-muted-foreground/40 border-t-primary animate-spin inline-block shrink-0" />
    );
  }
  if (state === "responding") {
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
  if (state === "done") {
    return <CheckIcon size={15} className="text-emerald-500 shrink-0" />;
  }
  if (state === "error") {
    return <AlertCircleIcon size={15} className="text-destructive shrink-0" />;
  }
  return (
    <span className="inline-flex items-center gap-[3px] shrink-0">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-[6px] w-[6px] rounded-full bg-foreground/70"
          style={{ animation: `fabDotPulse 1.7s ease-in-out ${i * 0.25}s infinite` }}
        />
      ))}
    </span>
  );
}

/** Opens the FairPay Assistant dialog. Expects AiChatProvider above. */
export const ChatFAB = memo(function ChatFAB() {
  const { tap } = useHaptics();
  const { isChatOpen, openChat } = useAiChatContext();
  const fabState = useFabState();

  const handleOpen = useCallback(() => {
    tap();
    openChat();
  }, [openChat, tap]);

  if (isChatOpen) return null;

  return (
    <>
      <style>{`
        @keyframes fabDotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.45); opacity: 0.5; }
        }
      `}</style>

      <FloatingActionStack
        side="left"
        trigger={
          <FloatingPill
            variant="glass"
            size="default"
            onClick={handleOpen}
            ariaLabel="Open FairPay Assistant"
            className={cn(
              "aspect-square !px-0 !min-w-[48px]",
              fabState === "done" && "border-emerald-300 dark:border-emerald-800",
              fabState === "error" && "border-destructive/40",
            )}
          >
            <FabIcon state={fabState} />
          </FloatingPill>
        }
      />
    </>
  );
});
