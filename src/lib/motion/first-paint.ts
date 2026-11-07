import { useState } from "react";
import type { Transition } from "framer-motion";
import {
  FIRST_PAINT_CHROME,
  FIRST_PAINT_ENTRANCE_Y,
  FIRST_PAINT_HERO_ENTRANCE_Y,
  FIRST_PAINT_TRANSITION,
  EASING,
} from "./tokens";
import { instantIfReduced } from "./reduced-motion";

const NAVIGATION_ENTRY = "navigation" as const;

/**
 * True on full page load / reload (not client-side route changes).
 * Uses Performance Navigation Timing — SPA navigations do not re-fire this entry.
 */
export function isFirstPaintNavigation(): boolean {
  if (typeof window === "undefined") return false;

  const entries = performance.getEntriesByType(NAVIGATION_ENTRY);
  const nav = entries[0] as PerformanceNavigationTiming | undefined;
  if (!nav) return true;

  return nav.type === "reload" || nav.type === "navigate";
}

export function useFirstPaintNavigation(): boolean {
  return useState(isFirstPaintNavigation)[0];
}

export function firstPaintEnterTransition(reduced: boolean): Transition {
  return instantIfReduced(reduced, {
    ...FIRST_PAINT_TRANSITION,
    delay: FIRST_PAINT_CHROME.contentDelay,
  });
}

/** Fixed NavBar — leads the cold-load sequence; never scroll-hidden. */
export function firstPaintChromeHeaderInitial(
  reduced: boolean,
): false | { opacity: number; y: number } {
  return reduced ? false : { opacity: 0, y: FIRST_PAINT_CHROME.headerY };
}

export function firstPaintChromeHeaderTransition(reduced: boolean): Transition {
  return instantIfReduced(reduced, {
    duration: FIRST_PAINT_CHROME.headerDuration,
    ease: EASING.viewport,
  });
}

/** Profile / group identity hero — visible above the fold, not GSAP scroll-hidden. */
export function firstPaintHeroInitial(
  reduced: boolean,
): false | { opacity: number; y: number } {
  return reduced
    ? false
    : { opacity: 0, y: FIRST_PAINT_HERO_ENTRANCE_Y };
}

export function firstPaintHeroTransition(reduced: boolean): Transition {
  return instantIfReduced(reduced, {
    ...FIRST_PAINT_TRANSITION,
    delay: FIRST_PAINT_CHROME.heroDelay,
  });
}

export function firstPaintEnterInitial(
  reduced: boolean,
): false | { opacity: number; y: number } {
  return reduced ? false : { opacity: 0, y: FIRST_PAINT_ENTRANCE_Y };
}
