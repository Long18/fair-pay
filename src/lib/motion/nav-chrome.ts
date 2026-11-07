import type { Transition, Variants } from "framer-motion";

/** Shared header chrome — docked top bar vs floating glass pill (scroll / route HUD). */
export const NAV_CHROME_TRANSITION: Transition = {
  duration: 0.5,
  ease: [0, 0, 0.2, 1],
};

/** Route change: header becomes pill before outlet animates in. */
export const NAV_CHROME_ROUTE_SNAP: Transition = {
  duration: 0.22,
  ease: [0.25, 0.1, 0.25, 1],
};

export const NAV_CHROME_ROUTE_SNAP_MS = 220;

export const navChromeVariants: Variants = {
  docked: {
    opacity: 1,
    y: 0,
    maxWidth: "100%",
    borderRadius: 0,
  },
  floating: {
    opacity: 1,
    /** Same offset as former `top-3` + glass pill while scrolling. */
    y: 12,
    maxWidth: "min(64rem, calc(100vw - 1.5rem))",
    borderRadius: 16,
  },
};
