import type { ReactNode } from "react";
import { useLayoutEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

interface BalanceExpandPanelProps {
  isExpanded: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

const CLOSE_MS = 300;

/**
 * Expand/collapse for balance row details.
 *
 * CSS grid `0fr` → `1fr` avoids Framer `height: "auto"` thrash.
 * Content stays mounted briefly on close so the collapse can animate;
 * on open it mounts in layout (before paint) so height measures correctly.
 */
export function BalanceExpandPanel({
  isExpanded,
  children,
  className,
  contentClassName,
}: BalanceExpandPanelProps) {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(isExpanded);

  useLayoutEffect(() => {
    if (isExpanded) {
      setMounted(true);
      return;
    }
    if (reducedMotion) {
      setMounted(false);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [isExpanded, reducedMotion]);

  return (
    <div
      className={cn(
        "grid min-h-0",
        reducedMotion
          ? isExpanded
            ? "grid-rows-[1fr]"
            : "grid-rows-[0fr]"
          : [
              "transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              "motion-reduce:transition-none",
              isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            ]
      )}
      aria-hidden={!isExpanded}
      // Prevent focus into clipped content while collapsed / closing.
      {...(!isExpanded ? { inert: true } : {})}
    >
      <div className="min-h-0 overflow-hidden">
        {mounted ? (
          <div
            className={cn(
              "relative border-t border-border bg-muted/15",
              className,
              !isExpanded && "pointer-events-none",
              reducedMotion
                ? isExpanded
                  ? "opacity-100"
                  : "opacity-0"
                : [
                    "transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isExpanded ? "opacity-100" : "opacity-0",
                  ]
            )}
          >
            <span
              className={cn(
                "absolute inset-y-3 left-0 w-0.5 origin-top rounded-full bg-primary",
                reducedMotion
                  ? isExpanded
                    ? "scale-y-100"
                    : "scale-y-0"
                  : [
                      "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isExpanded ? "scale-y-100" : "scale-y-0",
                    ]
              )}
              aria-hidden
            />
            <div className={cn("relative p-4 pl-5", contentClassName)}>{children}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
