import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ClockIcon, FileTextIcon, Loader2Icon, ActivityIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";
import type { UserTrackingEventRow } from "../../types";

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRelativeOffset(ms: number) {
  if (ms < 1000) return "0s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function JourneyEventBadge({ eventName }: { eventName: string }) {
  return (
    <Badge variant="secondary" className="font-mono text-[11px]">
      {eventName}
    </Badge>
  );
}

interface JourneyEventTimelineProps {
  events: UserTrackingEventRow[] | undefined;
  total?: number;
  loading?: boolean;
  selectedEventId?: string | null;
  onSelectEvent?: (event: UserTrackingEventRow) => void;
  onViewRaw?: (event: UserTrackingEventRow) => void;
  className?: string;
}

export function JourneyEventTimeline({
  events,
  total,
  loading,
  selectedEventId,
  onSelectEvent,
  onViewRaw,
  className,
}: JourneyEventTimelineProps) {
  const { tAdmin, locale } = useAdminTranslation();

  const sortedEvents = useMemo(
    () => [...(events ?? [])].sort(
      (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
    ),
    [events],
  );

  const sessionStartMs = useMemo(() => {
    if (sortedEvents.length === 0) return null;
    return new Date(sortedEvents[0].occurred_at).getTime();
  }, [sortedEvents]);

  const scrollHeight = "max-h-[calc(100vh-280px)]";

  if (loading && !events) {
    return (
      <div
        className={cn("flex items-center justify-center py-12 text-muted-foreground", className)}
        data-slot="journey-event-timeline"
        aria-busy="true"
      >
        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        {tAdmin("journey.loadingEvents")}
      </div>
    );
  }

  if (!sortedEvents.length) {
    return (
      <Empty className={cn("min-h-[240px]", className)} data-slot="journey-event-timeline">
        <EmptyMedia variant="icon">
          <ActivityIcon className="h-6 w-6" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{tAdmin("journey.noEventsTitle")}</EmptyTitle>
          <EmptyDescription>{tAdmin("journey.noEventsDescription")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent />
      </Empty>
    );
  }

  return (
    <div
      className={cn("space-y-3", className)}
      data-slot="journey-event-timeline"
      role="feed"
      aria-label={tAdmin("journey.eventTimeline")}
    >
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {tAdmin("journey.eventsInScope", { count: total ?? sortedEvents.length })}
      </p>
      <ScrollArea className={cn(scrollHeight, "pr-3")}>
        <ol className="relative space-y-0" role="list">
          {sortedEvents.map((event, index) => {
            const isSelected = selectedEventId === event.id;
            const isLast = index === sortedEvents.length - 1;
            const offsetMs = sessionStartMs
              ? new Date(event.occurred_at).getTime() - sessionStartMs
              : 0;

            return (
              <li
                key={event.id}
                data-slot="journey-timeline-item"
                data-event-id={event.id}
                className="relative flex gap-3 pb-4"
              >
                <div className="flex flex-col items-center" aria-hidden="true">
                  <span
                    className={cn(
                      "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2",
                      isSelected ? "border-primary bg-primary" : "border-border bg-background",
                    )}
                  />
                  {!isLast ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
                </div>

                <article
                  className={cn(
                    "min-w-0 flex-1 rounded-lg border p-3 transition-colors",
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-accent/30",
                    onSelectEvent ? "cursor-pointer" : undefined,
                  )}
                  aria-current={isSelected ? "true" : undefined}
                  onClick={onSelectEvent ? () => onSelectEvent(event) : undefined}
                  onKeyDown={
                    onSelectEvent
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectEvent(event);
                          }
                        }
                      : undefined
                  }
                  role={onSelectEvent ? "button" : undefined}
                  tabIndex={onSelectEvent ? 0 : undefined}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <JourneyEventBadge eventName={event.event_name} />
                    {event.target_key ? <Badge variant="outline">{event.target_key}</Badge> : null}
                    {event.flow_name ? <Badge variant="secondary">{event.flow_name}</Badge> : null}
                  </div>
                  <p className="mt-2 truncate text-sm font-medium">{event.page_path}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" aria-hidden="true" />
                      {formatDateTime(event.occurred_at, locale)}
                    </span>
                    {sessionStartMs !== null && index > 0 ? (
                      <span>
                        {tAdmin("journey.timeline.relativeToStart", {
                          value: formatRelativeOffset(offsetMs),
                        })}
                      </span>
                    ) : null}
                    <span>{tAdmin("journey.sessionShort", { value: event.session_id.slice(0, 8) })}</span>
                  </div>
                  {onViewRaw ? (
                    <div className="mt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewRaw(event);
                        }}
                        aria-label={tAdmin("journey.rawMetadata")}
                      >
                        <FileTextIcon className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                        {tAdmin("journey.rawMetadata")}
                      </Button>
                    </div>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ol>
      </ScrollArea>
    </div>
  );
}

export { JourneyEventBadge };
