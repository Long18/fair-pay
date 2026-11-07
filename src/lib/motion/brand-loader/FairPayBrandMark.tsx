"use client";

import { cn } from "@/lib/utils";

/** Canonical FairPay brand mark — same asset as `FairPayIcon` / navbar. */
export const FAIRPAY_BRAND_MARK_SRC = "/favicon.ico";

export type FairPayBrandMarkProps = {
  className?: string;
  size?: number;
};

export function FairPayBrandMark({
  className,
  size = 80,
}: FairPayBrandMarkProps) {
  return (
    <img
      src={FAIRPAY_BRAND_MARK_SRC}
      alt=""
      width={size}
      height={size}
      decoding="async"
      draggable={false}
      data-fp-brand-mark
      className={cn(
        "relative z-10 h-auto w-auto select-none object-contain",
        "drop-shadow-[0_12px_32px_oklch(0.55_0.14_210_/_0.35)]",
        className,
      )}
    />
  );
}
