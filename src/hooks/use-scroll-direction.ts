import { useState, useEffect, useRef } from "react";

interface ScrollDirectionState {
  direction: "up" | "down" | null;
  scrollY: number;
  isScrolled: boolean;
}

export function useScrollDirection(threshold = 10) {
  const [state, setState] = useState<ScrollDirectionState>({
    direction: null,
    scrollY: 0,
    isScrolled: false,
  });

  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const diff = scrollY - lastScrollY.current;

      if (Math.abs(diff) < threshold) {
        ticking.current = false;
        return;
      }

      setState({
        direction: diff > 0 ? "down" : "up",
        scrollY,
        isScrolled: scrollY > 50,
      });

      lastScrollY.current = scrollY > 0 ? scrollY : 0;
      ticking.current = false;
    };

    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return state;
}
