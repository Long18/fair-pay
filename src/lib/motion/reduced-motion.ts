import type { Transition } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  ENTRANCE_OFFSET_Y,
  SHELL_LOADING_OPACITY,
  SHELL_TRANSITION,
} from "./tokens";

export { useReducedMotion };

export function instantIfReduced(
  reduced: boolean,
  transition: Transition,
): Transition {
  return reduced ? { duration: 0 } : transition;
}

export function shellEnterTransition(reduced: boolean): Transition {
  return instantIfReduced(reduced, SHELL_TRANSITION);
}

/** Framer `initial` prop — `false` skips entrance when reduced motion is on. */
export function shellEnterInitial(
  reduced: boolean,
): false | { opacity: number; y: number } {
  return reduced ? false : { opacity: 0, y: ENTRANCE_OFFSET_Y };
}

export function shellAnimate(
  reduced: boolean,
  loading = false,
): { opacity: number; y: number } {
  if (reduced) {
    return { opacity: 1, y: 0 };
  }
  return {
    opacity: loading ? SHELL_LOADING_OPACITY : 1,
    y: 0,
  };
}
