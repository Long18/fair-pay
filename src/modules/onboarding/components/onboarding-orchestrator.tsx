import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

import type { TutorialStep } from "../types";
import { useCameraScroll } from "../hooks/use-camera-scroll";
import { SpotlightOverlay } from "./spotlight-overlay";
import { OnboardingTutorialShell } from "./onboarding-tutorial-shell";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OnboardingOrchestratorProps {
  /** Full list of eligible tutorial steps */
  steps: TutorialStep[];
  /** Current tutorial step configuration */
  stepConfig: TutorialStep;
  /** Zero-based index of the current step */
  currentStep: number;
  /** Total number of eligible steps */
  totalSteps: number;
  /** Progress as 0-1 fraction */
  progress: number;
  /** Whether the user is in interactive try-it mode */
  interactionMode: boolean;
  /** Advance to the next step */
  onNext: () => void;
  /** Go back to the previous step */
  onBack: () => void;
  /** Jump to a specific step */
  onGoToStep: (index: number) => void;
  /** Skip/dismiss the entire tutorial */
  onSkip: () => void;
  /** Enter try-it interaction mode */
  onTryIt: () => void;
  /** Exit try-it mode and advance */
  onExitTryIt: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum interval between navigation actions (ms) */
const NAV_DEBOUNCE_MS = 150;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Checks whether a target selector resolves to a visible DOM element.
 */
function targetExists(selector: string | null): boolean {
  if (selector === null) return false;
  const el = document.querySelector(selector);
  if (!el) {
    if (import.meta.env.DEV) {
      console.warn(
        `[OnboardingOrchestrator] Target element not found for selector "${selector}". Falling back to center-screen mode.`,
      );
    }
    return false;
  }
  return true;
}

// ─── Minimal interaction-mode bar ────────────────────────────────────────────

function TryItBar({
  currentStep,
  totalSteps,
  onExitTryIt,
}: {
  currentStep: number;
  totalSteps: number;
  onExitTryIt: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[70] flex min-h-[44px] items-center justify-between border-t bg-card px-4 py-2"
      role="status"
      aria-label={t("onboarding.interactionMode.status", {
        current: currentStep + 1,
        total: totalSteps,
        defaultValue: `Step ${currentStep + 1} of ${totalSteps}`,
      })}
    >
      <span className="text-sm text-muted-foreground">
        {t("onboarding.interactionMode.stepProgress", {
          current: currentStep + 1,
          total: totalSteps,
          defaultValue: `Step ${currentStep + 1} of ${totalSteps}`,
        })}
      </span>
      <Button
        size="sm"
        className="min-h-[44px]"
        onClick={onExitTryIt}
        aria-label={t("onboarding.actions.continue", "Continue")}
      >
        {t("onboarding.actions.continue", "Continue")}
      </Button>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Orchestrates the onboarding tutorial presentation.
 *
 * Desktop: shadcn Dialog + Carousel. Mobile: Drawer + Carousel.
 * Spotlight + try-it bar remain for interactive steps.
 */
export function OnboardingOrchestrator({
  steps,
  stepConfig,
  currentStep,
  totalSteps,
  interactionMode,
  onNext,
  onBack,
  onGoToStep,
  onSkip,
  onTryIt,
  onExitTryIt,
}: OnboardingOrchestratorProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const { scrollToTarget, isScrolling } = useCameraScroll();

  const resolvedSelector =
    isMobile && stepConfig.mobileTargetSelector !== undefined
      ? stepConfig.mobileTargetSelector
      : stepConfig.targetSelector;

  const hasTarget = targetExists(resolvedSelector);

  const [cameraReady, setCameraReady] = useState(false);
  const currentStepIdRef = useRef(stepConfig.id);
  const lastNavRef = useRef<number>(0);

  useEffect(() => {
    if (currentStepIdRef.current !== stepConfig.id) {
      currentStepIdRef.current = stepConfig.id;
      setCameraReady(false);

      scrollToTarget(resolvedSelector).then(() => {
        setCameraReady(true);
      });
    } else if (!cameraReady) {
      scrollToTarget(resolvedSelector).then(() => {
        setCameraReady(true);
      });
    }
  }, [stepConfig.id, resolvedSelector, scrollToTarget, cameraReady]);

  const debouncedNav = useCallback(
    (action: () => void) => {
      if (isScrolling) return;
      const now = Date.now();
      if (now - lastNavRef.current < NAV_DEBOUNCE_MS) return;
      lastNavRef.current = now;
      action();
    },
    [isScrolling],
  );

  const handleNext = useCallback(
    () => debouncedNav(onNext),
    [debouncedNav, onNext],
  );
  const handleBack = useCallback(
    () => debouncedNav(onBack),
    [debouncedNav, onBack],
  );
  const handleSkip = useCallback(
    () => debouncedNav(onSkip),
    [debouncedNav, onSkip],
  );
  const handleGoToStep = useCallback(
    (index: number) => debouncedNav(() => onGoToStep(index)),
    [debouncedNav, onGoToStep],
  );

  if (!cameraReady && !reducedMotion) {
    return null;
  }

  return (
    <>
      {hasTarget && (
        <SpotlightOverlay
          targetSelector={resolvedSelector}
          isVisible={cameraReady && hasTarget}
          padding={stepConfig.spotlightPadding}
          shape={stepConfig.spotlightShape}
          interactionMode={interactionMode}
          announcement={t(stepConfig.titleKey)}
        />
      )}

      {interactionMode ? (
        <TryItBar
          currentStep={currentStep}
          totalSteps={totalSteps}
          onExitTryIt={onExitTryIt}
        />
      ) : (
        <OnboardingTutorialShell
          open
          steps={steps}
          currentIndex={currentStep}
          onGoToStep={handleGoToStep}
          onNext={handleNext}
          onBack={handleBack}
          onSkip={handleSkip}
          onTryIt={hasTarget ? onTryIt : undefined}
        />
      )}
    </>
  );
}
