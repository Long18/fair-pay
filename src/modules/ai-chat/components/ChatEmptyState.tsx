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
        "flex flex-col items-center justify-center gap-5 px-2 py-8 sm:px-4 sm:py-10 text-center animate-in fade-in-0 duration-500",
        className,
      )}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-xl border border-border/60 bg-card shadow-none sm:h-[4.5rem] sm:w-[4.5rem]"
        aria-hidden
      >
        <FairPayIcon size={28} className="rounded-sm opacity-90" />
      </div>

      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {t(greetingKey, { name })}
        </h1>
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-left shadow-none sm:text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">{t("aiChat.welcome")}</p>
        </div>
        <ul className="max-w-md space-y-1.5 text-left text-xs leading-relaxed text-muted-foreground sm:text-center sm:list-none">
          <li>{t("aiChat.onboarding.firstSend")}</li>
          <li>{t("aiChat.onboarding.webgpu")}</li>
          <li>{t("aiChat.onboarding.privacy")}</li>
        </ul>
      </div>
    </div>
  );
});
