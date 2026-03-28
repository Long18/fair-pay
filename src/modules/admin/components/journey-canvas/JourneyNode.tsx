import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Eye, MousePointerClick, FileText, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { journeyGradient, journeyMutedGradient, journeyPalette } from "./journey-theme";

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

const EVENT_ICON_MAP: Record<string, React.ReactNode> = {
  page_view: <Eye size={12} className="text-primary" />,
  click: <MousePointerClick size={12} className="text-status-info" />,
  form: <FileText size={12} className="text-semantic-positive" />,
};

function getEventIcon(eventType: string): React.ReactNode {
  for (const [key, icon] of Object.entries(EVENT_ICON_MAP)) {
    if (eventType.toLowerCase().includes(key)) return icon;
  }
  return <Eye size={12} className="text-muted-foreground" />;
}

const handleStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  background: "color-mix(in oklch, var(--card) 85%, transparent)",
  border: "1px solid color-mix(in oklch, var(--border) 88%, transparent)",
  borderRadius: "50%",
};

const PULSE_GLOW_STYLE: React.CSSProperties = {
  boxShadow: journeyPalette.highlightShadow,
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
          "overflow-hidden rounded-xl border bg-card/90 shadow-2xl backdrop-blur-xl",
          "min-w-[240px] max-w-[300px] select-none",
          isLastSeen ? "journey-node-glow border-primary/40" : "border-border/70",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          ...(isLastSeen ? PULSE_GLOW_STYLE : undefined),
          boxShadow: isLastSeen ? journeyPalette.highlightShadow : journeyPalette.softShadow,
        }}
      >
        {/* Top gradient bar */}
        <div
          className="h-0.5 w-full"
          style={{
            background: isLastSeen ? journeyGradient : journeyMutedGradient,
          }}
        />

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <p
                className="break-all text-xs font-mono font-medium leading-snug text-foreground"
                title={pagePath}
              >
                {pagePath}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                title={`Open ${pagePath}`}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(pagePath, "_blank", "noopener,noreferrer");
                }}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink size={12} />
              </button>
              <Badge
                variant="secondary"
                className="border-border/70 bg-muted text-[10px] text-muted-foreground"
              >
                {visitCount}
              </Badge>
            </div>
          </div>

          {/* Duration + time */}
          <div className="mb-3 flex items-center justify-between text-[11px] text-muted-foreground">
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
                  className="flex items-center gap-1 rounded-md border border-border/70 bg-muted/70 px-1.5 py-0.5"
                >
                  {getEventIcon(et)}
                  <span className="text-[10px] leading-none text-muted-foreground">
                    {et.length > 12 ? et.slice(0, 12) + "…" : et}
                  </span>
                </span>
              ))}
              {eventTypes.length > 6 && (
                <span className="text-[10px] text-muted-foreground">
                  +{eventTypes.length - 6}
                </span>
              )}
            </div>
          )}

          {/* Last-seen indicator */}
          {isLastSeen && (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              <span className="text-[10px] font-medium text-primary">
                Last seen here
              </span>
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={handleStyle}
      />
    </>
  );
});
