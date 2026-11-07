import type { ReactNode } from "react";
import { useLayoutEffect, useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { BALANCE_EXPAND_MOTION_TRANSITION } from "./balance-expand-motion";
import { BALANCE_EXPAND_GLASS_SURFACE } from "./balance-table-surface";

/** Upper bound for collapse spring; keeps content mounted through exit height. */
const COLLAPSE_MOUNT_MS = 380;

interface BalanceExpandPanelProps {
  isExpanded: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** When true, height tracks content without spring (avoids remeasure jerk mid-fetch). */
  isContentLoading?: boolean;
}

/**
 * Expand/collapse for balance row details.
 *
 * Framer `height: auto` spring on one overflow-hidden shell (no AnimatePresence —
 * avoids PopChildMeasure re-layout stutter). Content stays mounted through collapse.
 * `prefers-reduced-motion` mounts instantly.
 */
export function BalanceExpandPanel({
  isExpanded,
  children,
  className,
  contentClassName,
  isContentLoading = false,
}: BalanceExpandPanelProps) {
  const reducedMotion = useReducedMotion();
  const [contentMounted, setContentMounted] = useState(isExpanded);
  const heightTransition =
    isExpanded && isContentLoading
      ? { duration: 0 }
      : BALANCE_EXPAND_MOTION_TRANSITION.height;

  if (isExpanded && !contentMounted) {
    setContentMounted(true);
  }

  useLayoutEffect(() => {
    if (isExpanded) {
      return;
    }
    const timer = window.setTimeout(() => setContentMounted(false), COLLAPSE_MOUNT_MS);
    return () => window.clearTimeout(timer);
  }, [isExpanded]);

  if (reducedMotion) {
    if (!isExpanded) {
      return null;
    }
    return (
      <div className={cn(BALANCE_EXPAND_GLASS_SURFACE, className)} aria-hidden={false}>
        <div className={cn("relative p-4 pl-5", contentClassName)}>{children}</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={false}
      animate={{
        height: isExpanded ? "auto" : 0,
        opacity: isExpanded ? 1 : 0,
      }}
      transition={{
        height: heightTransition,
        opacity: BALANCE_EXPAND_MOTION_TRANSITION.opacity,
      }}
      className="overflow-hidden"
      aria-hidden={!isExpanded}
      {...(!isExpanded ? { inert: true } : {})}
    >
      {contentMounted ? (
        <div
          className={cn(
            BALANCE_EXPAND_GLASS_SURFACE,
            className,
            !isExpanded && "pointer-events-none"
          )}
        >
          <div className={cn("relative p-4 pl-5", contentClassName)}>{children}</div>
        </div>
      ) : null}
    </motion.div>
  );
}
