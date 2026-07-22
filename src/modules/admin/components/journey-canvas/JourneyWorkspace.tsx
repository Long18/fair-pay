import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CarouselApi } from "@/components/ui/carousel";
import { JourneyCanvasView } from "./JourneyCanvasView";
import { JourneySessionStrip } from "./JourneySessionStrip";
import { JourneyTimeScrubber } from "./JourneyTimeScrubber";
import { JourneyEventCarousel } from "./JourneyEventCarousel";
import { JourneyPlaybackControls } from "./JourneyPlaybackControls";
import { useJourneyPath } from "./use-journey-path";
import { useJourneyPlayback } from "./use-journey-playback";
import type {
  UserTrackingEventRow,
  UserTrackingSessionRow,
} from "../../types";

interface JourneyWorkspaceProps {
  userId: string | undefined;
  sessionId: string;
  fromIso: string | null;
  toIso: string | null;
  eventNames: string[] | null;
  sourceName?: string | null;
  entryLink?: string | null;
  sessions: UserTrackingSessionRow[] | undefined;
  sessionsTotal: number;
  sessionsLoading?: boolean;
  events: UserTrackingEventRow[] | undefined;
  eventsLoading?: boolean;
  selectedSessionId: string;
  onSelectSession: (sessionId: string) => void;
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
  sessions,
  sessionsTotal,
  sessionsLoading,
  events,
  eventsLoading,
  selectedSessionId,
  onSelectSession,
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
  const carouselApiRef = useRef<CarouselApi | undefined>(undefined);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | undefined>();

  const sortedEvents = useMemo(
    () =>
      [...(events ?? [])].sort(
        (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
      ),
    [events],
  );

  const activeEventId = pathSteps[activeStepIndex]?.eventId ?? sortedEvents[0]?.id ?? null;

  useEffect(() => {
    setStepCount(pathSteps.length);
  }, [pathSteps.length, setStepCount]);

  const eventFilterKey = eventNames?.join(",") ?? "all";
  useEffect(() => {
    reset();
  }, [sessionId, fromIso, toIso, eventFilterKey, reset]);

  const syncCarouselToStep = useCallback(
    (stepIndex: number) => {
      const eventId = pathSteps[stepIndex]?.eventId;
      if (!eventId || !carouselApi) return;
      const eventIndex = sortedEvents.findIndex((e) => e.id === eventId);
      if (eventIndex >= 0) carouselApi.scrollTo(eventIndex);
    },
    [carouselApi, pathSteps, sortedEvents],
  );

  useEffect(() => {
    syncCarouselToStep(activeStepIndex);
  }, [activeStepIndex, syncCarouselToStep]);

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

  const handleCarouselActive = useCallback(
    (eventId: string) => {
      const pathIndex = pathSteps.findIndex((s) => s.eventId === eventId);
      if (pathIndex >= 0) goToStep(pathIndex);
    },
    [pathSteps, goToStep],
  );

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <JourneySessionStrip
        sessions={sessions}
        total={sessionsTotal}
        selectedSessionId={selectedSessionId}
        loading={sessionsLoading}
        onSelectSession={onSelectSession}
        className="border-b border-border px-2"
      />

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
        className="min-h-[320px]"
      />

      <div
        className="shrink-0 space-y-2 border-t border-border bg-card/50 px-3 py-2 sm:py-3"
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
            className="flex-1"
          />
        </div>
        <JourneyEventCarousel
          events={events}
          loading={eventsLoading}
          activeEventId={activeEventId}
          onActiveEventChange={handleCarouselActive}
          onViewRaw={onViewRaw}
          carouselApiRef={(api) => {
            carouselApiRef.current = api;
            setCarouselApi(api);
          }}
        />
      </div>
    </div>
  );
}
