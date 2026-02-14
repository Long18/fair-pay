import * as React from "react";
import { cn } from "@/lib/utils";

interface AnimatedBeamProps {
  containerRef: React.RefObject<HTMLElement | null>;
  fromRef: React.RefObject<HTMLElement | null>;
  toRef: React.RefObject<HTMLElement | null>;
  curvature?: number;
  duration?: number;
  delay?: number;
  reverse?: boolean;
  pathWidth?: number;
  gradientStartColor?: string;
  gradientStopColor?: string;
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
  className?: string;
}

const AnimatedBeam = ({
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  duration = 2,
  delay = 0,
  reverse = false,
  pathWidth = 2,
  gradientStartColor = "#18181b",
  gradientStopColor = "#18181b",
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
  className,
}: AnimatedBeamProps) => {
  const [pathD, setPathD] = React.useState("");
  const [svgDimensions, setSvgDimensions] = React.useState({
    width: 0,
    height: 0,
  });
  const uniqueId = React.useId();

  const updatePath = React.useCallback(() => {
    if (!containerRef.current || !fromRef.current || !toRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const fromRect = fromRef.current.getBoundingClientRect();
    const toRect = toRef.current.getBoundingClientRect();

    const startX =
      fromRect.left - containerRect.left + fromRect.width / 2 + startXOffset;
    const startY =
      fromRect.top - containerRect.top + fromRect.height / 2 + startYOffset;
    const endX =
      toRect.left - containerRect.left + toRect.width / 2 + endXOffset;
    const endY =
      toRect.top - containerRect.top + toRect.height / 2 + endYOffset;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    const dx = endX - startX;
    const dy = endY - startY;
    const controlX = midX - dy * curvature;
    const controlY = midY + dx * curvature;

    const path = `M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`;
    setPathD(path);
    setSvgDimensions({
      width: containerRect.width,
      height: containerRect.height,
    });
  }, [
    containerRef,
    fromRef,
    toRef,
    curvature,
    startXOffset,
    startYOffset,
    endXOffset,
    endYOffset,
  ]);

  React.useEffect(() => {
    updatePath();

    const resizeObserver = new ResizeObserver(updatePath);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updatePath);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePath);
    };
  }, [updatePath, containerRef]);

  return (
    <svg
      className={cn(
        "pointer-events-none absolute top-0 left-0 h-full w-full",
        className,
      )}
      width={svgDimensions.width}
      height={svgDimensions.height}
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id={`beam-gradient-bg-${uniqueId}`}
          gradientUnits="userSpaceOnUse"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor={gradientStartColor} stopOpacity="0.1" />
          <stop offset="50%" stopColor={gradientStartColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0.1" />
        </linearGradient>

        <linearGradient
          id={`beam-gradient-${uniqueId}`}
          gradientUnits="userSpaceOnUse"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor={gradientStartColor} stopOpacity="0" />
          <stop offset="5%" stopColor={gradientStartColor} stopOpacity="1" />
          <stop offset="50%" stopColor={gradientStopColor} stopOpacity="1" />
          <stop offset="95%" stopColor={gradientStopColor} stopOpacity="1" />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </linearGradient>

        <filter
          id={`beam-glow-${uniqueId}`}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background path */}
      <path
        d={pathD}
        stroke={`url(#beam-gradient-bg-${uniqueId})`}
        strokeWidth={pathWidth}
        strokeLinecap="round"
        fill="none"
      />

      {/* Animated glowing beam */}
      <path
        d={pathD}
        stroke={`url(#beam-gradient-${uniqueId})`}
        strokeWidth={pathWidth}
        strokeLinecap="round"
        fill="none"
        filter={`url(#beam-glow-${uniqueId})`}
        className="animated-beam-path"
        style={{
          strokeDasharray: "20 1000",
          strokeDashoffset: reverse ? "-1000" : "1000",
          animation: `beam-dash ${duration}s linear infinite`,
          animationDelay: `${delay}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      />
    </svg>
  );
};

export { AnimatedBeam, type AnimatedBeamProps };
