"use client";

import type { PropsWithChildren } from "react";
import { useMotionRouteScroll } from "./use-motion-route-scroll";

/** Runs inside react-router layout — scroll reset + ScrollTrigger refresh on navigate. */
export function MotionRouteCoordinator({ children }: PropsWithChildren) {
  useMotionRouteScroll();
  return children;
}
