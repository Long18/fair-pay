/**
 * LoadingStatusBubble — shows agent loading/download status inline in the
 * chat thread, styled like a normal assistant message.
 *
 * Animates the status label character-by-character (type-in → hold → erase),
 * cycling through loading stages until the agent is ready. Respects
 * prefers-reduced-motion by falling back to a static label with a simple fade.
 *
 * Accessibility: the bubble is an aria-live="polite" region so screen readers
 * announce status changes without spamming on every character.
 */
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FairPayIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useTypewriterStatus } from "../hooks/use-typewriter-status";
import type { LocalLlmStatus } from "@/lib/local-llm/types";

interface LoadingStatusBubbleProps {
  localLlmStatus: LocalLlmStatus;
}

export const LoadingStatusBubble = memo(function LoadingStatusBubble({
  localLlmStatus,
}: LoadingStatusBubbleProps) {
  const { t } = useTranslation();

  const label = useMemo(() => {
    switch (localLlmStatus.state) {
      case "loading": {
        const pct = Math.round(localLlmStatus.progress * 100);
        return localLlmStatus.fromCache
          ? t("aiChat.status.loadingFromDevice", { pct })
          : t("aiChat.status.loading", { pct });
      }
      case "error":
        return t("aiChat.status.loadFailed");
      default:
        return t("aiChat.status.preparing");
    }
  }, [localLlmStatus, t]);

  const isActive =
    localLlmStatus.state === "loading" || localLlmStatus.state === "idle";

  const { displayText, isAnimating } = useTypewriterStatus(label, isActive);

  const isError = localLlmStatus.state === "error";

  return (
    <div className="flex gap-3">
      {/* Avatar — same as ChatMessage assistant avatar */}
      <div className="relative shrink-0">
        <Avatar className="h-8 w-8 border bg-background">
          <AvatarFallback className="bg-background p-1 text-primary">
            <FairPayIcon size={22} className="rounded-sm" />
          </AvatarFallback>
        </Avatar>
        {/* Status dot */}
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background",
            isError
              ? "bg-destructive"
              : "bg-amber-500 animate-pulse",
          )}
        />
      </div>

      {/* Bubble */}
      <div
        // aria-live="polite" — announces full text changes, not individual chars.
        // aria-atomic="true" — reader reads the whole updated string at once.
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          "relative flex min-h-[36px] min-w-[48px] items-center rounded-2xl rounded-tl-sm border px-4 py-2 text-sm shadow-sm",
          isError
            ? "border-destructive/20 bg-destructive/10 text-destructive"
            : "bg-card text-card-foreground",
          // Fade in the bubble itself
          "animate-in fade-in duration-200",
        )}
      >
        {/* Visible text — screen readers get the full label via aria-live,
            so hiding the cursor character from them is intentional */}
        <span aria-hidden="true">
          {displayText}
          {/* Blinking cursor shown only while typing/holding */}
          {isAnimating && (
            <span className="ml-0.5 inline-block h-[1em] w-px animate-[blink_1s_step-end_infinite] bg-current align-middle" />
          )}
        </span>

        {/* Screen-reader-only full label — not affected by animation */}
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
});

export default LoadingStatusBubble;
