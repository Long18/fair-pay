import { useCallback, useRef, useState } from "react";
import { gsap } from "gsap";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Margin (px) around the viewport edges for "already visible" check */
const VIEWPORT_MARGIN = 80;

/** Default scroll animation duration in seconds */
const SCROLL_DURATION = 0.6;

/** GSAP easing curve for scroll animation */
const SCROLL_EASE = "power2.out";

// ─── Pure Helpers ────────────────────────────────────────────────────────────

/**
 * Checks whether an element is already visible within the viewport,
 * accounting for a configurable margin.
 */
export function isElementInViewport(
  element: Element,
  margin: number = VIEWPORT_MARGIN,
): boolean {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;

  return rect.top >= margin && rect.bottom <= viewportHeight - margin;
}

/**
 * Calculates the scroll Y position needed to center an element
 * vertically in the viewport.
 */
export function calculateCenterScrollY(element: Element): number {
  const rect = element.getBoundingClientRect();
  const scrollY = window.scrollY;
  const viewportHeight = window.innerHeight;

  // Target Y = element's page-level center minus half the viewport
  const elementCenterY = rect.top + scrollY + rect.height / 2;
  const targetY = elementCenterY - viewportHeight / 2;

  // Clamp to valid scroll range
  const maxScrollY =
    document.documentElement.scrollHeight - viewportHeight;
  return Math.max(0, Math.min(targetY, maxScrollY));
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseCameraScrollReturn {
  /** Smoothly scroll to center the element matching the selector in the viewport */
  scrollToTarget: (selector: string | null) => Promise<void>;
  /** Whether a scroll animation is currently in progress */
  isScrolling: boolean;
}

/**
 * Hook that provides smooth camera-scroll animation to center a target
 * element in the viewport before the spotlight overlay appears.
 *
 * Uses a GSAP proxy-object tween to animate `window.scrollTo` on each frame,
 * avoiding the need for ScrollToPlugin.
 *
 * Behavior:
 * - If selector is null, resolves immediately (no scroll needed)
 * - If element is not found, resolves immediately
 * - If element is already visible in viewport (with margin), skips scroll
 * - Uses power2.out easing over 0.6s (0s when reduced motion is active)
 * - Sets isScrolling=true during animation, false on completion
 *
 * @returns scrollToTarget function and isScrolling state
 */
export function useCameraScroll(): UseCameraScrollReturn {
  const [isScrolling, setIsScrolling] = useState(false);
  const reducedMotion = useReducedMotion();

  // Track the active tween so we can kill it on new scroll requests
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  const scrollToTarget = useCallback(
    (selector: string | null): Promise<void> => {
      return new Promise<void>((resolve) => {
        // 1. Null selector — skip scroll
        if (selector === null) {
          resolve();
          return;
        }

        // 2. Query the element
        const element = document.querySelector(selector);
        if (!element) {
          resolve();
          return;
        }

        // 3. Already visible — skip scroll
        if (isElementInViewport(element)) {
          resolve();
          return;
        }

        // 4. Kill any in-progress scroll tween
        if (tweenRef.current) {
          tweenRef.current.kill();
          tweenRef.current = null;
        }

        // 5. Calculate target scroll position
        const targetY = calculateCenterScrollY(element);

        // 6. Determine duration (0 for reduced motion)
        const duration = reducedMotion ? 0 : SCROLL_DURATION;

        // 7. Animate via proxy object
        setIsScrolling(true);

        const proxy = { y: window.scrollY };
        tweenRef.current = gsap.to(proxy, {
          y: targetY,
          duration,
          ease: SCROLL_EASE,
          onUpdate: () => {
            window.scrollTo(0, proxy.y);
          },
          onComplete: () => {
            tweenRef.current = null;
            setIsScrolling(false);
            resolve();
          },
        });
      });
    },
    [reducedMotion],
  );

  return { scrollToTarget, isScrolling };
}
