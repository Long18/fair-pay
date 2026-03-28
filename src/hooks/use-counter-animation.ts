import { useEffect, useRef, useState, useCallback } from "react";

interface UseCounterAnimationOptions {
  end: number;
  duration?: number;
  decimals?: number;
  startOnMount?: boolean;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function useCounterAnimation({
  end,
  duration = 1500,
  decimals = 0,
  startOnMount = false,
}: UseCounterAnimationOptions) {
  const [value, setValue] = useState(startOnMount ? 0 : end);
  const [hasAnimated, setHasAnimated] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const animate = useCallback(() => {
    if (hasAnimated) return;
    setHasAnimated(true);
    setValue(0);
    startTimeRef.current = null;

    const step = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);

      setValue(Number((easedProgress * end).toFixed(decimals)));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setValue(end);
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }, [end, duration, decimals, hasAnimated]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { value, animate, hasAnimated };
}
