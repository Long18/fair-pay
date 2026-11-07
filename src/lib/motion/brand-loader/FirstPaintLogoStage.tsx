"use client";

import { forwardRef, type PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export type FirstPaintLogoStageProps = PropsWithChildren<{
  className?: string;
}>;

/**
 * Isolated logo stage — MindMarket `data-preloader-svg-wrap` equivalent.
 * Background lives in `FirstPaintBrandBackground`; only logo motion here.
 */
export const FirstPaintLogoStage = forwardRef<HTMLDivElement, FirstPaintLogoStageProps>(
  function FirstPaintLogoStage({ children, className }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "relative z-[1] flex h-[min(28vh,220px)] w-full items-center justify-center",
          className,
        )}
        data-fp-loader-stage
        aria-hidden
      >
        <div data-fp-loader-wrap className="relative w-[7.5rem] sm:w-[8.5rem]">
          {children}
        </div>
      </div>
    );
  },
);
