import { memo } from "react";
import { useTranslation } from "react-i18next";
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
    hour < 12 ? "aiChat.greeting.morning" : hour < 18 ? "aiChat.greeting.afternoon" : "aiChat.greeting.evening";
  const name = firstName?.trim() || t("aiChat.greeting.fallbackName");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 px-4 py-10 text-center animate-in fade-in-0 duration-500",
        className,
      )}
    >
      <div
        className="relative h-28 w-28 sm:h-32 sm:w-32"
        aria-hidden
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/35 via-primary/15 to-chart-2/30 blur-2xl" />
        <div className="absolute inset-3 rounded-full bg-gradient-to-tr from-primary/50 via-primary/20 to-transparent opacity-90 animate-[aiOrbPulse_4s_ease-in-out_infinite]" />
        <div className="absolute inset-8 rounded-full bg-gradient-to-b from-background/80 to-primary/10 border border-primary/20 shadow-inner" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          {t(greetingKey, { name })}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("aiChat.welcome")}
        </p>
      </div>

      <style>{`
        @keyframes aiOrbPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.06); opacity: 1; }
        }
      `}</style>
    </div>
  );
});
