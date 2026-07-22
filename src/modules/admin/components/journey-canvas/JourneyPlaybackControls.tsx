import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";

interface JourneyPlaybackControlsProps {
  activeStepIndex: number;
  stepCount: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}

export function JourneyPlaybackControls({
  activeStepIndex,
  stepCount,
  isPlaying,
  onTogglePlay,
  onPrev,
  onNext,
  className,
}: JourneyPlaybackControlsProps) {
  const { tAdmin } = useAdminTranslation();
  const hasSteps = stepCount > 0;
  const atStart = activeStepIndex <= 0;
  const atEnd = stepCount <= 0 || activeStepIndex >= stepCount - 1;

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      data-slot="journey-playback-controls"
      role="group"
      aria-label={tAdmin("journey.playback.label")}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onPrev}
        disabled={!hasSteps || atStart}
        aria-label={tAdmin("journey.playback.prev")}
      >
        <SkipBackIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={onTogglePlay}
        disabled={stepCount <= 1}
        aria-label={isPlaying ? tAdmin("journey.playback.pause") : tAdmin("journey.playback.play")}
        aria-pressed={isPlaying}
      >
        {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onNext}
        disabled={!hasSteps || atEnd}
        aria-label={tAdmin("journey.playback.next")}
      >
        <SkipForwardIcon className="h-4 w-4" />
      </Button>
      <span className="ml-1 text-xs tabular-nums text-muted-foreground" aria-live="polite">
        {hasSteps
          ? tAdmin("journey.playback.stepOf", {
              current: activeStepIndex + 1,
              total: stepCount,
            })
          : "—"}
      </span>
    </div>
  );
}
