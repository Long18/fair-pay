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

export {
  RightFabLaneProvider,
  useRightFabLane,
} from "./RightFabLaneContext";

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
  FAB_STACK_GAP_CLASS,
  FAB_STACK_STEP_PX,
  FAB_BOTTOM_BASE_REM,
  FAB_SIDE_INSET_PX,
  FAB_RIGHT_STACK,
  FAB_LEFT_STACK,
  SCROLL_TO_TOP_THRESHOLD_PX,
  getPillSizeClasses,
  getPillIconClasses,
  getBottomOffsetClasses,
  getSideOffsetClasses,
  type PillSize,
} from "@/lib/floating-tokens";
