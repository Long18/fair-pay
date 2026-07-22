import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import type { UserTrackingSessionRow } from "../../types";

interface JourneySessionStripProps {
  sessions: UserTrackingSessionRow[] | undefined;
  total: number;
  selectedSessionId: string;
  loading?: boolean;
  onSelectSession: (sessionId: string) => void;
  className?: string;
}

function formatShortDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function JourneySessionStrip({
  sessions,
  total,
  selectedSessionId,
  loading,
  onSelectSession,
  className,
}: JourneySessionStripProps) {
  const { tAdmin, locale } = useAdminTranslation();

  if (loading && !sessions) {
    return (
      <div className={cn("flex items-center gap-2 px-1 py-2 text-muted-foreground", className)}>
        <Loader2Icon className="h-4 w-4 animate-spin" />
        <span className="text-xs">{tAdmin("journey.loadingSessions")}</span>
      </div>
    );
  }

  return (
    <div
      className={cn("flex gap-2 overflow-x-auto px-1 py-2 scrollbar-none snap-x snap-mandatory", className)}
      data-slot="journey-session-strip"
      role="tablist"
      aria-label={tAdmin("journey.sessionsTitle")}
    >
      <button
        type="button"
        role="tab"
        aria-selected={selectedSessionId === "all"}
        onClick={() => onSelectSession("all")}
        className={cn(
          "shrink-0 snap-start rounded-full border px-3 py-1.5 text-left text-xs transition-colors",
          selectedSessionId === "all"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-foreground hover:bg-accent/40",
        )}
      >
        {tAdmin("journey.allSessions", { count: total })}
      </button>
      {(sessions ?? []).map((session) => (
        <button
          key={session.id}
          type="button"
          role="tab"
          aria-selected={selectedSessionId === session.id}
          onClick={() => onSelectSession(session.id)}
          className={cn(
            "flex max-w-[200px] shrink-0 snap-start items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-colors",
            selectedSessionId === session.id
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-foreground hover:bg-accent/40",
          )}
        >
          <span className="truncate font-medium">{session.landing_path}</span>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {session.event_count}
          </Badge>
          <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">
            {formatShortDate(session.started_at, locale)}
          </span>
        </button>
      ))}
    </div>
  );
}
