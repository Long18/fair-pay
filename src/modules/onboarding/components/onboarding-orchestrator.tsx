import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

import type { TutorialStep } from "../types";
import { OnboardingStepContent } from "./onboarding-step-content";
import { SpotlightOverlay } from "./spotlight-overlay";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OnboardingOrchestratorProps {
  /** Current tutorial step configuration */
  stepConfig: TutorialStep;
  /** Zero-based index of the current step */
  currentStep: number;
  /** Total number of eligible steps */
  totalSteps: number;
  /** Progress as 0-1 fraction */
  progress: number;
  /** Advance to the next step */
  onNext: () => void;
  /** Go back to the previous step */
  onBack: () => void;
  /** Skip/dismiss the entire tutorial */
  onSkip: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum interval between navigation actions (ms) */
const NAV_DEBOUNCE_MS = 150;

/** Framer Motion transition for step content */
const STEP_TRANSITION = { duration: 0.25, ease: "easeInOut" as const };

/** Instant transition for reduced motion */
const INSTANT_TRANSITION = { duration: 0 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Checks whether a target selector resolves to a visible DOM element.
 * Returns `true` if the element exists, `false` otherwise.
 * Logs a dev warning when the selector is non-null but the element is missing.
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

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Orchestrates the onboarding tutorial presentation.
 *
 * - Detects mobile vs desktop via `useIsMobile()` and renders the appropriate
 *   container (BottomSheet on mobile / Dialog on desktop via the BottomSheet
 *   component which handles this internally).
 * - Renders `SpotlightOverlay` as a sibling when the current step has a
 *   non-null `targetSelector` that resolves to a DOM element.
 * - Falls back to center-screen mode (no spotlight) when `targetSelector` is
 *   null or the element is not found.
 * - Wraps step content in `AnimatePresence` with `mode="wait"` for smooth
 *   step transitions.
 * - Debounces rapid navigation actions (150ms) to prevent overlapping
 *   transitions.
 * - Disables animations when `prefers-reduced-motion: reduce` is active.
 * - Handles viewport breakpoint crossing without losing the current step
 *   (the BottomSheet component handles responsive switching internally,
 *   and the step state is managed by the parent provider).
 */
export function OnboardingOrchestrator({
  stepConfig,
  currentStep,
  totalSteps,
  progress: _progress,
  onNext,
  onBack,
  onSkip,
}: OnboardingOrchestratorProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();

  // Track whether the target element exists for spotlight rendering
  const [showSpotlight, setShowSpotlight] = useState(false);

  // Debounce ref: timestamp of the last accepted navigation action
  const lastNavRef = useRef<number>(0);

  // Re-check target existence whenever the step changes
  useEffect(() => {
    setShowSpotlight(targetExists(stepConfig.targetSelector));
  }, [stepConfig.targetSelector, stepConfig.id]);

  // ── Debounced navigation handlers ──────────────────────────────────────

  const debouncedNav = useCallback(
    (action: () => void) => {
      const now = Date.now();
      if (now - lastNavRef.current < NAV_DEBOUNCE_MS) return;
      lastNavRef.current = now;
      action();
    },
    [],
  );

  const handleNext = useCallback(() => debouncedNav(onNext), [debouncedNav, onNext]);
  const handleBack = useCallback(() => debouncedNav(onBack), [debouncedNav, onBack]);
  const handleSkip = useCallback(() => debouncedNav(onSkip), [debouncedNav, onSkip]);

  // ── Animation config ───────────────────────────────────────────────────

  const transition = reducedMotion ? INSTANT_TRANSITION : STEP_TRANSITION;

  const motionVariants = {
    initial: reducedMotion
      ? { opacity: 1 }
      : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: reducedMotion
      ? { opacity: 1 }
      : { opacity: 0, y: -12 },
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const stepContent = (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepConfig.id}
        variants={motionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
      >
        <OnboardingStepContent
          step={stepConfig}
          currentIndex={currentStep}
          totalSteps={totalSteps}
          onNext={handleNext}
          onBack={handleBack}
          onSkip={handleSkip}
        />
      </motion.div>
    </AnimatePresence>
  );

  return (
    <>
      {/* Spotlight overlay — rendered outside the BottomSheet/Dialog as a
          sibling so it covers the full screen */}
      {showSpotlight && (
        <SpotlightOverlay
          targetSelector={stepConfig.targetSelector}
          isVisible
          padding={stepConfig.spotlightPadding}
          shape={stepConfig.spotlightShape}
          announcement={t(stepConfig.titleKey)}
        />
      )}

      {/* Responsive container: BottomSheet renders Drawer on mobile,
          Dialog on desktop. The component handles the responsive switch
          internally, so viewport breakpoint crossing preserves the
          current step without any extra logic. */}
      <BottomSheet
        open
        onOpenChange={(open) => {
          // Dismiss via backdrop click or swipe-down = skip
          if (!open) handleSkip();
        }}
        title={t(stepConfig.titleKey)}
        description={t(stepConfig.descriptionKey)}
        className={showSpotlight ? "z-[60]" : undefined}
      >
        {stepContent}
      </BottomSheet>
    </>
  );
}
