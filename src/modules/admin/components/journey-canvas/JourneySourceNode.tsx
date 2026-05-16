import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Globe2, Search, Share2, Link2, ArrowDownToLine } from "lucide-react";
import { journeyPalette } from "./journey-theme";

export type JourneySourceNodeData = {
  sourceName: string;
  entryLink: string | null;
};

export type JourneySourceNodeType = Node<JourneySourceNodeData, "sourceNode">;

function getSourceIcon(sourceName: string): React.ReactNode {
  const lower = sourceName.toLowerCase();
  if (lower.includes("google") || lower.includes("bing") || lower.includes("search")) {
    return <Search size={13} />;
  }
  if (
    lower.includes("facebook") ||
    lower.includes("twitter") ||
    lower.includes("instagram") ||
    lower.includes("tiktok") ||
    lower.includes("social")
  ) {
    return <Share2 size={13} />;
  }
  if (lower.includes("referral") || lower.includes("ref") || lower.includes("http")) {
    return <Link2 size={13} />;
  }
  return <Globe2 size={13} />;
}

const sourceHandleStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  background: "color-mix(in oklch, var(--accent) 20%, var(--card))",
  border: "1.5px solid color-mix(in oklch, var(--accent) 55%, transparent)",
  borderRadius: "50%",
  boxShadow: "0 0 0 2px color-mix(in oklch, var(--background) 90%, transparent), 0 0 8px color-mix(in oklch, var(--accent) 28%, transparent)",
};

export const JourneySourceNode = memo(function JourneySourceNode({ data }: NodeProps<JourneySourceNodeType>) {
  const { sourceName, entryLink } = data;

  return (
    <>
      <div
        className="select-none overflow-hidden rounded-2xl border"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklch, ${journeyPalette.source} 12%, var(--card)) 0%, color-mix(in oklch, ${journeyPalette.sourceMuted} 8%, var(--card)) 100%)`,
          borderColor: `color-mix(in oklch, var(--accent) 32%, transparent)`,
          minWidth: "130px",
          maxWidth: "210px",
          boxShadow: `0 0 0 1px color-mix(in oklch, var(--accent) 10%, transparent), 0 4px 16px color-mix(in oklch, var(--foreground) 12%, transparent)`,
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-1 border-b border-accent/15 px-3 py-1.5">
          <ArrowDownToLine size={9} className="text-accent/60" />
          <span className="text-[8.5px] font-medium uppercase tracking-widest text-accent/60">Entry</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5">
          <div
            className="flex shrink-0 items-center justify-center rounded-lg"
            style={{
              width: 28,
              height: 28,
              background: `color-mix(in oklch, var(--accent) 16%, transparent)`,
              color: `var(--accent)`,
            }}
          >
            {getSourceIcon(sourceName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold leading-tight text-foreground">
              {sourceName}
            </p>
            {entryLink && (
              <p className="mt-0.5 truncate text-[9px] leading-tight text-muted-foreground">
                {entryLink.length > 26 ? "…" + entryLink.slice(-24) : entryLink}
              </p>
            )}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={sourceHandleStyle} />
    </>
  );
});
