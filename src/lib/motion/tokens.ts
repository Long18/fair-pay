import type { Transition } from "framer-motion";
import {
  ENTRANCE_Y,
  HOVER_SCALE,
  RIPPLE_DURATION,
  SPRING_DEFAULT,
  SPRING_GENTLE,
  STAGGER_DELAY,
  TAP_SCALE,
} from "../animation";

/**
 * Motion design tokens — keep in sync with `src/App.css` `--animation-duration-*`
 * and `--animation-easing-*`.
 */
export const DURATION_MS = {
  fast: 150,
  normal: 200,
  slow: 300,
} as const;

export const DURATION_S = {
  fast: DURATION_MS.fast / 1000,
  normal: DURATION_MS.normal / 1000,
  slow: DURATION_MS.slow / 1000,
  ripple: RIPPLE_DURATION,
  stagger: STAGGER_DELAY,
} as const;

/** Cubic-bezier tuples for framer `ease` arrays. */
export const EASING = {
  out: [0, 0, 0.2, 1] as const,
  in: [0.4, 0, 1, 1] as const,
  inOut: [0.4, 0, 0.2, 1] as const,
  viewport: [0.25, 0.1, 0.25, 1] as const,
} as const;

/** Default page / layout shell entrance (client + admin exemplars). */
export const SHELL_TRANSITION: Transition = {
  duration: DURATION_S.slow,
  ease: EASING.out,
};

/**
 * First full document load (reload / cold navigate) — MindMarket-style pacing,
 * slightly longer than in-app route transitions.
 */
export const FIRST_PAINT_TRANSITION: Transition = {
  duration: 0.72,
  ease: EASING.viewport,
};

export const FIRST_PAINT_ENTRANCE_Y = 28;

/**
 * MindMarket-style load choreography: fixed NavBar leads, main shell follows.
 * Page hero cards (profile cover, group header) sit between header and body scroll reveals.
 */
export const FIRST_PAINT_CHROME = {
  headerDuration: 0.55,
  /** NavBar enters from slightly above (glass signature bar). */
  headerY: -14,
  /** Delay before `<MotionPageShell>` / outlet body fades in (after brand curtain peak). */
  contentDelay: 0.28,
  /** Page identity hero after NavBar, before scroll-linked sections. */
  heroDelay: 0.18,
  heroEntranceY: 20,
} as const;

export const FIRST_PAINT_HERO_ENTRANCE_Y = FIRST_PAINT_CHROME.heroEntranceY;

/**
 * Scroll-linked section reveals (GSAP ScrollTrigger).
 * Aligned with MindMarket case study: `top 85%`, `power2.out`, ~600ms, 40px travel.
 */
export const SCROLL_REVEAL = {
  start: "top 88%",
  duration: 0.85,
  distance: 64,
  ease: "power3.out",
  staggerDelay: 0.12,
} as const;

/** Scroll-linked drift while section crosses viewport (MindMarket `data-reveal-translate-x`). */
export const SCROLL_SCRUB = {
  start: "top bottom",
  end: "bottom top",
  distance: 56,
  scrub: 0.85,
} as const;

/** Skeleton → content cross-fade (uiux-motion §5.9). */
export const CROSS_FADE_TRANSITION: Transition = {
  duration: DURATION_S.normal,
  ease: EASING.out,
};

/** List stagger caps — client hub 8; admin tables 15 (uiux-motion §5.4). */
export const STAGGER_MAX_CLIENT = 8;
export const STAGGER_MAX_ADMIN = 15;

/** Subtle dim while async shell content resolves (exemplar — admin overview). */
export const SHELL_LOADING_OPACITY = 0.94;

export const ENTRANCE_OFFSET_Y = ENTRANCE_Y;

export {
  ENTRANCE_Y,
  HOVER_SCALE,
  RIPPLE_DURATION,
  SPRING_DEFAULT,
  SPRING_GENTLE,
  STAGGER_DELAY,
  TAP_SCALE,
};
