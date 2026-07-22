import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClockIcon, FileTextIcon, Loader2Icon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";
import type { UserTrackingEventRow } from "../../types";

interface JourneyActiveEventCardProps {
  event: UserTrackingEventRow | null;
  loading?: boolean;
  onViewRaw?: (event: UserTrackingEventRow) => void;
  className?: string;
}

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function JourneyActiveEventCard({
  event,
  loading,
  onViewRaw,
  className,
}: JourneyActiveEventCardProps) {
  const { tAdmin, locale } = useAdminTranslation();

  if (loading && !event) {
    return (
      <div className={cn("flex items-center gap-2 py-2 text-xs text-muted-foreground", className)}>
        <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
        {tAdmin("journey.loadingEvents")}
      </div>
    );
  }

  if (!event) {
    return (
      <p className={cn("py-2 text-xs text-muted-foreground", className)}>
        {tAdmin("journey.noEventsTitle")}
      </p>
    );
  }

  return (
    <article
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-primary/25 bg-primary/5 px-3 py-2",
        className,
      )}
      data-slot="journey-active-event"
    >
      <Badge variant="secondary" className="font-mono text-[10px]">
        {event.event_name}
      </Badge>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{event.page_path}</span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <ClockIcon className="h-3 w-3" />
        {formatDateTime(event.occurred_at, locale)}
      </span>
      {onViewRaw ? (
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => onViewRaw(event)}>
          <FileTextIcon className="mr-1 h-3.5 w-3.5" />
          {tAdmin("journey.rawMetadata")}
        </Button>
      ) : null}
    </article>
  );
}
