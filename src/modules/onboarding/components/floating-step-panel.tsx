import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

import type { SpotlightRect, TutorialStep } from "../types";
import { OnboardingStepContent } from "./onboarding-step-content";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FloatingStepPanelProps {
  /** Current tutorial step configuration */
  step: TutorialStep;
  /** Zero-based index of the current step */
  currentIndex: number;
  /** Total number of eligible steps */
  totalSteps: number;
  /** Spotlight cutout rectangle, or null when no target */
  spotlightRect: SpotlightRect | null;
  /** Whether the user is in interactive try-it mode */
  interactionMode: boolean;
  /** Advance to the next step */
  onNext: () => void;
  /** Go back to the previous step */
  onBack: () => void;
  /** Skip/dismiss the entire tutorial */
  onSkip: () => void;
  /** Enter try-it interaction mode */
  onTryIt?: () => void;
  /** Exit try-it mode and advance */
  onExitTryIt?: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Panel width (px) */
const PANEL_WIDTH = 320;

/** Estimated panel height for position calculations (px) */
const PANEL_HEIGHT = 280;

/** Minimum margin from viewport edges (px) */
const VIEWPORT_MARGIN = 12;

/** Gap between spotlight and panel (px) */
const SPOTLIGHT_GAP = 16;

/** Minimal bar height (px) */
const MINIMAL_BAR_HEIGHT = 44;

// ─── Position Calculation ────────────────────────────────────────────────────

interface PanelPosition {
  x: number;
  y: number;
}

/**
 * Computes the floating panel position relative to the spotlight cutout.
 *
 * Algorithm:
 * 1. If spotlightRect is null → center in viewport
 * 2. If spotlight is in top half → position panel below spotlight
 * 3. If spotlight is in bottom half → position panel above spotlight
 * 4. Clamp X and Y to keep panel within viewport bounds (12px margin)
 */
function calculatePanelPosition(
  spotlightRect: SpotlightRect | null,
  panelWidth: number,
  panelHeight: number,
): PanelPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // No spotlight → center in viewport
  if (!spotlightRect) {
    return {
      x: Math.max(VIEWPORT_MARGIN, (vw - panelWidth) / 2),
      y: Math.max(VIEWPORT_MARGIN, (vh - panelHeight) / 2),
    };
  }

  // Convert spotlight from page coordinates to viewport coordinates
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const viewportX = spotlightRect.x - scrollX;
  const viewportY = spotlightRect.y - scrollY;

  // Determine vertical placement: below if spotlight is in top half, above otherwise
  const spotlightCenterY = viewportY + spotlightRect.height / 2;
  const isInTopHalf = spotlightCenterY < vh / 2;

  let y: number;
  if (isInTopHalf) {
    // Position below the spotlight
    y = viewportY + spotlightRect.height + SPOTLIGHT_GAP;
  } else {
    // Position above the spotlight
    y = viewportY - panelHeight - SPOTLIGHT_GAP;
  }

  // Center X relative to spotlight, then clamp
  const spotlightCenterX = viewportX + spotlightRect.width / 2;
  let x = spotlightCenterX - panelWidth / 2;

  // Clamp to viewport bounds
  x = Math.max(VIEWPORT_MARGIN, Math.min(x, vw - panelWidth - VIEWPORT_MARGIN));
  y = Math.max(VIEWPORT_MARGIN, Math.min(y, vh - panelHeight - VIEWPORT_MARGIN));

  return { x, y };
}

// ─── Minimal Bar (Interaction Mode) ──────────────────────────────────────────

