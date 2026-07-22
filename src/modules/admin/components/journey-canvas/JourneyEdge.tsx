import { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";
import { journeyPalette } from "./journey-theme";

type JourneyEdgeData = {
  frequency: number;
  isActive?: boolean;
  isVisited?: boolean;
};

type JourneyEdge = Edge<JourneyEdgeData>;

function JourneyEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<JourneyEdge>) {
  const frequency = data?.frequency ?? 1;
  const isActive = data?.isActive ?? false;
  const isVisited = data?.isVisited ?? false;
  const strokeWidth = Math.max(1.5, Math.min(6, Math.log2(frequency + 1) * 1.5));
  const gradientId = `gradient-${id}`;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={journeyPalette.highlight} />
          <stop offset="100%" stopColor={journeyPalette.highlightAlt} />
        </linearGradient>
      </defs>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: isActive || isVisited ? `url(#${gradientId})` : journeyPalette.neutral,
          strokeWidth: isActive ? strokeWidth + 1 : strokeWidth,
          strokeOpacity: isActive ? 1 : isVisited ? 0.85 : 0.45,
          filter: isActive
            ? "drop-shadow(0 0 6px color-mix(in oklch, var(--primary) 35%, transparent))"
            : undefined,
          strokeDasharray: isActive ? "6 4" : undefined,
          animation: isActive ? "journey-edge-dash 0.6s linear infinite" : undefined,
        }}
      />
      {frequency > 1 ? (
        <foreignObject
          x={labelX - 20}
          y={labelY - 12}
          width={40}
          height={24}
          style={{ overflow: "visible" }}
        >
          <div className="flex h-full w-full items-center justify-center">
            <span className="whitespace-nowrap rounded-full border border-border/70 bg-card/90 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {frequency}
            </span>
          </div>
        </foreignObject>
      ) : null}
    </>
  );
}

export const JourneyEdge = memo(JourneyEdgeComponent);
