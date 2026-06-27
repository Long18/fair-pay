import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/ui/use-reduced-motion";
import {
  Z_FLOATING,
  FLOATING_SPRING,
  getBottomOffsetClasses,
  getSideOffsetClasses,
} from "@/lib/floating-tokens";

/** Props for FloatingActionStack — the root FAB container with speed-dial. */
export interface FloatingActionStackProps {
  /** Side of the viewport. Default: "right". */
  side?: "right" | "left";
  /** The main trigger button (always visible). */
  trigger: React.ReactNode;
  /** Speed-dial content rendered above the trigger (e.g. <FloatingPillGroup>). */
  children?: React.ReactNode;
  /** Controlled open state. Default: false. */
  isOpen?: boolean;
  /** Called when the backdrop/Escape should close the menu. */
  onClose?: () => void;
  /** Show backdrop blur when open. Default: true. */
  showBackdrop?: boolean;
  /** Entrance animation delay (seconds). Default: 0.3. */
  entranceDelay?: number;
  /** Hide the entire stack (e.g. unauthenticated). */
  hidden?: boolean;
  /** Additional class names. */
  className?: string;
}

/**
 * Root FAB container — fixed-position column with trigger + optional speed-dial.
 *
 * Layout (direction "up"):
 *   ┌─────────────────┐
 *   │   action pill    │  ← children animate above trigger
 *   │   action pill    │
 *   │   [trigger]      │  ← always visible at bottom of stack
 *   └─────────────────┘
 *
 * Provides: fixed positioning (safe-area-aware), z-index layering,
 * optional backdrop, Escape-key handling.
 */
export function FloatingActionStack({
  side = "right",
  trigger,
  children,
  isOpen = false,
  onClose,
  showBackdrop = true,
  entranceDelay = 0.3,
  hidden = false,
  className,
}: FloatingActionStackProps) {
  const reducedMotion = useReducedMotion();

  // Escape key to close
  useEffect(() => {
    if (!onClose || !isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (hidden) return null;

  const alignClasses = side === "left" ? "items-start" : "items-end";

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && showBackdrop && children && (
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            style={{ zIndex: Z_FLOATING.backdrop }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Floating stack container */}
      <motion.div
        className={cn(
          "fixed",
          getBottomOffsetClasses(),
          getSideOffsetClasses(side),
          "flex flex-col-reverse gap-3",
          alignClasses,
          className
        )}
        style={{ zIndex: Z_FLOATING.pill }}
        initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={
          reducedMotion ? undefined : { ...FLOATING_SPRING, delay: entranceDelay }
        }
      >
        {/* Trigger (always visible, anchored at bottom of stack) */}
        {trigger}

        {/* Speed-dial / children (stack above the trigger) */}
        {children}
      </motion.div>
    </>
  );
}
