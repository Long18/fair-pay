import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

interface ParallaxElementProps {
  children: ReactNode;
  speed?: number; // 0.5 = half speed (slower), 2 = double speed (faster)
  direction?: "vertical" | "horizontal";
  className?: string;
}

export function ParallaxElement({
  children,
  speed = 0.5,
  direction = "vertical",
  className = "",
}: ParallaxElementProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const distance = 100 * (1 - speed);
      const prop = direction === "vertical" ? "y" : "x";

      gsap.to(el, {
        [prop]: distance,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
