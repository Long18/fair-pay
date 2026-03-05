import { useCallback } from "react";
import { type HapticInput } from "web-haptics";
import { useWebHaptics } from "web-haptics/react";

const DEFAULT_THEME_TRANSITION_DURATION = 500;
const MIN_HAPTIC_GAP_MS = 40;
const MIN_THEME_DURATION = 240;
const MAX_THEME_DURATION = 1200;

let lastHapticTimestamp = 0;

function shouldEmitHaptic(minIntervalMs: number): boolean {
  const now = Date.now();

  if (now - lastHapticTimestamp < minIntervalMs) {
    return false;
  }

  lastHapticTimestamp = now;
  return true;
}

function createThemeTransitionPattern(durationMs: number): HapticInput {
  const clampedDuration = Math.max(
    MIN_THEME_DURATION,
    Math.min(MAX_THEME_DURATION, durationMs)
  );
  const pulseTotal = 12 + 16 + 24;
  const pause = Math.max(40, Math.floor((clampedDuration - pulseTotal) / 2));

  return {
    pattern: [
      { duration: 12, intensity: 0.35 },
      { delay: pause, duration: 16, intensity: 0.65 },
      { delay: pause, duration: 24, intensity: 1 },
    ],
  };
}

/**
 * Semantic haptic feedback hook for FairPay.
 * Silently no-ops on desktop or unsupported browsers.
 *
 * Usage:
 *   const { tap, success, warning, error } = useHaptics();
 *   tap()     → light medium tap (navigation, row clicks, toggles)
 *   success() → double-tap pattern (settlement confirmed, payment done)
 *   warning() → strong nudge (destructive action confirmation)
 *   error()   → strong nudge (failed operation feedback)
 */
export function useHaptics() {
  const { trigger } = useWebHaptics();

  const emit = useCallback(
    (
      input?: HapticInput,
      options?: { force?: boolean; minIntervalMs?: number }
    ) => {
      const minIntervalMs = options?.minIntervalMs ?? MIN_HAPTIC_GAP_MS;

      if (!options?.force && !shouldEmitHaptic(minIntervalMs)) {
        return;
      }

      void trigger(input);
    },
    [trigger]
  );

  return {
    tap: () => emit(),
    success: () => emit("success", { minIntervalMs: 60 }),
    warning: () => emit("nudge", { minIntervalMs: 60 }),
    error: () => emit("nudge", { minIntervalMs: 60 }),
    dropdownOpen: () => emit("selection", { minIntervalMs: 60 }),
    dropdownSelect: () => emit("light", { minIntervalMs: 60 }),
    dropdownClose: () => emit("selection", { minIntervalMs: 60 }),
    themeTransition: (durationMs = DEFAULT_THEME_TRANSITION_DURATION) =>
      emit(createThemeTransitionPattern(durationMs), { force: true }),
  };
}
