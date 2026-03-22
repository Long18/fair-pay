import { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";

type JourneyEdgeData = { frequency: number };
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
          <stop offset="0%" stopColor="#b6a0ff" />
          <stop offset="100%" stopColor="#77a1ff" />
        </linearGradient>
      </defs>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: `url(#${gradientId})`,
          strokeWidth,
          filter: "drop-shadow(0 0 4px rgba(119, 161, 255, 0.3))",
        }}
      />
      <foreignObject
        x={labelX - 20}
        y={labelY - 12}
        width={40}
        height={24}
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
          }}
        >
          <span className="bg-white/10 text-white/60 text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap">
            {frequency}
          </span>
        </div>
      </foreignObject>
    </>
  );
}

export const JourneyEdge = memo(JourneyEdgeComponent);
