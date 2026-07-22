import { useCallback, useEffect, useMemo } from "react";
import { JourneyCanvasView } from "./JourneyCanvasView";
import { JourneyTimeScrubber } from "./JourneyTimeScrubber";
import { JourneyActiveEventCard } from "./JourneyActiveEventCard";
import { JourneyPlaybackControls } from "./JourneyPlaybackControls";
import { useJourneyPath } from "./use-journey-path";
import { useJourneyPlayback } from "./use-journey-playback";
import type {
  UserTrackingEventRow,
} from "../../types";

interface JourneyWorkspaceProps {
  userId: string | undefined;
  sessionId: string;
  fromIso: string | null;
  toIso: string | null;
  eventNames: string[] | null;
  sourceName?: string | null;
  entryLink?: string | null;
  events: UserTrackingEventRow[] | undefined;
  eventsLoading?: boolean;
  onViewRaw: (event: UserTrackingEventRow) => void;
}

export function JourneyWorkspace({
  userId,
  sessionId,
  fromIso,
  toIso,
  eventNames,
  sourceName,
  entryLink,
  events,
  eventsLoading,
  onViewRaw,
}: JourneyWorkspaceProps) {
  const pathSteps = useJourneyPath(events);
  const {
    activeStepIndex,
    isPlaying,
    stepCount,
    setStepCount,
    goToStep,
    togglePlay,
    stepPrev,
    stepNext,
    reset,
  } = useJourneyPlayback();

  const sortedEvents = useMemo(
    () =>
      [...(events ?? [])].sort(
        (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
      ),
    [events],
  );

  const activeEvent =
    sortedEvents.find((event) => event.id === pathSteps[activeStepIndex]?.eventId) ??
    sortedEvents[0] ??
    null;
  const activeEventId = activeEvent?.id ?? null;

  useEffect(() => {
    setStepCount(pathSteps.length);
  }, [pathSteps.length, setStepCount]);

  const eventFilterKey = eventNames?.join(",") ?? "all";
  useEffect(() => {
    reset();
  }, [sessionId, fromIso, toIso, eventFilterKey, reset]);

  const handleScrubberIndex = useCallback(
    (eventIndex: number) => {
      const event = sortedEvents[eventIndex];
      if (!event) return;
      const pathIndex = pathSteps.findIndex((s) => s.eventId === event.id);
      if (pathIndex >= 0) {
        goToStep(pathIndex);
        return;
      }
      const pageIndex = pathSteps.findIndex((s) => s.pagePath === event.page_path);
      if (pageIndex >= 0) goToStep(pageIndex);
    },
    [sortedEvents, pathSteps, goToStep],
  );

  return (
    <div className="grid min-h-[calc(100vh-9rem)] grid-rows-[minmax(380px,1fr)_auto] overflow-hidden rounded-lg border border-border bg-background">
      <JourneyCanvasView
        userId={userId}
        sessionId={sessionId}
        fromIso={fromIso}
        toIso={toIso}
        eventNames={eventNames}
        sourceName={sourceName}
        entryLink={entryLink}
        pathSteps={pathSteps}
        activeStepIndex={activeStepIndex}
        className="h-full"
      />

      <div
        className="shrink-0 space-y-2 border-t border-border bg-card/40 px-3 py-2"
        data-slot="journey-bottom-dock"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <JourneyPlaybackControls
            activeStepIndex={activeStepIndex}
            stepCount={stepCount}
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            onPrev={stepPrev}
            onNext={stepNext}
          />
          <JourneyTimeScrubber
            events={events}
            activeEventId={activeEventId}
            onSelectIndex={handleScrubberIndex}
            className="w-full sm:max-w-md"
          />
        </div>
        <div className="flex justify-start">
          <JourneyActiveEventCard
            event={activeEvent}
            loading={eventsLoading}
            onViewRaw={onViewRaw}
          />
        </div>
      </div>
    </div>
  );
}
