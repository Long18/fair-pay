"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "./reduced-motion";
import { SCROLL_REVEAL, STAGGER_MAX_CLIENT } from "./tokens";
import { ensureScrollTrigger } from "./gsap-scroll";

ensureScrollTrigger();

export type StaggerChildrenDirection = "up" | "down" | "left" | "right";

export interface StaggerChildrenProps {
  children: ReactNode;
  staggerDelay?: number;
  direction?: StaggerChildrenDirection;
  duration?: number;
  distance?: number;
  className?: string;
}

const directionMap = {
  up: { y: 1, x: 0 },
  down: { y: -1, x: 0 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
} as const;

/**
 * Staggered scroll reveal for direct children (client cap {@link STAGGER_MAX_CLIENT}).
 */
export function StaggerChildren({
  children,
  staggerDelay = SCROLL_REVEAL.staggerDelay,
  direction = "up",
  duration = SCROLL_REVEAL.duration,
  distance = SCROLL_REVEAL.distance,
  className = "",
}: StaggerChildrenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      const el = containerRef.current;
      if (!el) return;

      if (reducedMotion) {
        gsap.set(el.children, { opacity: 1, x: 0, y: 0 });
        return;
      }

      const childElements = Array.from(el.children);
      if (childElements.length === 0) return;

      const dir = directionMap[direction];
      const animated = childElements.slice(0, STAGGER_MAX_CLIENT);
      const remainder = childElements.slice(STAGGER_MAX_CLIENT);

      if (remainder.length > 0) {
        gsap.set(remainder, { opacity: 1, x: 0, y: 0 });
      }

      gsap.set(animated, { opacity: 0, x: dir.x * distance, y: dir.y * distance });

      gsap.to(animated, {
        opacity: 1,
        x: 0,
        y: 0,
        duration,
        stagger: staggerDelay,
        ease: SCROLL_REVEAL.ease,
        scrollTrigger: {
          trigger: el,
          start: SCROLL_REVEAL.start,
          toggleActions: "play none none none",
        },
      });
    },
    {
      scope: containerRef,
      dependencies: [reducedMotion, staggerDelay, direction, duration, distance],
    },
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
