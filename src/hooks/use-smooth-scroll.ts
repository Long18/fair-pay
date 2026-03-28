import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function useSmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      lerp: 0.1,
      duration: 1.2,
      smoothWheel: true,
    });

    lenisRef.current = lenis;

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
      lenis.destroy();
      import("gsap").then(({ gsap }) => {
        gsap.ticker.remove(tickerCallback);
      });
    };
  }, []);

  return lenisRef;
}
