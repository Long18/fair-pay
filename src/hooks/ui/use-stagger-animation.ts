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
      visible: (index: number) => {
        const cappedIndex = Math.min(Math.max(index, 0), maxStaggerCount);
        const skipMotion = reducedMotion || index >= maxStaggerCount;
        return {
          opacity: 1,
          y: 0,
          transition: {
            duration: skipMotion ? 0 : rowDuration,
            // Explicit delay so nested motion.tr (inside TableBody) still queues
            // even when staggerChildren cannot reach them through non-motion wrappers.
            delay: skipMotion ? 0 : cappedIndex * staggerDelay,
            ease: [0.25, 0.1, 0.25, 1],
          },
        };
      },
    }),
    [reducedMotion, yOffset, rowDuration, maxStaggerCount, staggerDelay]
  );

  return { containerVariants, rowVariants, animationKey };
}

export default useStaggerAnimation;
