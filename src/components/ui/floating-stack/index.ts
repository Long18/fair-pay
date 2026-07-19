/**
 * Floating Stack Design System
 *
 * Unified primitives for all floating UI elements in FairPay.
 * Replaces the previous patchwork of independently-styled FABs, action bars,
 * and floating panels with one consistent glassmorphic pill language.
 *
 * Components:
 * - FloatingPill          → single pill button
 * - FloatingActionStack   → root container (trigger + speed-dial)
 * - FloatingBar           → horizontal centered action bar
 */

export { FloatingPill } from "./FloatingPill";
export type { FloatingPillProps } from "./FloatingPill";

export { FloatingActionStack } from "./FloatingActionStack";
export type { FloatingActionStackProps } from "./FloatingActionStack";

export { FloatingBar } from "./FloatingBar";
export type { FloatingBarProps } from "./FloatingBar";

export {
  Z_FLOATING,
  SURFACE_GLASS,
  SURFACE_GLASS_PRIMARY,
  FLOATING_SPRING,
  PILL_STAGGER_MS,
  FAB_SLOT_HEIGHT_PX,
  FAB_STACK_GAP_PX,
  getPillSizeClasses,
  getPillIconClasses,
  getBottomOffsetClasses,
  getSideOffsetClasses,
  type PillSize,
} from "@/lib/floating-tokens";
