import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Globe2, Search, Share2, Link } from "lucide-react";
import { journeyPalette } from "./journey-theme";

export type JourneySourceNodeData = {
  sourceName: string;
  entryLink: string | null;
};

export type JourneySourceNodeType = Node<JourneySourceNodeData, "sourceNode">;

function getSourceIcon(sourceName: string): React.ReactNode {
  const lower = sourceName.toLowerCase();
  if (lower.includes("google") || lower.includes("bing") || lower.includes("search")) {
    return <Search size={14} className="text-accent" />;
  }
  if (
    lower.includes("facebook") ||
    lower.includes("twitter") ||
    lower.includes("instagram") ||
    lower.includes("tiktok") ||
    lower.includes("social")
  ) {
    return <Share2 size={14} className="text-accent" />;
  }
  if (lower.includes("referral") || lower.includes("ref") || lower.includes("http")) {
    return <Link size={14} className="text-accent" />;
  }
  // direct / unknown
  return <Globe2 size={14} className="text-accent" />;
}

const sourceHandleStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  background: "color-mix(in oklch, var(--accent) 28%, transparent)",
  border: "1px solid color-mix(in oklch, var(--accent) 48%, transparent)",
  borderRadius: "50%",
};

export const JourneySourceNode = memo(function JourneySourceNode({
  data,
}: NodeProps<JourneySourceNodeType>) {
  const { sourceName, entryLink } = data;

  return (
    <>
      <div
        className="select-none"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklch, ${journeyPalette.source} 14%, transparent) 0%, color-mix(in oklch, ${journeyPalette.sourceMuted} 10%, transparent) 100%)`,
          border: "1px solid color-mix(in oklch, var(--accent) 36%, transparent)",
          borderRadius: "999px",
          padding: "6px 14px",
          minWidth: "120px",
          maxWidth: "200px",
          boxShadow: "0 0 12px color-mix(in oklch, var(--accent) 18%, transparent), 0 2px 8px color-mix(in oklch, var(--foreground) 22%, transparent)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-2">
          {getSourceIcon(sourceName)}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold leading-tight text-accent">
              {sourceName}
            </p>
            {entryLink && (
              <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground">
                {entryLink.length > 28 ? "…" + entryLink.slice(-26) : entryLink}
              </p>
            )}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={sourceHandleStyle}
      />
    </>
  );
});
