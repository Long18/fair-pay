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
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortenPath(path: string, max = 36): string {
  if (path.length <= max) return path;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${path.slice(0, head)}…${path.slice(-tail)}`;
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
      <div className={cn("inline-flex items-center gap-2 py-1 text-xs text-muted-foreground", className)}>
        <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
        {tAdmin("journey.loadingEvents")}
      </div>
    );
  }

  if (!event) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        {tAdmin("journey.noEventsTitle")}
      </p>
    );
  }

  return (
    <article
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-2 rounded-md border border-primary/25 bg-primary/5 px-2.5 py-1.5",
        className,
      )}
      data-slot="journey-active-event"
      title={event.page_path}
    >
      <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
        {event.event_name}
      </Badge>
      <span className="max-w-[14rem] truncate text-xs font-medium sm:max-w-[18rem]">
        {shortenPath(event.page_path)}
      </span>
      <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
        <ClockIcon className="h-3 w-3" />
        {formatDateTime(event.occurred_at, locale)}
      </span>
      {onViewRaw ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 shrink-0 px-1.5 text-[11px]"
          onClick={() => onViewRaw(event)}
        >
          <FileTextIcon className="h-3 w-3" />
          <span className="sr-only">{tAdmin("journey.rawMetadata")}</span>
        </Button>
      ) : null}
    </article>
  );
}
