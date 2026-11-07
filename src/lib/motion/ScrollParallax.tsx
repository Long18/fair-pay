"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "./reduced-motion";
import { SCROLL_SCRUB } from "./tokens";
import { ensureScrollTrigger } from "./gsap-scroll";

ensureScrollTrigger();

export type ScrollParallaxAxis = "x" | "y";

export interface ScrollParallaxProps {
  children: ReactNode;
  /** Travel distance in px (sign flips with {@link direction}). */
  distance?: number;
  axis?: ScrollParallaxAxis;
  /** Negative = counter-scroll while the section crosses the viewport. */
  direction?: 1 | -1;
  /** ScrollTrigger scrub smoothing (seconds). */
  scrub?: number | boolean;
  className?: string;
  /** Optional outer trigger; defaults to this wrapper. */
  triggerRef?: RefObject<HTMLElement | null>;
}

/**
 * Scroll-scrubbed translate — continuous motion while a section crosses the viewport.
 * Tall sections use scrub drift; one-shot entrances stay on {@link ScrollReveal}.
 */
export function ScrollParallax({
  children,
  distance = SCROLL_SCRUB.distance,
  axis = "x",
  direction = -1,
  scrub = SCROLL_SCRUB.scrub,
  className = "",
  triggerRef,
}: ScrollParallaxProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      const layer = layerRef.current;
      if (!layer || reducedMotion) return;

      const trigger = triggerRef?.current ?? layer;
      const prop = axis === "x" ? "x" : "y";
      const from = direction * distance * 0.5;
      const to = direction * distance * -0.5;

      gsap.fromTo(
        layer,
        { [prop]: from },
        {
          [prop]: to,
          ease: "none",
          scrollTrigger: {
            trigger,
            start: SCROLL_SCRUB.start,
            end: SCROLL_SCRUB.end,
            scrub,
          },
        },
      );
    },
    {
      scope: layerRef,
      dependencies: [reducedMotion, distance, axis, direction, scrub, triggerRef],
    },
  );

  return (
    <div ref={layerRef} className={className}>
      {children}
    </div>
  );
}
