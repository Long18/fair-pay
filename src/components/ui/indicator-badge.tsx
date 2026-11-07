import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

type IndicatorBadgeColor = "danger" | "primary" | "default";

const colorClass: Record<IndicatorBadgeColor, string> = {
  danger:
    "bg-destructive text-destructive-foreground",
  primary:
    "bg-primary text-primary-foreground",
  default:
    "bg-foreground text-background",
};

export type IndicatorBadgeProps = {
  /** Unread / notification count; hidden when ≤ 0 unless `showZero`. */
  count: number;
  max?: number;
  showZero?: boolean;
  color?: IndicatorBadgeColor;
  /** Ring around badge (HeroUI `showOutline`). */
  outline?: boolean;
  /** Ping + subtle scale when new items arrive or attention loop is on. */
  attention?: boolean;
  className?: string;
};

function formatCount(count: number, max: number): string {
  return count > max ? `${max}+` : String(count);
}

/**
 * HeroUI-style notification count overlay — place inside `relative overflow-visible` parent.
 * @see https://heroui.com/docs/components/badge
 */
export function IndicatorBadge({
  count,
  max = 99,
  showZero = false,
  color = "danger",
  outline = true,
  attention = false,
  className,
}: IndicatorBadgeProps) {
  const reducedMotion = useReducedMotion();
  const visible = showZero ? count >= 0 : count > 0;
  const label = formatCount(count, max);

  if (!visible) return null;

  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={label}
        role="status"
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-0.5 -top-0.5 z-10 flex",
          className,
        )}
        initial={reducedMotion ? false : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={reducedMotion ? undefined : { scale: 0.5, opacity: 0 }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 520, damping: 26, mass: 0.55 }
        }
      >
        {attention && !reducedMotion ? (
          <span
            className={cn(
              "absolute inset-0 rounded-full opacity-50",
              colorClass[color],
              "animate-[indicator-badge-ping_1.4s_cubic-bezier(0,0,0.2,1)_infinite]",
            )}
            aria-hidden
          />
        ) : null}
        <span
          className={cn(
            "relative flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-0.5",
            "text-[11px] font-semibold tabular-nums leading-none",
            colorClass[color],
            outline && "ring-2 ring-background",
            attention &&
              !reducedMotion &&
              "motion-safe:animate-[indicator-badge-pop_0.5s_ease-out]",
          )}
        >
          {label}
        </span>
      </motion.span>
    </AnimatePresence>
  );
}

type IndicatorBadgeRootProps = {
  children: React.ReactNode;
  className?: string;
} & IndicatorBadgeProps;

/**
 * Wraps a control (icon button) with a positioned count badge — HeroUI `Badge` + child pattern.
 */
export function IndicatorBadgeRoot({
  children,
  className,
  ...badge
}: IndicatorBadgeRootProps) {
  return (
    <span className={cn("relative inline-flex shrink-0 overflow-visible", className)}>
      {children}
      <IndicatorBadge {...badge} />
    </span>
  );
}
