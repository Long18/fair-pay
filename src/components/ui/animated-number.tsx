import { useRef, useEffect } from "react";
import { useCounterAnimation } from "@/hooks/use-counter-animation";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatter?: (value: number) => string;
}

export function AnimatedNumber({
  value: targetValue,
  duration = 1500,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  formatter,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const { value, animate, hasAnimated } = useCounterAnimation({
    end: targetValue,
    duration,
    decimals,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          animate();
          observerRef.current?.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(el);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [animate, hasAnimated]);

  const displayValue = formatter
    ? formatter(value)
    : value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}{displayValue}{suffix}
    </span>
  );
}
