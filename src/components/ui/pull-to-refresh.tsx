/**
 * Pull-to-Refresh Component
 * 
 * Provides pull-to-refresh functionality for scrollable containers on mobile.
 * Shows a loading indicator when user pulls down from the top.
 * 
 * Usage:
 * ```tsx
 * <PullToRefresh onRefresh={async () => { await refetch(); }}>
 *   <div>Your scrollable content here</div>
 * </PullToRefresh>
 * ```
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCwIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { usePullToRefresh } from "@/hooks/use-touch-interactions";
import { useIsMobile } from "@/hooks/use-mobile";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
  threshold?: number;
  disabled?: boolean;
}

export function PullToRefresh({
  children,
  onRefresh,
  className,
  threshold = 80,
  disabled = false,
}: PullToRefreshProps) {
  const isMobile = useIsMobile();
  const shouldEnable = isMobile && !disabled;

  const { containerRef, isPulling, isRefreshing, pullDistance, pullProgress } = 
    usePullToRefresh(onRefresh, threshold);

  // Don't render pull-to-refresh UI on desktop
  if (!shouldEnable) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={cn("relative overflow-auto", className)}
    >
      {/* Pull-to-Refresh Indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center py-4"
            style={{
              transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
            }}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCwIcon
                className={cn(
                  "h-5 w-5 transition-transform",
                  isRefreshing && "animate-spin",
                  !isRefreshing && pullProgress >= 1 && "rotate-180"
                )}
                style={{
                  transform: !isRefreshing 
                    ? `rotate(${pullProgress * 180}deg)` 
                    : undefined,
                }}
              />
              <span className="text-sm font-medium">
                {isRefreshing
                  ? "Refreshing..."
                  : pullProgress >= 1
                  ? "Release to refresh"
                  : "Pull to refresh"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div
        style={{
          transform: isPulling || isRefreshing 
            ? `translateY(${Math.min(pullDistance, threshold)}px)` 
            : undefined,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
