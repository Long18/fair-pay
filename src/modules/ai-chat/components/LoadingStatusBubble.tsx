/**
 * Model load / error status in the chat thread — banner with progress bar,
 * not a fake assistant message (no typewriter erase on % updates).
 */
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { Loader2Icon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { LocalLlmStatus } from "@/lib/local-llm/types";

interface LoadingStatusBubbleProps {
  localLlmStatus: LocalLlmStatus;
}

export const LoadingStatusBubble = memo(function LoadingStatusBubble({
  localLlmStatus,
}: LoadingStatusBubbleProps) {
  const { t } = useTranslation();

  const { title, hint, pct, isError } = useMemo(() => {
    if (localLlmStatus.state === "loading") {
      const progress = Math.min(100, Math.max(0, Math.round(localLlmStatus.progress * 100)));
      return {
        title: localLlmStatus.fromCache
          ? t("aiChat.status.loadingFromDevice", { pct: progress })
          : t("aiChat.status.loading", { pct: progress }),
        hint: localLlmStatus.fromCache
          ? t("aiChat.status.loadingHintCached")
          : t("aiChat.status.loadingHintDownload"),
        pct: progress,
        isError: false,
      };
    }
    if (localLlmStatus.state === "error") {
      return {
        title: localLlmStatus.message || t("aiChat.status.loadFailed"),
        hint: t("aiChat.status.loadingHintError"),
        pct: 0,
        isError: true,
      };
    }
    return {
      title: t("aiChat.status.preparing"),
      hint: t("aiChat.status.idleDetail"),
      pct: 0,
      isError: false,
    };
  }, [localLlmStatus, t]);

  const showProgress = localLlmStatus.state === "loading";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "my-2 rounded-xl border p-4 shadow-sm animate-in fade-in duration-200",
        isError
          ? "border-destructive/25 bg-destructive/5"
          : "border-primary/15 bg-primary/[0.04]",
      )}
    >
      <div className="flex gap-3">
        {!isError && (
          <Loader2Icon
            size={20}
            className="mt-0.5 shrink-0 animate-spin text-primary"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              isError ? "text-destructive" : "text-foreground",
            )}
          >
            {title}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
          {showProgress && (
            <>
              <Progress value={pct} className="h-1.5" aria-label={title} />
              <p className="text-right text-[11px] font-medium tabular-nums text-muted-foreground">
                {pct}%
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default LoadingStatusBubble;
