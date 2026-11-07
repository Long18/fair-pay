"use client";

import { useRef } from "react";
import { ScrollParallax, type ScrollParallaxProps } from "./ScrollParallax";
import { ScrollReveal, type ScrollRevealProps } from "./ScrollReveal";
import { cn } from "@/lib/utils";

export type ScrollRevealStackProps = ScrollRevealProps & {
  /** Enable scroll-scrubbed parallax on the revealed block. */
  parallax?: boolean;
  parallaxDistance?: ScrollParallaxProps["distance"];
  parallaxAxis?: ScrollParallaxProps["axis"];
  stackClassName?: string;
};

/**
 * One-shot entrance ({@link ScrollReveal}) plus optional scroll-linked drift ({@link ScrollParallax}).
 */
export function ScrollRevealStack({
  children,
  parallax = false,
  parallaxDistance,
  parallaxAxis = "x",
  stackClassName,
  className,
  ...revealProps
}: ScrollRevealStackProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  const body = parallax ? (
    <ScrollParallax
      triggerRef={sectionRef}
      distance={parallaxDistance}
      axis={parallaxAxis}
      className={stackClassName}
    >
      {children}
    </ScrollParallax>
  ) : (
    children
  );

  return (
    <div ref={sectionRef} className={cn("relative", parallax ? undefined : className)}>
      <ScrollReveal
        {...revealProps}
        className={cn(parallax ? className : undefined)}
      >
        {body}
      </ScrollReveal>
    </div>
  );
}
