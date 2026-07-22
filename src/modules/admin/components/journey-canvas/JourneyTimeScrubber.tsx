import { useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";
import type { UserTrackingEventRow } from "../../types";

interface JourneyTimeScrubberProps {
  events: UserTrackingEventRow[] | undefined;
  activeEventId: string | null;
  onSelectIndex: (index: number) => void;
  className?: string;
}

function formatTick(value: string, locale: string) {
  return new Date(value).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function JourneyTimeScrubber({
  events,
  activeEventId,
  onSelectIndex,
  className,
}: JourneyTimeScrubberProps) {
  const { tAdmin, locale } = useAdminTranslation();
  const trackRef = useRef<HTMLDivElement>(null);

  const sortedEvents = useMemo(
    () =>
      [...(events ?? [])].sort(
        (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
      ),
    [events],
  );

  const activeIndex = useMemo(() => {
    if (!activeEventId) return 0;
    const idx = sortedEvents.findIndex((e) => e.id === activeEventId);
    return idx >= 0 ? idx : 0;
  }, [activeEventId, sortedEvents]);

  const handleTrackClick = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || sortedEvents.length === 0) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const index = Math.round(ratio * (sortedEvents.length - 1));
      onSelectIndex(index);
    },
    [onSelectIndex, sortedEvents.length],
  );

  if (sortedEvents.length === 0) {
    return (
      <div className={cn("px-1 py-2 text-xs text-muted-foreground", className)}>
        {tAdmin("journey.noEventsTitle")}
      </div>
    );
  }

  const thumbLeft =
    sortedEvents.length <= 1 ? 0 : (activeIndex / (sortedEvents.length - 1)) * 100;

  return (
    <div className={cn("space-y-1 px-1", className)} data-slot="journey-time-scrubber">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{tAdmin("journey.scrubber.label")}</span>
        <span className="tabular-nums">
          {formatTick(sortedEvents[0].occurred_at, locale)}
          {" — "}
          {formatTick(sortedEvents[sortedEvents.length - 1].occurred_at, locale)}
        </span>
      </div>
      <div
        ref={trackRef}
        role="slider"
        aria-label={tAdmin("journey.scrubber.label")}
        aria-valuemin={1}
        aria-valuemax={sortedEvents.length}
        aria-valuenow={activeIndex + 1}
        tabIndex={0}
        className="relative h-8 cursor-pointer rounded-md bg-muted/50"
        onClick={(e) => handleTrackClick(e.clientX)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") onSelectIndex(Math.max(0, activeIndex - 1));
          if (e.key === "ArrowRight") onSelectIndex(Math.min(sortedEvents.length - 1, activeIndex + 1));
        }}
      >
        <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-border" />
        {sortedEvents.map((event, index) => {
          const left = sortedEvents.length <= 1 ? 50 : (index / (sortedEvents.length - 1)) * 100;
          const isActive = index === activeIndex;
          return (
            <button
              key={event.id}
              type="button"
              className={cn(
                "absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-transform",
                isActive
                  ? "scale-125 border-primary bg-primary"
                  : "border-border bg-card hover:scale-110",
              )}
              style={{ left: `${left}%` }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectIndex(index);
              }}
              aria-label={event.event_name}
            />
          );
        })}
        <div
          className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/30 shadow-sm"
          style={{ left: `${thumbLeft}%` }}
        />
      </div>
    </div>
  );
}
