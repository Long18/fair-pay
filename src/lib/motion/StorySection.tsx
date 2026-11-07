"use client";

import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export type StorySectionProps = PropsWithChildren<{
  className?: string;
  /** Enable scroll-snap target for section-by-section pacing (dashboard exemplar). */
  snap?: boolean;
  tight?: boolean;
}>;

/**
 * Viewport-sized story block — MindMarket section rhythm adapted for app pages.
 * Does not replace native routing; pairs with Lenis + ScrollReveal.
 */
export function StorySection({
  children,
  className,
  snap = true,
  tight = false,
}: StorySectionProps) {
  return (
    <section
      className={cn(
        "relative w-full min-w-0",
        tight
          ? "min-h-[min(72dvh,720px)] py-8"
          : "min-h-[min(92dvh,920px)] py-10 md:py-14",
        snap && "dashboard-story-section scroll-mt-20",
        className,
      )}
    >
      {children}
    </section>
  );
}
