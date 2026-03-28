import { useMemo } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { Variants } from "framer-motion";

export interface StaggerAnimationOptions {
  staggerDelay?: number;
  rowDuration?: number;
  maxStaggerCount?: number;
  yOffset?: number;
}

export interface StaggerAnimationResult {
  containerVariants: Variants;
  rowVariants: Variants;
  animationKey: string;
}

export function useStaggerAnimation(
  items: unknown[],
  options: StaggerAnimationOptions = {}
): StaggerAnimationResult {
  const reducedMotion = useReducedMotion();

  const {
    staggerDelay = 0.05,
    rowDuration = 0.3,
    maxStaggerCount = 15,
    yOffset = 12,
  } = options;

  const animationKey = useMemo(() => {
    const first = items[0];
    const last = items[items.length - 1];
    const signature = {
      len: items.length,
      firstId: first && typeof first === "object" && "id" in first ? (first as { id: unknown }).id : undefined,
      lastId: last && typeof last === "object" && "id" in last ? (last as { id: unknown }).id : undefined,
    };
    return JSON.stringify(signature);
  }, [items]);

  const containerVariants = useMemo<Variants>(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: reducedMotion ? 0 : staggerDelay,
          delayChildren: 0,
        },
      },
    }),
    [reducedMotion, staggerDelay]
  );

  const rowVariants = useMemo<Variants>(
    () => ({
      hidden: { opacity: 0, y: reducedMotion ? 0 : yOffset },
      visible: (index: number) => ({
        opacity: 1,
        y: 0,
        transition: {
          duration: reducedMotion || index >= maxStaggerCount ? 0 : rowDuration,
          ease: [0.25, 0.1, 0.25, 1],
        },
      }),
    }),
    [reducedMotion, yOffset, rowDuration, maxStaggerCount]
  );

  return { containerVariants, rowVariants, animationKey };
}

export default useStaggerAnimation;
