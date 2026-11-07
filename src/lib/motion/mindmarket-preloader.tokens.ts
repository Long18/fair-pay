/**
 * Evidence-backed from https://mindmarket.com/ `.c-preloader`
 * — fixed full-viewport, z-index 300, exits via `clip-path: inset(0 0 100%)`.
 */
export const MM_PRELOADER = {
  zIndex: 35,
  /** MM uses `--transition-duration-slowest` on clip-path */
  clipExitDuration: 0.92,
  clipExitEase: [0.25, 0.1, 0.25, 1] as const,
  clipEnter: "inset(0% 0% 0% 0% round 0px 0px 1.5rem 1.5rem)",
  clipExit: "inset(0% 0% 100% 0% round 0px 0px 1.5rem 1.5rem)",
  /** SPA route change: shorter beat (MM does full document load per link). */
  routeVeilDuration: 0.72,
  /** Let favicon + ring choreography read before wipe (stroke ~1.15s on cold load). */
  routeVeilMinLogoMs: 780,
} as const;

export const ROUTE_TRANSITION = {
  /** New view rises from below (MM Swup container). */
  duration: 0.72,
  enterY: 112,
  exitY: 0,
  enterScale: 1,
  ease: [0.25, 0.1, 0.25, 1] as const,
  /** Pill snap (~220ms) + beat before page slide-up. */
  minHudMs: 580,
} as const;
