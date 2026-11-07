import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ensureScrollTrigger } from "./gsap-scroll";
import { scrollMotionToTop } from "./lenis-bridge";

/**
 * Each navigation scrolls to top and refreshes scroll-linked reveals.
 * SPA equivalent on pathname change.
 */
export function useMotionRouteScroll() {
  const { pathname } = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    scrollMotionToTop({ immediate: false });
    ensureScrollTrigger();
    const refreshId = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 120);
    return () => window.clearTimeout(refreshId);
  }, [pathname]);
}
