import { type ReactNode, type CSSProperties } from "react";

interface MarqueeProps {
  children: ReactNode;
  speed?: number; // duration in seconds, default 30
  direction?: "left" | "right";
  pauseOnHover?: boolean;
  className?: string;
}

export function Marquee({
  children,
  speed = 30,
  direction = "left",
  pauseOnHover = true,
  className = "",
}: MarqueeProps) {
  const animationDirection = direction === "left" ? "normal" : "reverse";

  const marqueeStyle: CSSProperties = {
    ["--marquee-duration" as string]: `${speed}s`,
    ["--marquee-direction" as string]: animationDirection,
  };

  return (
    <div
      className={`marquee-container overflow-hidden ${className}`}
      style={marqueeStyle}
    >
      <div
        className={`marquee-content flex gap-4 ${pauseOnHover ? "marquee-pause-hover" : ""}`}
      >
        <div className="marquee-track flex shrink-0 gap-4">{children}</div>
        <div className="marquee-track flex shrink-0 gap-4" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
