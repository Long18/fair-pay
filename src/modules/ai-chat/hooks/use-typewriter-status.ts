/**
 * useTypewriterStatus — drives a type-in → hold → erase animation loop for a
 * status label that may change while animating.
 *
 * The hook renders the current `label` character-by-character, holds it fully
 * visible briefly, then erases character-by-character. When the label changes
 * mid-cycle, the ongoing erase completes first so transitions never look cut
 * off. Rapid label changes (< 300 ms) are debounced to avoid flashing.
 *
 * If the OS reports `prefers-reduced-motion`, animation is skipped and the
 * full label is shown as a static string.
 */
import { useEffect, useRef, useState } from "react";

type Phase = "typing" | "holding" | "erasing" | "idle";

interface Options {
  typeMs?: number;
  eraseMs?: number;
  holdMs?: number;
  debounceMs?: number;
}

const DEFAULT_TYPE_MS = 40;
const DEFAULT_ERASE_MS = 25;
const DEFAULT_HOLD_MS = 1000;
const DEFAULT_DEBOUNCE_MS = 300;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export interface TypewriterStatus {
  /** Text currently visible in the bubble. */
  displayText: string;
  /** Current animation phase (useful for tests / debug). */
  phase: Phase;
  /** True while any animation is running. */
  isAnimating: boolean;
}

/**
 * Animate `label` as a typewriter. When `active` becomes false, the current
 * cycle finishes gracefully (erase completes) and the hook returns to idle.
 */
export function useTypewriterStatus(
  label: string,
  active: boolean,
  options: Options = {},
): TypewriterStatus {
  const typeMs = options.typeMs ?? DEFAULT_TYPE_MS;
  const eraseMs = options.eraseMs ?? DEFAULT_ERASE_MS;
  const holdMs = options.holdMs ?? DEFAULT_HOLD_MS;
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  const [displayText, setDisplayText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => prefersReducedMotion());

  // Debounced label — commits after `debounceMs` of stability
  const [committedLabel, setCommittedLabel] = useState(label);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Watch prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Debounce rapid label changes
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setCommittedLabel(label);
    }, debounceMs);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [label, debounceMs]);

  // Reduced motion: static text, no animation
  useEffect(() => {
    if (!reducedMotion) return;
    if (!active) {
      setDisplayText("");
      setPhase("idle");
      return;
    }
    setDisplayText(committedLabel);
    setPhase("holding");
  }, [reducedMotion, active, committedLabel]);

  // Main animation state machine
  useEffect(() => {
    if (reducedMotion) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    // Inactive: gracefully finish current erase, then idle
    if (!active && phase === "idle") {
      setDisplayText("");
      return;
    }

    // Kick off first cycle if idle and active
    if (active && phase === "idle" && displayText.length === 0) {
      setPhase("typing");
      return;
    }

    if (phase === "typing") {
      if (displayText.length < committedLabel.length) {
        timerRef.current = setTimeout(() => {
          setDisplayText(committedLabel.slice(0, displayText.length + 1));
        }, typeMs);
      } else if (displayText === committedLabel) {
        setPhase("holding");
      } else {
        // Label changed mid-typing → restart typing from current head
        setPhase("erasing");
      }
    } else if (phase === "holding") {
      timerRef.current = setTimeout(() => {
        setPhase("erasing");
      }, holdMs);
    } else if (phase === "erasing") {
      if (displayText.length > 0) {
        timerRef.current = setTimeout(() => {
          setDisplayText((prev) => prev.slice(0, -1));
        }, eraseMs);
      } else {
        // Erase finished — if still active, start next cycle; else idle
        setPhase(active ? "typing" : "idle");
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, phase, displayText, committedLabel, typeMs, eraseMs, holdMs, reducedMotion]);

  return {
    displayText,
    phase,
    isAnimating: phase !== "idle",
  };
}
