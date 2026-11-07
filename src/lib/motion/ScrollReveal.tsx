"use client";

import { useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "./reduced-motion";
import { SCROLL_REVEAL } from "./tokens";
import { ensureScrollTrigger } from "./gsap-scroll";

ensureScrollTrigger();

export type ScrollRevealDirection = "up" | "down" | "left" | "right";

export interface ScrollRevealProps {
  children: ReactNode;
  direction?: ScrollRevealDirection;
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
  className?: string;
}

const directionMap = {
  up: { y: 1, x: 0 },
  down: { y: -1, x: 0 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
} as const;

/**
 * Opacity + translate reveal on scroll (GSAP ScrollTrigger).
 * Prefer this over Locomotive for SPA surfaces — one-shot play at `SCROLL_REVEAL.start`.
 */
export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = SCROLL_REVEAL.duration,
  distance = SCROLL_REVEAL.distance,
  once = true,
  className = "",
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [skipHiddenStyle, setSkipHiddenStyle] = useState(reducedMotion);

  useGSAP(
    () => {
      const el = containerRef.current;
      if (!el) return;

      if (reducedMotion) {
        gsap.set(el, { opacity: 1, x: 0, y: 0 });
        setSkipHiddenStyle(true);
        return;
      }

      const dir = directionMap[direction];
      const startMatch = /^top\s+(\d+(?:\.\d+)?)%$/.exec(SCROLL_REVEAL.start);
      const startRatio = startMatch ? Number(startMatch[1]) / 100 : 0.85;
      const rect = el.getBoundingClientRect();
      const alreadyVisible = rect.top < window.innerHeight * startRatio;

      const from = {
        opacity: 0,
        x: dir.x * distance,
        y: dir.y * distance,
      };
      const to = {
        opacity: 1,
        x: 0,
        y: 0,
        duration,
        delay,
        ease: SCROLL_REVEAL.ease,
      };

      if (alreadyVisible) {
        setSkipHiddenStyle(true);
        gsap.fromTo(el, from, to);
        return;
      }

      gsap.fromTo(el, from, {
        ...to,
        scrollTrigger: {
          trigger: el,
          start: SCROLL_REVEAL.start,
          toggleActions: once ? "play none none none" : "play reverse play reverse",
          onEnter: () => setSkipHiddenStyle(true),
        },
      });
    },
    {
      scope: containerRef,
      dependencies: [reducedMotion, direction, delay, duration, distance, once],
    },
  );

  return (
    <div
      ref={containerRef}
      className={className}
      style={reducedMotion || skipHiddenStyle ? undefined : { opacity: 0 }}
    >
      {children}
    </div>
  );
}
