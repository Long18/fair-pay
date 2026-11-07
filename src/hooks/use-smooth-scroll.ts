import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setMotionLenis } from "@/lib/motion/lenis-bridge";

export function useSmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      lerp: 0.08,
      duration: 1.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      syncTouch: false,
    });

    lenisRef.current = lenis;
    setMotionLenis(lenis);

    // Sync Lenis with GSAP ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    // Use GSAP ticker for Lenis RAF loop
    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };

    // Import gsap dynamically to avoid circular deps
    import("gsap").then(({ gsap }) => {
      gsap.ticker.add(tickerCallback);
      gsap.ticker.lagSmoothing(0);
    });

    return () => {
      setMotionLenis(null);
      lenis.destroy();
      import("gsap").then(({ gsap }) => {
        gsap.ticker.remove(tickerCallback);
      });
    };
  }, []);

  return lenisRef;
}
