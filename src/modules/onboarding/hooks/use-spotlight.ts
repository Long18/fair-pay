import { useState, useCallback, useEffect, useRef } from "react";

import type { SpotlightRect } from "../types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TooltipPosition {
  /** X coordinate for tooltip placement (px) */
  x: number;
  /** Y coordinate for tooltip placement (px) */
  y: number;
  /** Computed placement relative to the spotlight */
  placement: string;
}

// ─── Pure Calculation ────────────────────────────────────────────────────────

/**
 * Computes the spotlight cutout rectangle for a given target element.
 *
 * Algorithm (from design doc):
 * 1. Query element via document.querySelector(targetSelector)
 * 2. If not found, return null
 * 3. Get bounding rect + scroll offsets
 * 4. Compute spotlight rect with padding on all sides
 * 5. borderRadius: circle = max(w,h)/2 + padding, pill = (h + 2*padding)/2, rect = 8
 *
 * PRECONDITION: targetSelector is a valid CSS selector, padding >= 0
 * POSTCONDITION: Returns rect with positive dimensions, or null if element not found
 * INVARIANT: spotlight fully contains the target element + padding
 */
export function calculateSpotlightPosition(
  targetSelector: string,
  padding: number,
  shape: "rect" | "circle" | "pill",
): SpotlightRect | null {
  const element = document.querySelector(targetSelector);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  const spotlightRect: SpotlightRect = {
    x: rect.left + scrollX - padding,
    y: rect.top + scrollY - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
    shape,
    borderRadius:
      shape === "circle"
        ? Math.max(rect.width, rect.height) / 2 + padding
        : shape === "pill"
          ? (rect.height + padding * 2) / 2
          : 8,
  };

  return spotlightRect;
}

// ─── Tooltip Position Calculation ────────────────────────────────────────────

/**
 * Computes a tooltip position that avoids viewport overflow.
 *
 * Tries to place the tooltip below the spotlight first, then above,
 * then to the right, then to the left. Falls back to centered below
 * if all positions overflow.
 */
function calculateTooltipPosition(
  spotlightRect: SpotlightRect | null,
): TooltipPosition {
  // Default center position when no spotlight
  if (!spotlightRect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return { x: vw / 2, y: vh / 2, placement: "center" };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tooltipWidth = 320;
  const tooltipHeight = 200;
  const gap = 12;

  // Convert spotlight rect from page coordinates to viewport coordinates
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const viewportX = spotlightRect.x - scrollX;
  const viewportY = spotlightRect.y - scrollY;

  // Center X of the spotlight in viewport
  const centerX = viewportX + spotlightRect.width / 2;
  // Clamp tooltip X so it stays within viewport
  const clampedX = Math.max(
    gap,
    Math.min(centerX - tooltipWidth / 2, vw - tooltipWidth - gap),
  );

  // Try bottom placement
  const bottomY = viewportY + spotlightRect.height + gap;
  if (bottomY + tooltipHeight <= vh - gap) {
    return { x: clampedX, y: bottomY, placement: "bottom" };
  }

  // Try top placement
  const topY = viewportY - tooltipHeight - gap;
  if (topY >= gap) {
    return { x: clampedX, y: topY, placement: "top" };
  }

  // Try right placement
  const rightX = viewportX + spotlightRect.width + gap;
  const centerY = viewportY + spotlightRect.height / 2 - tooltipHeight / 2;
  const clampedY = Math.max(
    gap,
    Math.min(centerY, vh - tooltipHeight - gap),
  );
  if (rightX + tooltipWidth <= vw - gap) {
    return { x: rightX, y: clampedY, placement: "right" };
  }

  // Try left placement
  const leftX = viewportX - tooltipWidth - gap;
  if (leftX >= gap) {
    return { x: leftX, y: clampedY, placement: "left" };
  }

  // Fallback: place below, clamped to viewport
  return {
    x: clampedX,
    y: Math.max(gap, Math.min(bottomY, vh - tooltipHeight - gap)),
    placement: "bottom",
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook that tracks a DOM element's position and computes spotlight + tooltip
 * placement for the onboarding overlay.
 *
 * Uses ResizeObserver for element size changes and scroll/resize listeners
 * for viewport changes. All position updates go through requestAnimationFrame
 * to avoid layout thrashing.
 *
 * POSTCONDITIONS:
 * - spotlightRect is non-null IFF targetSelector resolves to a visible element AND isVisible is true
 * - tooltipPosition is computed to avoid viewport overflow
 * - recalculate() forces a position recalculation
 * - All listeners are cleaned up on unmount
 *
 * @param targetSelector - CSS selector for the target element, or null
 * @param isVisible - Whether the spotlight should be visible
 */
export function useSpotlight(
  targetSelector: string | null,
  isVisible: boolean,
) {
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(
    null,
  );
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    x: 0,
    y: 0,
    placement: "center",
  });

  const rafIdRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  /**
   * Core recalculation function. Computes spotlight rect and tooltip position
   * for the current target element. Wrapped in requestAnimationFrame to batch
   * with the browser's paint cycle and avoid layout thrashing.
   */
  const recalculate = useCallback(() => {
    // Cancel any pending rAF to avoid stacking
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;

      if (!targetSelector || !isVisible) {
        setSpotlightRect(null);
        setTooltipPosition(calculateTooltipPosition(null));
        return;
      }

      // Use default padding=8 and shape="rect" — the SpotlightOverlay component
      // will pass the step-specific values. For the hook, we read from the element
      // and use sensible defaults. The actual padding/shape come from the step config
      // and are passed through the SpotlightOverlay component props.
      // Here we compute with defaults; the component can override via direct calls.
      const rect = calculateSpotlightPosition(targetSelector, 8, "rect");
      setSpotlightRect(rect);
      setTooltipPosition(calculateTooltipPosition(rect));
    });
  }, [targetSelector, isVisible]);

  // Set up ResizeObserver and scroll/resize event listeners
  useEffect(() => {
    // Initial calculation
    recalculate();

    if (!targetSelector || !isVisible) {
      return;
    }

    // Observe target element for size changes
    const element = document.querySelector(targetSelector);
    if (element) {
      const observer = new ResizeObserver(() => {
        recalculate();
      });
      observer.observe(element);
      resizeObserverRef.current = observer;
    }

    // Listen for scroll and resize events
    const handleScrollOrResize = () => {
      recalculate();
    };

    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });

    return () => {
      // Clean up ResizeObserver
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      // Clean up event listeners
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);

      // Cancel any pending rAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [targetSelector, isVisible, recalculate]);

  return {
    spotlightRect,
    tooltipPosition,
    recalculate,
  };
}
