import { useState, useCallback, useMemo } from "react";

// =============================================
// Types
// =============================================

export interface ProgressiveDisclosureOptions {
  initialCount?: number;
  incrementCount?: number;
}

export interface ProgressiveDisclosureResult<T> {
  visibleItems: T[];
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
  totalCount: number;
  visibleCount: number;
}

// =============================================
// Hook: useProgressiveDisclosure
// =============================================

/**
 * Hook for progressive disclosure of long lists
 * - Shows initial N items
 * - Provides "Load More" functionality
 * - Maintains scroll position
 */
export function useProgressiveDisclosure<T>(
  items: T[],
  options: ProgressiveDisclosureOptions = {}
): ProgressiveDisclosureResult<T> {
  const { initialCount = 10, incrementCount = 10 } = options;

  const [visibleCount, setVisibleCount] = useState(initialCount);

  const visibleItems = useMemo(() => {
    return items.slice(0, visibleCount);
  }, [items, visibleCount]);

  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + incrementCount, items.length));
  }, [incrementCount, items.length]);

  const reset = useCallback(() => {
    setVisibleCount(initialCount);
  }, [initialCount]);

  return {
    visibleItems,
    hasMore,
    loadMore,
    reset,
    totalCount: items.length,
    visibleCount,
  };
}
