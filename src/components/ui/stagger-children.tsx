import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

gsap.registerPlugin(ScrollTrigger);

interface StaggerChildrenProps {
  children: ReactNode;
  staggerDelay?: number;
  direction?: "up" | "down" | "left" | "right";
  duration?: number;
  distance?: number;
  className?: string;
}

const directionMap = {
  up: { y: 1, x: 0 },
  down: { y: -1, x: 0 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
};

export function StaggerChildren({
  children,
  staggerDelay = 0.1,
  direction = "up",
  duration = 0.5,
  distance = 30,
  className = "",
}: StaggerChildrenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      const el = containerRef.current;
      if (!el) return;

      if (reducedMotion) {
        gsap.set(el.children, { opacity: 1, x: 0, y: 0 });
        return;
      }

      const childElements = el.children;
      if (childElements.length === 0) return;

      const dir = directionMap[direction];

      gsap.fromTo(
        childElements,
        {
          opacity: 0,
          x: dir.x * distance,
          y: dir.y * distance,
        },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration,
          stagger: staggerDelay,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: containerRef, dependencies: [reducedMotion] }
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
