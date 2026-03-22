import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Eye, MousePointerClick, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type JourneyNodeData = {
  pagePath: string;
  visitCount: number;
  lastVisitedAt: string;
  eventTypes: string[];
  avgDurationSeconds: number | null;
  isLastSeen: boolean;
};

export type JourneyNodeType = Node<JourneyNodeData, "journeyNode">;

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function truncatePath(path: string, maxLen = 28): string {
  if (path.length <= maxLen) return path;
  return "…" + path.slice(-(maxLen - 1));
}

const EVENT_ICON_MAP: Record<string, React.ReactNode> = {
  page_view: <Eye size={12} className="text-violet-300" />,
  click: <MousePointerClick size={12} className="text-blue-300" />,
  form: <FileText size={12} className="text-emerald-300" />,
};

function getEventIcon(eventType: string): React.ReactNode {
  for (const [key, icon] of Object.entries(EVENT_ICON_MAP)) {
    if (eventType.toLowerCase().includes(key)) return icon;
  }
  return <Eye size={12} className="text-white/40" />;
}

const handleStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  background: "rgba(255,255,255,0.15)",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: "50%",
};

const PULSE_GLOW_STYLE: React.CSSProperties = {
  boxShadow:
    "0 0 20px rgba(182,160,255,0.4), 0 0 40px rgba(119,161,255,0.2)",
};

export const JourneyNode = memo(function JourneyNode({
  data,
}: NodeProps<JourneyNodeType>) {
  const {
    pagePath,
    visitCount,
    lastVisitedAt,
    eventTypes,
    avgDurationSeconds,
    isLastSeen,
  } = data;

  const relativeTime = (() => {
    try {
      const diff = Date.now() - new Date(lastVisitedAt).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch {
      return lastVisitedAt;
    }
  })();

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={handleStyle}
      />

      <div
        className={[
          "backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 shadow-2xl",
          "min-w-[200px] max-w-[240px] select-none",
          isLastSeen ? "journey-node-glow border-violet-400/40" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={isLastSeen ? PULSE_GLOW_STYLE : undefined}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span
            className="text-white/90 text-xs font-mono font-medium leading-tight truncate flex-1"
            title={pagePath}
          >
            {truncatePath(pagePath)}
          </span>
          <Badge
            variant="secondary"
            className="bg-white/10 text-white/70 border-white/10 text-[10px] px-1.5 py-0 shrink-0"
          >
            {visitCount}
          </Badge>
        </div>

        {/* Duration + time */}
        <div className="flex items-center justify-between text-[11px] text-white/50 mb-3">
          <span>{formatDuration(avgDurationSeconds)}</span>
          <span>{relativeTime}</span>
        </div>

        {/* Event type icons */}
        {eventTypes.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {eventTypes.slice(0, 6).map((et, i) => (
              <span
                key={i}
                title={et}
                className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-md px-1.5 py-0.5"
              >
                {getEventIcon(et)}
                <span className="text-[10px] text-white/40 leading-none">
                  {et.length > 10 ? et.slice(0, 10) + "…" : et}
                </span>
              </span>
            ))}
            {eventTypes.length > 6 && (
              <span className="text-[10px] text-white/30">
                +{eventTypes.length - 6}
              </span>
            )}
          </div>
        )}

        {/* Last-seen indicator */}
        {isLastSeen && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-[10px] text-violet-300/80 font-medium">
              Last seen here
            </span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={handleStyle}
      />
    </>
  );
});
