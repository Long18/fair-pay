"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";
import {
  firstPaintEnterInitial,
  firstPaintEnterTransition,
  useFirstPaintNavigation,
} from "./first-paint";
import {
  shellAnimate,
  shellEnterInitial,
  shellEnterTransition,
  useReducedMotion,
} from "./reduced-motion";

export type MotionPageShellProps = PropsWithChildren<{
  /** Exemplar: dim shell slightly while primary data is loading. */
  loading?: boolean;
  className?: string;
}>;

/**
 * Shared layout shell — fade + slight Y on mount. Honors `prefers-reduced-motion`.
 * Use on client `Layout` and as an admin page wrapper exemplar.
 */
export function MotionPageShell({
  children,
  loading = false,
  className,
}: MotionPageShellProps) {
  const reducedMotion = useReducedMotion();
  const firstPaint = useFirstPaintNavigation();
  const initial = firstPaint
    ? firstPaintEnterInitial(reducedMotion)
    : shellEnterInitial(reducedMotion);
  const transition = firstPaint
    ? firstPaintEnterTransition(reducedMotion)
    : shellEnterTransition(reducedMotion);

  return (
    <motion.div
      className={cn("min-w-0 flex-1 flex flex-col", className)}
      initial={initial}
      animate={shellAnimate(reducedMotion, loading)}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}
