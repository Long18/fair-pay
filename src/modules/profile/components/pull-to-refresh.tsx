import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
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
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [canPull, setCanPull] = useState(false);

  // Check if we're at the top of the scrollable area
  const checkScrollPosition = useCallback(() => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop || window.scrollY;
      setCanPull(scrollTop <= 0);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => checkScrollPosition();

    // Listen to both container and window scroll
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
    }
    window.addEventListener("scroll", handleScroll);

    // Initial check
    checkScrollPosition();

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, [checkScrollPosition]);

  // Re-check scroll position when disabled state changes or after content changes
  useEffect(() => {
    if (disabled) {
      setCanPull(false);
      setPullDistance(0);
    } else {
      // Use a small delay to ensure DOM has updated after content changes
      const timeoutId = setTimeout(() => {
        checkScrollPosition();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [disabled, checkScrollPosition]);

  const handleDragEnd = async (_event: MouseEvent | TouchEvent | PointerEvent, _info: PanInfo) => {
    if (disabled || !canPull || isRefreshing) return;

    if (pullDistance > threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold);

      // Trigger haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        await controls.start({ y: 0 });
      }
    } else {
      setPullDistance(0);
      await controls.start({ y: 0 });
    }
  };

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled || !canPull || isRefreshing) return;

    const pull = Math.max(0, Math.min(info.offset.y, threshold * 1.5));
    setPullDistance(pull);
  };

  // Only enable on touch devices
  const isTouchDevice = typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  if (!isTouchDevice || disabled) {
    return <div className={className} ref={containerRef}>{children}</div>;
  }

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div className={cn("relative", className)} ref={containerRef}>
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

      {/* Content Container */}
      <motion.div
        drag={canPull && !isRefreshing && !disabled ? "y" : false}
        dragConstraints={{ top: 0, bottom: threshold * 1.5 }}
        dragElastic={0.3}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{
          y: isRefreshing ? threshold : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        className={cn(
          "relative",
          canPull && !isRefreshing && !disabled && "touch-pan-y"
        )}
      >
        {/* Visual Stretch Effect */}
        {pullDistance > 0 && !isRefreshing && (
          <div
            className="absolute inset-x-0 top-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"
            style={{
              height: `${pullDistance}px`,
              transform: "translateY(-100%)",
            }}
          />
        )}

        {children}
      </motion.div>
    </div>
  );
};
