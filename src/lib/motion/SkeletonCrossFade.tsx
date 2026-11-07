"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CROSS_FADE_TRANSITION } from "./tokens";
import { instantIfReduced, useReducedMotion } from "./reduced-motion";

export type SkeletonCrossFadeProps = {
  showSkeleton: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * 200ms opacity cross-fade when async content replaces a skeleton (balance preview pattern).
 */
export function SkeletonCrossFade({
  showSkeleton,
  skeleton,
  children,
  className,
}: SkeletonCrossFadeProps) {
  const reduced = useReducedMotion();
  const transition = instantIfReduced(reduced, CROSS_FADE_TRANSITION);

  return (
    <div className={cn("relative min-w-0", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {showSkeleton ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
          >
            {skeleton}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
