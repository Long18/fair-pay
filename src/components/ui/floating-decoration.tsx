import { type ReactNode } from "react";

interface FloatingDecorationProps {
  children: ReactNode;
  className?: string;
  speed?: "slow" | "medium" | "fast";
  delay?: number;
  size?: number;
  opacity?: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
}

const speedMap = {
  slow: "animate-float-slow",
  medium: "animate-float-medium",
  fast: "animate-float-fast",
};

export function FloatingDecoration({
  children,
  className = "",
  speed = "medium",
  delay = 0,
  opacity = 0.08,
  top,
  left,
  right,
  bottom,
}: FloatingDecorationProps) {
  return (
    <div
      className={`absolute pointer-events-none select-none ${speedMap[speed]} ${className}`}
      style={{
        opacity,
        top,
        left,
        right,
        bottom,
        animationDelay: `${delay}s`,
        willChange: "transform",
      }}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}
