import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTrackingNotice } from "@/hooks/use-tracking-consent";
import { useTranslation } from "react-i18next";

export function TrackingNoticeBanner() {
  const { dismissed, dismiss } = useTrackingNotice();
  const { t } = useTranslation();

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "animate-in slide-in-from-bottom duration-300",
        "bg-background/95 backdrop-blur-sm border-t border-border",
        "px-4 py-3 sm:px-6"
      )}
    >
      <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="flex-1 text-xs text-muted-foreground leading-relaxed">
          {t("tracking.notice")}
        </p>
        <Button size="sm" onClick={dismiss}>
          {t("tracking.ok")}
        </Button>
      </div>
    </div>
  );
}
