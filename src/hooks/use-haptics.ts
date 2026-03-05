import { useWebHaptics } from "web-haptics/react";

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

  return {
    tap: () => trigger(),
    success: () => trigger("success"),
    warning: () => trigger("nudge"),
    error: () => trigger("nudge"),
  };
}
