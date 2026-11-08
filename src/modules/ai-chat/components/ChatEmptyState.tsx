import { memo } from "react";
import { useTranslation } from "react-i18next";
import { FairPayIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface ChatEmptyStateProps {
  firstName?: string;
  className?: string;
}

export const ChatEmptyState = memo(function ChatEmptyState({
  firstName,
  className,
}: ChatEmptyStateProps) {
  const { t } = useTranslation();
  const hour = new Date().getHours();
  const greetingKey =
    hour < 12
      ? "aiChat.greeting.morning"
      : hour < 18
        ? "aiChat.greeting.afternoon"
        : "aiChat.greeting.evening";
  const name = firstName?.trim() || t("aiChat.greeting.fallbackName");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-2 py-6 sm:px-4 sm:py-8 text-center animate-in fade-in-0 duration-500",
        className,
      )}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-xl border border-border/60 bg-card shadow-none sm:h-[4.5rem] sm:w-[4.5rem]"
        aria-hidden
      >
        <FairPayIcon size={28} className="rounded-sm opacity-90" />
      </div>

      <div className="max-w-sm space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {t(greetingKey, { name })}
        </h1>
        <p className="text-sm leading-snug text-muted-foreground">{t("aiChat.welcome")}</p>
        <p className="text-xs text-muted-foreground/80">{t("aiChat.empty.hint")}</p>
      </div>
    </div>
  );
});
