import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Globe2, Search, Share2, Link } from "lucide-react";

export type JourneySourceNodeData = {
  sourceName: string;
  entryLink: string | null;
};

export type JourneySourceNodeType = Node<JourneySourceNodeData, "sourceNode">;

function getSourceIcon(sourceName: string): React.ReactNode {
  const lower = sourceName.toLowerCase();
  if (lower.includes("google") || lower.includes("bing") || lower.includes("search")) {
    return <Search size={14} className="text-amber-300" />;
  }
  if (
    lower.includes("facebook") ||
    lower.includes("twitter") ||
    lower.includes("instagram") ||
    lower.includes("tiktok") ||
    lower.includes("social")
  ) {
    return <Share2 size={14} className="text-amber-300" />;
  }
  if (lower.includes("referral") || lower.includes("ref") || lower.includes("http")) {
    return <Link size={14} className="text-amber-300" />;
  }
  // direct / unknown
  return <Globe2 size={14} className="text-amber-300" />;
}

const sourceHandleStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  background: "rgba(251,191,36,0.3)",
  border: "1px solid rgba(251,191,36,0.5)",
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
          background: "linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.08) 100%)",
          border: "1px solid rgba(251,191,36,0.35)",
          borderRadius: "999px",
          padding: "6px 14px",
          minWidth: "120px",
          maxWidth: "200px",
          boxShadow: "0 0 12px rgba(251,191,36,0.15), 0 2px 8px rgba(0,0,0,0.4)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-2">
          {getSourceIcon(sourceName)}
          <div className="min-w-0 flex-1">
            <p className="text-amber-200 text-xs font-semibold leading-tight truncate">
              {sourceName}
            </p>
            {entryLink && (
              <p className="text-amber-200/50 text-[10px] leading-tight truncate mt-0.5">
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
