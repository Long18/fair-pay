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

/** Pill height scale (px). All pills use rounded-full; width follows content. */
const PILL_SIZES = {
  sm: 40,
  default: 48,
  lg: 56,
} as const;

export type PillSize = keyof typeof PILL_SIZES;

/**
 * Glassmorphism surface — opaque enough to read on light page backgrounds,
 * with a clear border so FABs don’t disappear against white content.
 */
export const SURFACE_GLASS =
  "bg-card/95 backdrop-blur-xl border border-border/70 shadow-lg ring-1 ring-black/5 dark:ring-white/10";

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

/**
 * FloatingPill heights — keep in sync with `getPillSizeClasses`.
 * Used to lift stacked FABs so they don't overlap on the same side.
 */
export const FAB_SLOT_HEIGHT_PX = {
  sm: 40,
  default: 48,
  lg: 56,
} as const;

/** Vertical gap between stacked FABs on the same side (12px = Tailwind `gap-3`). */
export const FAB_STACK_GAP_PX = 12;

/** Tailwind class for speed-dial spacing inside a stack — keep in sync with `FAB_STACK_GAP_PX`. */
export const FAB_STACK_GAP_CLASS = "gap-3" as const;

/**
 * One vertical lane step on the right FAB ladder (lg trigger height + inter-stack gap).
 * `FAB_BOTTOM_OFFSET_BY_STACK` literals use multiples of this value (+68px per index).
 */
export const FAB_STACK_STEP_PX = FAB_SLOT_HEIGHT_PX.lg + FAB_STACK_GAP_PX;

/** Bottom clearance above mobile tab bar / desktop footer lane (rem). */
export const FAB_BOTTOM_BASE_REM = { mobile: 5, desktop: 5.25 } as const;

/** Horizontal inset from viewport — matches `getSideOffsetClasses` (`right-4` / `md:right-6`). */
export const FAB_SIDE_INSET_PX = { mobile: 16, md: 24 } as const;

/**
 * Right-side FAB lane indices (0 = bottom-most). Keep every app FAB on this ladder
 * so siblings do not overlap.
 */
export const FAB_RIGHT_STACK = {
  primary: 0,
  agentInbox: 1,
} as const;

/** Left-side FAB lane (assistant, scroll) — avoids crowding Quick Actions on the right. */
export const FAB_LEFT_STACK = {
  chat: 0,
  scrollToTop: 1,
} as const;

/** Pixels to show scroll-to-top control. */
export const SCROLL_TO_TOP_THRESHOLD_PX = 400;

/**
 * Responsive bottom offset class strings — one entry per right-side FAB lane (0–4).
 *
 * Must stay **literal** full class names so Tailwind can scan and emit them.
 * Do not build these with template literals + `${liftPx}` — JIT will not ship the CSS.
 *
 * Each step above index 0 lifts by one `FAB_STACK_STEP_PX` (68px at current token values).
 */
const FAB_BOTTOM_OFFSET_BY_STACK = [
  "bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)]",
  "bottom-[calc(env(safe-area-inset-bottom)+5rem+68px)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem+68px)]",
  "bottom-[calc(env(safe-area-inset-bottom)+5rem+136px)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem+136px)]",
] as const;

const FAB_MAX_STACK_INDEX = FAB_BOTTOM_OFFSET_BY_STACK.length - 1;

/**
 * Responsive bottom offset — mobile clears bottom-nav, desktop clears footer FAB lanes.
 *
 * `stackIndex` lifts the stack above lower siblings on the same side
 * (0 = bottom-most / primary FAB). Each step reserves an `lg` slot + gap
 * so mixed-size FABs still clear each other.
 */
export function getBottomOffsetClasses(stackIndex = 0): string {
  const index = Math.min(Math.max(0, stackIndex), FAB_MAX_STACK_INDEX);
  return FAB_BOTTOM_OFFSET_BY_STACK[index]!;
}

/** Responsive side offset. */
export function getSideOffsetClasses(side: "right" | "left" = "right"): string {
  return side === "left" ? "left-4 md:left-6" : "right-4 md:right-6";
}
