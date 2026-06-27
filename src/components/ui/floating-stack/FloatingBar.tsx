import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/ui/use-reduced-motion";
import {
  Z_FLOATING,
  FLOATING_SPRING,
  SURFACE_GLASS,
} from "@/lib/floating-tokens";

/** Props for FloatingBar — a horizontally centered pill-shaped action bar. */
export interface FloatingBarProps {
  /** Content rendered inside the bar (typically action buttons). */
  children: React.ReactNode;
  /** Additional class names. */
  className?: string;
  /** Optional max-width override. Default: "max-w-xl". */
  maxWidth?: string;
  /** Hide the bar entirely. */
  hidden?: boolean;
}

/**
 * Fixed bottom-center pill bar for bulk-action and contextual actions.
 *
 * Uses framer-motion entrance (slide-up + fade) with reduced-motion support.
 * Z-index sits below FloatingActionStack pills so pills float over bars.
 */
export function FloatingBar({
  children,
  className,
  maxWidth = "max-w-xl",
  hidden = false,
}: FloatingBarProps) {
  const reducedMotion = useReducedMotion();

  if (hidden) return null;

  return (
    <motion.div
      className={cn(
        "fixed left-1/2 -translate-x-1/2",
        "bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] md:bottom-6",
        "w-[calc(100%-2rem)]",
        maxWidth,
        "rounded-full",
        SURFACE_GLASS,
        "px-4 py-2",
        "flex items-center justify-center gap-2",
        className
      )}
      style={{ zIndex: Z_FLOATING.bar }}
      initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.95 }}
      transition={reducedMotion ? undefined : FLOATING_SPRING}
      role="toolbar"
    >
      {children}
    </motion.div>
  );
}
