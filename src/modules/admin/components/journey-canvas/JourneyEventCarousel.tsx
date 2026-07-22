import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
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

interface JourneyEventCarouselProps {
  events: UserTrackingEventRow[] | undefined;
  loading?: boolean;
  activeEventId: string | null;
  onActiveEventChange: (eventId: string, index: number) => void;
  onViewRaw?: (event: UserTrackingEventRow) => void;
  carouselApiRef?: (api: CarouselApi | undefined) => void;
  className?: string;
}

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function JourneyEventCarousel({
  events,
  loading,
  activeEventId,
  onActiveEventChange,
  onViewRaw,
  carouselApiRef,
  className,
}: JourneyEventCarouselProps) {
  const { tAdmin, locale } = useAdminTranslation();

  const sortedEvents = [...(events ?? [])].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );

  if (loading && !events) {
    return (
      <div className={cn("flex items-center justify-center py-6 text-muted-foreground", className)}>
        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
        {tAdmin("journey.loadingEvents")}
      </div>
    );
  }

  if (!sortedEvents.length) {
    return (
      <Empty className={cn("min-h-[120px] py-4", className)} data-slot="journey-event-carousel">
        <EmptyMedia variant="icon">
          <ActivityIcon className="h-5 w-5" />
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
    <Carousel
      className={cn("relative w-full px-10 sm:px-12", className)}
      opts={{ align: "center", containScroll: "trimSnaps" }}
      setApi={(api) => {
        carouselApiRef?.(api);
        if (!api) return;
        api.on("select", () => {
          const index = api.selectedScrollSnap();
          const event = sortedEvents[index];
          if (event) onActiveEventChange(event.id, index);
        });
      }}
    >
      <CarouselContent className="-ml-2">
        {sortedEvents.map((event, index) => {
          const isActive = activeEventId === event.id;
          return (
            <CarouselItem key={event.id} className="basis-full pl-2 sm:basis-1/2 lg:basis-1/3">
              <article
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  isActive ? "border-primary bg-primary/5" : "border-border bg-card",
                )}
                data-slot="journey-event-card"
                data-event-id={event.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-[11px]">
                    {event.event_name}
                  </Badge>
                  {event.flow_name ? <Badge variant="outline">{event.flow_name}</Badge> : null}
                </div>
                <p className="mt-2 truncate text-sm font-medium">{event.page_path}</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <ClockIcon className="h-3 w-3" />
                  {formatDateTime(event.occurred_at, locale)}
                </div>
                {onViewRaw ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7"
                    onClick={() => onViewRaw(event)}
                  >
                    <FileTextIcon className="mr-1.5 h-3.5 w-3.5" />
                    {tAdmin("journey.rawMetadata")}
                  </Button>
                ) : null}
                <span className="sr-only">
                  {tAdmin("journey.playback.stepOf", { current: index + 1, total: sortedEvents.length })}
                </span>
              </article>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious className="-left-1 h-8 w-8 border-border/80 bg-card/95 shadow-sm" />
      <CarouselNext className="-right-1 h-8 w-8 border-border/80 bg-card/95 shadow-sm" />
    </Carousel>
  );
}
