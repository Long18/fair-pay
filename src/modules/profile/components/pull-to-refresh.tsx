import React, { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { RefreshCwIcon } from "@/components/ui/icons";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  disabled?: boolean;
}

export const PullToRefresh = ({
  onRefresh,
  children,
  className,
  threshold = 80,
  disabled = false,
}: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const isPulling = useRef(false);

  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  const isAtTop = useCallback((): boolean => {
    return window.scrollY <= 0;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;
      if (isAtTop()) {
        touchStartY.current = e.touches[0].clientY;
      } else {
        touchStartY.current = null;
      }
      isPulling.current = false;
    },
    [disabled, isRefreshing, isAtTop]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing || touchStartY.current === null) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;

      // Only activate pull if dragging down and still at top
      if (diff > 0 && isAtTop()) {
        isPulling.current = true;
        const pull = Math.min(diff * 0.5, threshold * 1.5);
        setPullDistance(pull);

        // Prevent native scroll only when actively pulling
        if (pull > 10) {
          e.preventDefault();
        }
      } else {
        // Not pulling down or scrolled away — let native scroll handle it
        isPulling.current = false;
        if (pullDistance > 0) {
          setPullDistance(0);
        }
      }
    },
    [disabled, isRefreshing, isAtTop, threshold, pullDistance]
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || !isPulling.current) {
      touchStartY.current = null;
      isPulling.current = false;
      setPullDistance(0);
      return;
    }

    touchStartY.current = null;
    isPulling.current = false;

    if (pullDistance > threshold) {
      setIsRefreshing(true);
      if ("vibrate" in navigator) {
        navigator.vibrate(10);
      }
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, pullDistance, threshold, onRefresh]);

  if (!isTouchDevice || disabled) {
    return <div className={className}>{children}</div>;
  }

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 flex justify-center transition-opacity duration-200 z-50",
          showIndicator ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={{
          transform: `translateY(${Math.min(pullDistance - 40, threshold - 40)}px)`,
        }}
      >
        <div
          className={cn(
            "rounded-full bg-background shadow-lg p-2",
            isRefreshing && "animate-pulse"
          )}
        >
          <motion.div
            animate={{
              rotate: isRefreshing ? 360 : pullProgress * 180,
            }}
            transition={{
              rotate: isRefreshing
                ? { duration: 1, repeat: Infinity, ease: "linear" }
                : { duration: 0 },
            }}
          >
            <RefreshCwIcon
              size={24}
              className={cn(
                "transition-colors",
                pullProgress >= 1 || isRefreshing
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            />
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform:
            pullDistance > 0 || isRefreshing
              ? `translateY(${isRefreshing ? threshold : pullDistance}px)`
              : undefined,
          transition:
            pullDistance === 0 && !isRefreshing
              ? "transform 0.3s ease"
              : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};
