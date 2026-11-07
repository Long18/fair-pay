"use client";

import { cn } from "@/lib/utils";

/**
 * Load veil background only — theme-native mist, no loud marketing gradient.
 * Pairs with `FairPayLoaderLogo`.
 */
export function FirstPaintBrandBackground({ className }: { className?: string }) {
  return (
    <div className={cn("fp-loader-veil", className)} data-fp-loader-bg aria-hidden>
      <div className="fp-loader-veil__glow" />
      <div className="fp-loader-veil__mesh" />
    </div>
  );
}