function MinimalBar({
  currentIndex,
  totalSteps,
  onExitTryIt,
  reducedMotion,
}: {
  currentIndex: number;
  totalSteps: number;
  onExitTryIt?: () => void;
  reducedMotion: boolean;
}) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
      className="fixed bottom-0 left-0 right-0 z-[70] flex min-h-[44px] items-center justify-between border-t bg-card px-4 py-2"
      role="status"
      aria-label={t(
        "onboarding.interactionMode.status",
        `Step ${currentIndex + 1} of ${totalSteps}`,
      )}
    >
      <span className="text-sm text-muted-foreground">
        {t("onboarding.interactionMode.stepProgress", {
          defaultValue: `Step ${currentIndex + 1} of ${totalSteps}`,
          current: currentIndex + 1,
          total: totalSteps,
        })}
      </span>
      <Button
        size="sm"
        variant="default"
        className="min-h-[44px] min-w-[44px]"
        onClick={onExitTryIt}
        aria-label={t("onboarding.actions.continue", "Continue")}
      >
        {t("onboarding.actions.continue", "Continue")}
      </Button>
    </motion.div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Compact floating instruction panel that auto-positions near the spotlight
 * target. Replaces the previous BottomSheet/Dialog approach for a unified
 * desktop + mobile experience.
 *
 * Features:
 * - Auto-positions below spotlight (top half) or above (bottom half)
 * - Clamps to viewport bounds with 12px margin
 * - Drag-to-reposition on desktop via Framer Motion `drag` prop
 * - Centers in viewport when no spotlight target
 * - Collapses to minimal "Continue" bar in interaction mode
 * - Subtle entrance animation (fade + slide)
 *
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 18.3, 21.4, 21.5
 */
export function FloatingStepPanel({
  step,
  currentIndex,
  totalSteps,
  spotlightRect,
  interactionMode,
  onNext,
  onBack,
  onSkip,
  onTryIt: _onTryIt,
  onExitTryIt,
}: FloatingStepPanelProps) {
  const reducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PanelPosition>({ x: 0, y: 0 });
  const [measuredHeight, setMeasuredHeight] = useState(PANEL_HEIGHT);

  // ── Measure actual panel height ────────────────────────────────────────

  useEffect(() => {
    if (panelRef.current) {
      const height = panelRef.current.getBoundingClientRect().height;
      if (height > 0) {
        setMeasuredHeight(height);
      }
    }
  });

  // ── Recalculate position when spotlight or panel height changes ────────

  const recalculatePosition = useCallback(() => {
    const pos = calculatePanelPosition(spotlightRect, PANEL_WIDTH, measuredHeight);
    setPosition(pos);
  }, [spotlightRect, measuredHeight]);

  useEffect(() => {
    recalculatePosition();
  }, [recalculatePosition]);

  // Also recalculate on window resize
  useEffect(() => {
    const handleResize = () => recalculatePosition();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [recalculatePosition]);

  // ── Drag constraints (keep panel within viewport) ──────────────────────

  const dragConstraints = {
    top: VIEWPORT_MARGIN,
    left: VIEWPORT_MARGIN,
    right: window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN,
    bottom: window.innerHeight - measuredHeight - VIEWPORT_MARGIN,
  };

  // ── Animation config ───────────────────────────────────────────────────

  const panelTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.25, ease: "easeOut" as const };

  const panelVariants = {
    initial: reducedMotion
      ? { opacity: 1 }
      : { opacity: 0, y: 12, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reducedMotion
      ? { opacity: 1 }
      : { opacity: 0, y: -8, scale: 0.97 },
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <AnimatePresence mode="wait">
      {interactionMode ? (
        <MinimalBar
          key="minimal-bar"
          currentIndex={currentIndex}
          totalSteps={totalSteps}
          onExitTryIt={onExitTryIt}
          reducedMotion={reducedMotion}
        />
      ) : (
        <motion.div
          key={`panel-${step.id}`}
          ref={panelRef}
          role="dialog"
          aria-label="Tutorial step"
          variants={panelVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={panelTransition}
          drag
          dragConstraints={dragConstraints}
          dragElastic={0.1}
          dragMomentum={false}
          style={{
            position: "fixed",
            top: position.y,
            left: position.x,
            width: PANEL_WIDTH,
            maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
            zIndex: 70,
          }}
          className="bg-card border shadow-lg rounded-xl overflow-hidden cursor-grab active:cursor-grabbing"
        >
          <OnboardingStepContent
            step={step}
            currentIndex={currentIndex}
            totalSteps={totalSteps}
            onNext={onNext}
            onBack={onBack}
            onSkip={onSkip}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
