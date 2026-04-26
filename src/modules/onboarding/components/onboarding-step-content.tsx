import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useHaptics } from "@/hooks/use-haptics";
import { themeIntentTones } from "@/lib/theme-intents";
import { cn } from "@/lib/utils";

import type { TutorialStep } from "../types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OnboardingStepContentProps {
  /** Current tutorial step configuration */
  step: TutorialStep;
  /** Zero-based index of the current step */
  currentIndex: number;
  /** Total number of eligible steps */
  totalSteps: number;
  /** Advance to the next step (or complete on last step) */
  onNext: () => void;
  /** Go back to the previous step */
  onBack: () => void;
  /** Skip/dismiss the entire tutorial */
  onSkip: () => void;
  /** Enter try-it interaction mode (shown when step has action) */
  onTryIt?: () => void;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Progress dots showing current position within the tutorial */
function ProgressDots({
  currentIndex,
  totalSteps,
  intentText,
}: {
  currentIndex: number;
  totalSteps: number;
  intentText: string;
}) {
  return (
    <div
      className="flex items-center justify-center gap-1.5"
      role="progressbar"
      aria-valuenow={currentIndex + 1}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Step ${currentIndex + 1} of ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-2 rounded-full transition-colors duration-200",
            i <= currentIndex
              ? cn("bg-current", intentText)
              : "bg-muted-foreground/30",
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Renders the content for a single onboarding tutorial step.
 *
 * Displays the step icon, i18n-translated title and description,
 * a progress indicator (dots), and navigation buttons (Next, Back, Skip).
 *
 * - All text is rendered via `useTranslation()` for i18n support
 * - Theme-aware styling uses semantic tokens from `theme-intents.ts`
 * - All interactive elements have ARIA labels and 44×44px minimum touch targets
 * - Haptic feedback is triggered on button taps
 */
export function OnboardingStepContent({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onBack,
  onSkip,
  onTryIt,
}: OnboardingStepContentProps) {
  const { t } = useTranslation();
  const { tap } = useHaptics();

  const tone = themeIntentTones[step.intent];
  const Icon = step.icon;

  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;
  const hasAction = !!step.action && !!onTryIt;

  const handleNext = () => {
    tap();
    onNext();
  };

  const handleBack = () => {
    tap();
    onBack();
  };

  const handleSkip = () => {
    tap();
    onSkip();
  };

  const handleTryIt = () => {
    tap();
    onTryIt?.();
  };

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      {/* Step icon */}
      <div
        className={cn(
          "flex size-14 items-center justify-center rounded-full",
          tone.surface,
        )}
      >
        <Icon className={cn("size-7", tone.icon)} aria-hidden="true" />
      </div>

      {/* Title and description */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className={cn("text-lg font-semibold", tone.text)}>
          {t(step.titleKey)}
        </h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          {t(step.descriptionKey)}
        </p>
      </div>

      {/* Progress dots */}
      <ProgressDots
        currentIndex={currentIndex}
        totalSteps={totalSteps}
        intentText={tone.text}
      />

      {/* Try It button — shown when step has an interactive action */}
      {hasAction && (
        <Button
          className={cn("min-h-[44px] w-full", tone.surface, tone.text)}
          variant="outline"
          onClick={handleTryIt}
          aria-label={t("onboarding.actions.tryIt", "Try it")}
        >
          {t("onboarding.actions.tryIt", "Try it")}
        </Button>
      )}

      {/* Navigation buttons */}
      <div className="flex w-full items-center justify-between gap-2 pt-2">
        {/* Back button — hidden on first step, invisible placeholder to keep layout */}
        {isFirstStep ? (
          <div className="min-h-[44px] min-w-[44px]" aria-hidden="true" />
        ) : (
          <Button
            variant="ghost"
            className="min-h-[44px] min-w-[44px]"
            onClick={handleBack}
            aria-label={t("onboarding.actions.back", "Back")}
          >
            {t("onboarding.actions.back", "Back")}
          </Button>
        )}

        {/* Center: Skip button — visible on all steps except the last */}
        {!isLastStep ? (
          <Button
            variant="ghost"
            className="min-h-[44px] min-w-[44px] text-muted-foreground"
            onClick={handleSkip}
            aria-label={t("onboarding.actions.skip", "Skip")}
          >
            {t("onboarding.actions.skip", "Skip")}
          </Button>
        ) : (
          <div className="min-h-[44px] min-w-[44px]" aria-hidden="true" />
        )}

        {/* Next / Done button */}
        <Button
          className={cn("min-h-[44px] min-w-[44px]", tone.surface, tone.text)}
          variant="outline"
          onClick={handleNext}
          aria-label={
            isLastStep
              ? t("onboarding.actions.done", "Done")
              : t("onboarding.actions.next", "Next")
          }
        >
          {isLastStep
            ? t("onboarding.actions.done", "Done")
            : t("onboarding.actions.next", "Next")}
        </Button>
      </div>
    </div>
  );
}
