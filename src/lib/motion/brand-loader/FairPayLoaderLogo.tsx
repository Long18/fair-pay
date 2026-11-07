"use client";

import { useRef } from "react";
import { FairPayIcon } from "@/components/ui/icons";
import { useReducedMotion } from "../reduced-motion";
import { FairPayBrandMark } from "./FairPayBrandMark";
import { FirstPaintLogoStage } from "./FirstPaintLogoStage";
import { useFairPayLoaderLogoTimeline } from "./useFairPayLoaderLogoTimeline";
import { FP_LOADER_LOGO } from "./fairpay-loader-logo.tokens";

/**
 * Brand-faithful loader logo — `/favicon.ico` + decorative ring (not a fake logo shape).
 */
export function FairPayLoaderLogo() {
  const reducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);

  useFairPayLoaderLogoTimeline(stageRef, !reducedMotion);

  if (reducedMotion) {
    return (
      <FirstPaintLogoStage>
        <FairPayIcon className="mx-auto h-20 w-20" />
      </FirstPaintLogoStage>
    );
  }

  const size = FP_LOADER_LOGO.viewBoxSize;
  const ringR = size * 0.42;

  return (
    <FirstPaintLogoStage ref={stageRef}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          className="pointer-events-none absolute inset-0 size-full text-primary"
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden
        >
          <circle
            data-fp-brand-ring
            cx={size / 2}
            cy={size / 2}
            r={ringR}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeOpacity={0.45}
            opacity={0}
          />
        </svg>
        <FairPayBrandMark size={Math.round(size * 0.62)} />
      </div>
    </FirstPaintLogoStage>
  );
}
