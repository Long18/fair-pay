import { type Transition } from "framer-motion";
import { SPRING_DEFAULT } from "./animation";

/**
 * Floating Element Design Tokens
 *
 * Centralized tokens for all floating UI (FABs, action bars, floating panels).
 * Use these instead of hardcoded values to guarantee consistent layering,
 * positioning, and surface treatment across the app.
 */

/** Z-index scale — bar (bulk), backdrop (FAB overlay), pill (FAB items) in ascending order. */
export const Z_FLOATING = {
  bar: 40,
  backdrop: 45, // above page content and bar, but below pill so FAB items stay clickable
  pill: 50,
} as const;

/** Bottom offsets. Mobile clears the bottom-nav (h-16 + buffer). */
export const BOTTOM_OFFSET = {
  mobile: "calc(env(safe-area-inset-bottom) + 5rem)",
  desktop: "1.5rem",
} as const;

/** Pill height scale (px). All pills use rounded-full; width follows content. */
export const PILL_SIZES = {
  sm: 40,
  default: 48,
  lg: 56,
} as const;

export type PillSize = keyof typeof PILL_SIZES;

/** Glassmorphism surface — semi-transparent + blur + subtle border. */
export const SURFACE_GLASS =
  "bg-background/70 backdrop-blur-xl border border-border/40 shadow-lg";

/** Glassmorphism surface — primary action variant with brand tint. */
export const SURFACE_GLASS_PRIMARY =
  "bg-primary/90 backdrop-blur-xl border border-primary/40 text-primary-foreground shadow-xl";

/** Spring animation re-exported from animation tokens. */
export const FLOATING_SPRING: Transition = SPRING_DEFAULT;

/** Stagger delay between pills (ms). 40ms → perceptible cascade, not slow. */
export const PILL_STAGGER_MS = 40;

/** Tailwind height + padding classes for a given pill size. */
export function getPillSizeClasses(size: PillSize = "default"): string {
  switch (size) {
    case "sm":
      return "h-10 min-w-10 px-3 text-sm";
    case "lg":
      return "h-14 min-w-14 px-5 text-base";
    default:
      return "h-12 min-w-12 px-4 text-sm";
  }
}

/** Icon size classes matching the pill size. */
export function getPillIconClasses(size: PillSize = "default"): string {
  switch (size) {
    case "sm":
      return "size-4";
    case "lg":
      return "size-6";
    default:
      return "size-5";
  }
}

/** Responsive bottom offset — mobile clears bottom-nav, desktop uses 1.5rem. */
export function getBottomOffsetClasses(): string {
  return "bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-6";
}

/** Responsive side offset. */
export function getSideOffsetClasses(side: "right" | "left" = "right"): string {
  return side === "left" ? "left-4 md:left-6" : "right-4 md:right-6";
}
