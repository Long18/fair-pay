import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/ui/use-reduced-motion";
import {
  FLOATING_SPRING,
  PILL_STAGGER_MS,
  type PillSize,
} from "@/lib/floating-tokens";
import { FloatingPill } from "./FloatingPill";

const GAP_CLASSES = {
  sm: "gap-2",
  default: "gap-3",
  lg: "gap-4",
} as const;

/** A single action item in the pill group. */
export interface PillGroupItem {
  icon?: React.ReactNode;
  label?: string;
  onClick?: () => void;
  href?: string;
  ariaLabel?: string;
  /** Per-item surface variant. Default: "glass". */
  variant?: "glass" | "primary";
  /** Per-item size override. Defaults to group size. */
  size?: PillSize;
  /** Analytics tracking id. */
  "data-track-id"?: string;
  "data-track-category"?: string;
}

/** Props for FloatingPillGroup — a vertically stacked set of animated pills. */
export interface FloatingPillGroupProps {
  /** Array of pill action items to render. */
  pills: PillGroupItem[];
  /** Controls visibility and animate-in/out. Default: false. */
  isOpen?: boolean;
  /** Stack direction. Default: "up". */
  direction?: "up" | "down";
  /** Gap between pills. Default: "default". */
  gap?: "sm" | "default" | "lg";
  /** Default pill size for items without their own override. */
  size?: PillSize;
  /** Alignment within the stack. Default: "end" (right-align). */
  align?: "start" | "center" | "end";
  /** Additional class names on the container. */
  className?: string;
}

/**
 * Vertically stacked pill group with staggered entrance animation.
 *
 * Used inside FloatingActionStack for speed-dial actions. Each pill staggers
 * in at 40ms intervals, respecting prefers-reduced-motion.
 */
export function FloatingPillGroup({
  pills,
  isOpen = false,
  direction = "up",
  gap = "default",
  size = "default",
  align = "end",
  className,
}: FloatingPillGroupProps) {
  const reducedMotion = useReducedMotion();

  const alignClasses =
    align === "start" ? "items-start" : align === "center" ? "items-center" : "items-end";

  // flex-col-reverse stacks pills upward from the trigger naturally
  const dirClasses = direction === "up" ? "flex-col-reverse" : "flex-col";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={cn("flex", dirClasses, GAP_CLASSES[gap], alignClasses, className)}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {pills.map((pill, index) => {
            const delay = reducedMotion ? 0 : (index * PILL_STAGGER_MS) / 1000;
            const initialY = direction === "up" ? 12 : -12;

            return (
              <motion.div
                key={pill.label ?? pill.ariaLabel ?? index}
                initial={
                  reducedMotion ? false : { opacity: 0, y: initialY, scale: 0.85 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: initialY, scale: 0.85 }
                }
                transition={{ ...FLOATING_SPRING, delay }}
              >
                <FloatingPill
                  icon={pill.icon}
                  label={pill.label}
                  onClick={pill.onClick}
                  href={pill.href}
                  ariaLabel={pill.ariaLabel ?? pill.label}
                  variant={pill.variant ?? "glass"}
                  size={pill.size ?? size}
                  data-track-id={pill["data-track-id"]}
                  data-track-category={pill["data-track-category"]}
                />
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
