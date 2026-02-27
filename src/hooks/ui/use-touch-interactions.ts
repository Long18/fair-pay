import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook for detecting swipe gestures on touch devices
 * 
 * @param onSwipeUp - Callback when user swipes up
 * @param onSwipeDown - Callback when user swipes down
 * @param onSwipeLeft - Callback when user swipes left
 * @param onSwipeRight - Callback when user swipes right
 * @param threshold - Minimum distance in pixels to trigger swipe (default: 50)
 * @returns Ref to attach to the element
 */
export function useSwipeGesture(
  {
    onSwipeUp,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
  }: {
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
  },
  threshold: number = 50
) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchEndRef.current = null;
    touchStartRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    touchEndRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !touchEndRef.current) return;

    const deltaX = touchEndRef.current.x - touchStartRef.current.x;
    const deltaY = touchEndRef.current.y - touchStartRef.current.y;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if swipe is horizontal or vertical
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (absDeltaX > threshold) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    } else {
      // Vertical swipe
      if (absDeltaY > threshold) {
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight, threshold]);

  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return elementRef;
}

/**
 * Hook for implementing swipe-to-dismiss functionality
 * Returns drag state and handlers for framer-motion
 * 
 * @param onDismiss - Callback when element is dismissed
 * @param threshold - Distance threshold to trigger dismiss (default: 100)
 * @returns Object with drag props and state
 */
export function useSwipeToDismiss(
  onDismiss: () => void,
  threshold: number = 100
) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDrag = useCallback((_event: any, info: { offset: { y: number } }) => {
    // Only allow downward drag
    if (info.offset.y > 0) {
      setDragY(info.offset.y);
    }
  }, []);

  const handleDragEnd = useCallback(
    (_event: any, info: { offset: { y: number }; velocity: { y: number } }) => {
      setIsDragging(false);
      
      // Dismiss if dragged beyond threshold or has high velocity
      if (info.offset.y > threshold || info.velocity.y > 500) {
        onDismiss();
      } else {
        setDragY(0);
      }
    },
    [onDismiss, threshold]
  );

  return {
    isDragging,
    dragY,
    dragProps: {
      drag: 'y' as const,
      dragConstraints: { top: 0, bottom: 300 },
      dragElastic: { top: 0, bottom: 0.2 },
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDragEnd: handleDragEnd,
    },
  };
}

/**
 * Hook for pull-to-refresh functionality
 * 
 * @param onRefresh - Async callback to execute on refresh
 * @param threshold - Pull distance threshold (default: 80)
 * @returns Object with pull state and container ref
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  threshold: number = 80
) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const touchStartRef = useRef<number>(0);
  const scrollTopRef = useRef<number>(0);
  const containerRef = useRef<HTMLElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const container = containerRef.current;
    if (!container) return;

    scrollTopRef.current = container.scrollTop;
    
    // Only start pull if at top of scroll
    if (scrollTopRef.current === 0) {
      touchStartRef.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const container = containerRef.current;
    if (!container || scrollTopRef.current > 0) return;

    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartRef.current;

    // Only pull down
    if (distance > 0 && container.scrollTop === 0) {
      setIsPulling(true);
      setPullDistance(Math.min(distance, threshold * 1.5));
      
      // Prevent default scroll behavior when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setIsPulling(false);
    setPullDistance(0);
    touchStartRef.current = 0;
  }, [isPulling, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1),
  };
}

/**
 * Utility to ensure touch targets meet minimum size requirements
 * Returns className string with minimum touch target size
 * 
 * @param minSize - Minimum size in pixels (default: 44)
 * @returns Tailwind className string
 */
export function getTouchTargetClass(minSize: number = 44): string {
  // Convert pixels to Tailwind size (44px = 11 in Tailwind's 4px scale)
  const twSize = Math.ceil(minSize / 4);
  return `min-h-[${minSize}px] min-w-[${minSize}px]`;
}

/**
 * Hook to detect if device supports touch
 */
export function useHasTouch(): boolean {
  const [hasTouch, setHasTouch] = useState(false);

  useEffect(() => {
    setHasTouch(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - legacy property
      navigator.msMaxTouchPoints > 0
    );
  }, []);

  return hasTouch;
}
