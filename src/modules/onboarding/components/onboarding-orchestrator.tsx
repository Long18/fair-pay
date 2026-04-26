import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

import type { TutorialStep } from "../types";
import { useSpotlight } from "../hooks/use-spotlight";
import { useCameraScroll } from "../hooks/use-camera-scroll";
import { SpotlightOverlay } from "./spotlight-overlay";
import { FloatingStepPanel } from "./floating-step-panel";

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
  /** Whether the user is in interactive try-it mode */
  interactionMode: boolean;
  /** Advance to the next step */
  onNext: () => void;
  /** Go back to the previous step */
  onBack: () => void;
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

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Orchestrates the onboarding tutorial presentation (v2).
 *
 * Changes from v1:
 * - Replaces BottomSheet/Dialog with FloatingStepPanel (compact, draggable)
 * - Integrates CameraController for smooth scroll-to-target before spotlight
 * - Supports interactionMode for try-it feature
 * - No backdrop-click dismiss — only Skip button dismisses
 * - Unified desktop + mobile experience
 */
export function OnboardingOrchestrator({
  stepConfig,
  currentStep,
  totalSteps,
  progress: _progress,
  interactionMode,
  onNext,
  onBack,
  onSkip,
  onTryIt,
  onExitTryIt,
}: OnboardingOrchestratorProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  // Camera scroll hook
  const { scrollToTarget, isScrolling } = useCameraScroll();

  // Spotlight hook — used to get the rect for FloatingStepPanel positioning
  const hasTarget = targetExists(stepConfig.targetSelector);
  const { spotlightRect } = useSpotlight(
    hasTarget ? stepConfig.targetSelector : null,
    !isScrolling, // only compute spotlight after scroll completes
  );

  // Track whether we've completed the camera scroll for the current step
  const [cameraReady, setCameraReady] = useState(false);
  const currentStepIdRef = useRef(stepConfig.id);

  // Debounce ref
  const lastNavRef = useRef<number>(0);

  // ── Camera scroll on step change ───────────────────────────────────────

  useEffect(() => {
    if (currentStepIdRef.current !== stepConfig.id) {
      currentStepIdRef.current = stepConfig.id;
      setCameraReady(false);

      // Scroll to target, then mark camera as ready
      scrollToTarget(stepConfig.targetSelector).then(() => {
        setCameraReady(true);
      });
    } else if (!cameraReady) {
      // Initial mount — scroll to first step's target
      scrollToTarget(stepConfig.targetSelector).then(() => {
        setCameraReady(true);
      });
    }
  }, [stepConfig.id, stepConfig.targetSelector, scrollToTarget, cameraReady]);

  // ── Debounced navigation ───────────────────────────────────────────────

  const debouncedNav = useCallback(
    (action: () => void) => {
      // Block navigation during scroll animation
      if (isScrolling) return;
      const now = Date.now();
      if (now - lastNavRef.current < NAV_DEBOUNCE_MS) return;
      lastNavRef.current = now;
      action();
    },
    [isScrolling],
  );

  const handleNext = useCallback(() => debouncedNav(onNext), [debouncedNav, onNext]);
  const handleBack = useCallback(() => debouncedNav(onBack), [debouncedNav, onBack]);
  const handleSkip = useCallback(() => debouncedNav(onSkip), [debouncedNav, onSkip]);

  // ── Don't render until camera is ready ─────────────────────────────────

  if (!cameraReady && !reducedMotion) {
    return null;
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      {/* Spotlight overlay */}
      {hasTarget && (
        <SpotlightOverlay
          targetSelector={stepConfig.targetSelector}
          isVisible={cameraReady}
          padding={stepConfig.spotlightPadding}
          shape={stepConfig.spotlightShape}
          interactionMode={interactionMode}
          announcement={t(stepConfig.titleKey)}
        />
      )}

      {/* Floating step panel (replaces BottomSheet/Dialog) */}
      <FloatingStepPanel
        step={stepConfig}
        currentIndex={currentStep}
        totalSteps={totalSteps}
        spotlightRect={hasTarget ? spotlightRect : null}
        interactionMode={interactionMode}
        onNext={handleNext}
        onBack={handleBack}
        onSkip={handleSkip}
        onTryIt={onTryIt}
        onExitTryIt={onExitTryIt}
      />
    </>
  );
}
