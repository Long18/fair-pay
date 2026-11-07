/**
 * Full-viewport load veil: fixed layer, clip-path wipe exit, route HUD pacing.
 */
export const PRELOADER_SHELL = {
  zIndex: 35,
  /** Slowest transition tier on clip-path exit */
  clipExitDuration: 0.92,
  clipExitEase: [0.25, 0.1, 0.25, 1] as const,
  clipEnter: "inset(0% 0% 0% 0% round 0px 0px 1.5rem 1.5rem)",
  clipExit: "inset(0% 0% 100% 0% round 0px 0px 1.5rem 1.5rem)",
  /** SPA route change: shorter beat than cold document load. */
  routeVeilDuration: 0.72,
  /** Logo choreography must read before wipe (stroke ~1.15s on cold load). */
  routeVeilMinLogoMs: 780,
} as const;

export const ROUTE_TRANSITION = {
  /** Incoming view rises from below. */
  duration: 0.72,
  enterY: 112,
  exitY: 0,
  enterScale: 1,
  ease: [0.25, 0.1, 0.25, 1] as const,
  /** Nav HUD minimum beat before page slide-up. */
  minHudMs: 580,
} as const;
