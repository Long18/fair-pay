import { memo, useCallback, useMemo } from "react";
import { useHaptics } from "@/hooks/use-haptics";
import { useMediaQuery } from "@/hooks/ui/use-media-query";
import { AlertCircleIcon, CheckIcon } from "@/components/ui/icons";
import { FloatingActionStack, FloatingPill } from "@/components/ui/floating-stack";
import { cn } from "@/lib/utils";
import { FAB_LEFT_STACK, FAB_RIGHT_STACK } from "@/lib/floating-tokens";
import { useFullBleedStageOccludesFloating } from "@/hooks/ui/use-full-bleed-stage-occludes-floating";
import { useTranslation } from "react-i18next";
import { useAiChatContext } from "../AiChatContext";
import { useAiChatDisplayLanguage } from "../hooks/use-ai-chat-display-language";

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
    <span className="inline-flex items-center gap-[3px] shrink-0" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-[6px] w-[6px] rounded-full bg-primary/80"
          style={{ animation: `fabDotPulse 0.8s ease-in-out ${i * 0.16}s infinite` }}
        />
      ))}
    </span>
  );
}

/** Opens the FairPay Assistant dialog. Expects AiChatProvider above. */
export const ChatFAB = memo(function ChatFAB() {
  const { tap } = useHaptics();
  const isMdUp = useMediaQuery("(min-width: 768px)");
  const fabSide = isMdUp ? "left" : "right";
  const stackIndex = useMemo(
    () => (isMdUp ? FAB_LEFT_STACK.chat : FAB_RIGHT_STACK.primary),
    [isMdUp],
  );
  const { isChatOpen, openChat } = useAiChatContext();
  const displayLanguage = useAiChatDisplayLanguage();
  const { t } = useTranslation(undefined, { lng: displayLanguage });
  const fabState = useFabState();
  const pondOccludesFab = useFullBleedStageOccludesFloating({
    side: fabSide,
    stackIndex,
  });

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
        side={fabSide}
        stackIndex={stackIndex}
        hidden={pondOccludesFab}
        trigger={
          <FloatingPill
            variant="glass"
            size="default"
            onClick={handleOpen}
            ariaLabel={t("aiChat.openAssistant")}
            className={cn(
              "aspect-square !min-w-[48px] !px-0 overflow-hidden ring-1 ring-border/60",
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
