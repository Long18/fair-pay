import { useCallback, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

import { useSpotlight } from "../hooks/use-spotlight";
import type { SpotlightRect } from "../types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SpotlightOverlayProps {
  /** CSS selector for the target element to highlight */
  targetSelector: string | null;
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** Padding around the spotlight cutout (px) */
  padding?: number;
  /** Shape of the cutout */
  shape?: "rect" | "circle" | "pill";
  /** Click handler for the overlay backdrop */
  onBackdropClick?: () => void;
  /** Content to render near the spotlight (tooltip-like) */
  children?: React.ReactNode;
  /** Screen reader announcement for the current step */
  announcement?: string;
}

// ─── SVG Cutout Renderers ────────────────────────────────────────────────────

/**
 * Renders the SVG mask cutout shape based on the spotlight rect.
 * The cutout is rendered as a black shape inside a white-filled mask,
 * making the cutout area transparent (visible) while the rest is opaque.
 */
function renderCutoutShape(rect: SpotlightRect) {
  const { x, y, width, height, shape, borderRadius } = rect;

  switch (shape) {
    case "circle": {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const r = Math.max(width, height) / 2;
      return <circle cx={cx} cy={cy} r={r} fill="black" />;
    }
    case "pill": {
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={borderRadius}
          ry={borderRadius}
          fill="black"
        />
      );
    }
    case "rect":
    default: {
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={borderRadius}
          ry={borderRadius}
          fill="black"
        />
      );
    }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Full-screen overlay with an SVG mask cutout that highlights a target DOM
 * element. Used during onboarding to draw the user's attention to specific
 * UI features.
 *
 * - Uses `useSpotlight` internally to track the target element's position
 * - Renders an SVG with a mask to create the transparent cutout
 * - Blocks pointer events outside the cutout area
 * - Animates opacity with Framer Motion (respects prefers-reduced-motion)
 * - Includes an aria-live region for screen reader announcements
 */
export function SpotlightOverlay({
  targetSelector,
  isVisible,
  padding = 8,
  shape = "rect",
  onBackdropClick,
  children,
  announcement,
}: SpotlightOverlayProps) {
  const maskId = useId();
  const reducedMotion = useReducedMotion();
  const { spotlightRect } = useSpotlight(targetSelector, isVisible);

  const animationDuration = reducedMotion ? 0 : 0.3;

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Only fire if the click is on the SVG backdrop itself, not on children
      if (e.target === e.currentTarget) {
        onBackdropClick?.();
      }
      // Also fire for clicks on the mask rect (the semi-transparent area)
      const target = e.target as SVGElement;
      if (target.dataset?.spotlightBackdrop === "true") {
        onBackdropClick?.();
      }
    },
    [onBackdropClick],
  );

  // Recompute the rect with the component's padding and shape overrides
  // The useSpotlight hook uses defaults; we need to apply step-specific values
  const adjustedRect = spotlightRect
    ? computeAdjustedRect(spotlightRect, padding, shape)
    : null;

  const shouldShow = isVisible && adjustedRect !== null;

  return (
    <>
      {/* Screen reader announcement */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {isVisible && announcement ? announcement : ""}
      </div>

      <AnimatePresence>
        {shouldShow && adjustedRect && (
          <motion.div
            key="spotlight-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: animationDuration, ease: "easeInOut" }}
            className={cn(
              "fixed inset-0 z-50",
              // The overlay itself doesn't block pointer events;
              // the SVG backdrop handles that via its own pointer-events
              "pointer-events-none",
            )}
            style={{ isolation: "isolate" }}
          >
            {/* SVG overlay with mask cutout */}
            <svg
              className="pointer-events-auto absolute inset-0 h-full w-full"
              viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
              preserveAspectRatio="none"
              onClick={handleBackdropClick}
              aria-hidden="true"
            >
              <defs>
                <mask id={`spotlight-mask-${maskId}`}>
                  {/* White = visible (opaque backdrop) */}
                  <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="white"
                  />
                  {/* Black = transparent (cutout hole) */}
                  {renderCutoutShape(adjustedRect)}
                </mask>
              </defs>

              {/* Semi-transparent backdrop with mask applied */}
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                className="fill-black/50"
                mask={`url(#spotlight-mask-${maskId})`}
                data-spotlight-backdrop="true"
              />

              {/* Border ring around the cutout for visual emphasis */}
              {renderCutoutBorder(adjustedRect)}
            </svg>

            {/* Cutout area: allow pointer events through */}
            <div
              className="pointer-events-auto absolute"
              style={{
                left: adjustedRect.x,
                top: adjustedRect.y,
                width: adjustedRect.width,
                height: adjustedRect.height,
                // Make this area transparent to clicks so the underlying
                // element is interactive
                pointerEvents: "none",
              }}
              aria-hidden="true"
            />

            {/* Children (tooltip content) rendered outside the SVG */}
            {children && (
              <div className="pointer-events-auto relative z-10">
                {children}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Adjusts the spotlight rect from the hook's defaults to use the
 * component's step-specific padding and shape values.
 *
 * The useSpotlight hook computes with default padding=8 and shape="rect".
 * This function re-derives the rect with the actual step config values.
 */
function computeAdjustedRect(
  baseRect: SpotlightRect,
  padding: number,
  shape: "rect" | "circle" | "pill",
): SpotlightRect {
  // The hook already computed with padding=8 and shape="rect".
  // We need to reverse that and apply the actual values.
  const defaultPadding = 8;

  // Recover the original element dimensions
  const origX = baseRect.x + defaultPadding;
  const origY = baseRect.y + defaultPadding;
  const origWidth = baseRect.width - defaultPadding * 2;
  const origHeight = baseRect.height - defaultPadding * 2;

  const borderRadius =
    shape === "circle"
      ? Math.max(origWidth, origHeight) / 2 + padding
      : shape === "pill"
        ? (origHeight + padding * 2) / 2
        : 8;

  return {
    x: origX - padding,
    y: origY - padding,
    width: origWidth + padding * 2,
    height: origHeight + padding * 2,
    shape,
    borderRadius,
  };
}

/**
 * Renders a subtle border around the cutout shape for visual emphasis.
 * Uses a semantic border color token.
 */
function renderCutoutBorder(rect: SpotlightRect) {
  const { x, y, width, height, shape, borderRadius } = rect;

  const commonProps = {
    fill: "none",
    className: "stroke-primary/40",
    strokeWidth: 2,
  };

  switch (shape) {
    case "circle": {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const r = Math.max(width, height) / 2;
      return <circle cx={cx} cy={cy} r={r} {...commonProps} />;
    }
    case "pill":
    case "rect":
    default: {
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={borderRadius}
          ry={borderRadius}
          {...commonProps}
        />
      );
    }
  }
}
