import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Loader2Icon,
  ZoomInIcon,
  ZoomOutIcon,
  MaximizeIcon,
  MapIcon,
  ActivityIcon,
} from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { JourneyNode } from "./JourneyNode";
import { JourneySourceNode } from "./JourneySourceNode";
import { JourneyEdge } from "./JourneyEdge";
import { JourneyNodeDetail } from "./JourneyNodeDetail";
import { useJourneyGraph } from "./use-journey-graph";
import { journeyPalette } from "./journey-theme";

const nodeTypes = { journey: JourneyNode, source: JourneySourceNode } as const;
const edgeTypes = { journey: JourneyEdge } as const;

const CANVAS_STYLES = `
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 18px color-mix(in oklch, var(--primary) 22%, transparent); }
  50% { box-shadow: 0 0 28px color-mix(in oklch, var(--primary) 34%, transparent); }
}
.journey-node-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
`;

interface JourneyCanvasViewProps {
  userId: string | undefined;
  sessionId: string;
  fromIso: string | null;
  toIso: string | null;
  eventNames: string[] | null;
  sourceName?: string | null;
  entryLink?: string | null;
}

function CanvasToolbar({ showMinimap, onToggleMinimap }: { showMinimap: boolean; onToggleMinimap: () => void }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div
      className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border p-1.5 shadow-2xl backdrop-blur-xl"
      style={{
        backgroundColor: "color-mix(in oklch, var(--card) 72%, transparent)",
        borderColor: "color-mix(in oklch, var(--border) 70%, transparent)",
      }}
    >
      <button
        type="button"
        onClick={() => zoomIn({ duration: 200 })}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        title="Phóng to"
      >
        <ZoomInIcon size={18} />
      </button>
      <button
        type="button"
        onClick={() => zoomOut({ duration: 200 })}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        title="Thu nhỏ"
      >
        <ZoomOutIcon size={18} />
      </button>
      <div className="mx-0.5 h-4 w-px bg-border/80" />
      <button
        type="button"
        onClick={() => fitView({ duration: 300, padding: 0.2 })}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        title="Fit view"
      >
        <MaximizeIcon size={18} />
      </button>
      <button
        type="button"
        onClick={onToggleMinimap}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
          showMinimap ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        title="Minimap"
      >
        <MapIcon size={18} />
      </button>
    </div>
  );
}

function CanvasInner({ userId, sessionId, fromIso, toIso, eventNames, sourceName, entryLink }: JourneyCanvasViewProps) {
  const { nodes, edges, isLoading } = useJourneyGraph({
    userId,
    sessionId,
    fromIso,
    toIso,
    eventNames,
    sourceName,
    entryLink,
  });

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (nodes.length > 0) {
      setRfNodes(nodes);
      setRfEdges(edges);
    }
  }, [nodes, edges, setRfNodes, setRfEdges]);

  const [showMinimap, setShowMinimap] = useState(true);
  const [selectedNode, setSelectedNode] = useState<{
    pagePath: string;
    visitCount: number;
    lastVisitedAt: string;
    eventTypes: string[];
    avgDurationSeconds: number | null;
  } | null>(null);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    // Skip source nodes — they have no page stats
    if (node.type === "source") return;
    const d = node.data as Record<string, unknown>;
    setSelectedNode({
      pagePath: d.pagePath as string,
      visitCount: d.visitCount as number,
      lastVisitedAt: d.lastVisitedAt as string,
      eventTypes: d.eventTypes as string[],
      avgDurationSeconds: d.avgDurationSeconds as number | null,
    });
  }, []);

  const defaultEdgeOptions = useMemo(() => ({
    animated: false,
  }), []);

  if (isLoading) {
    return (
      <div className="flex h-[680px] items-center justify-center rounded-lg border bg-surface-overlay text-muted-foreground">
        <Loader2Icon className="mr-2 h-5 w-5 animate-spin" />
        Đang tải journey graph...
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex h-[680px] items-center justify-center rounded-lg border bg-surface-overlay">
        <Empty className="min-h-[320px]">
          <EmptyMedia variant="icon">
            <ActivityIcon className="h-6 w-6 text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Chưa có dữ liệu journey</EmptyTitle>
            <EmptyDescription>
              Không tìm thấy dữ liệu trong khoảng thời gian đã chọn.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      </div>
    );
  }

  return (
    <div className="relative h-[680px] overflow-hidden rounded-lg border bg-surface-overlay">
      <style>{CANVAS_STYLES}</style>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        defaultEdgeOptions={defaultEdgeOptions}
        nodesDraggable={true}
        snapToGrid={true}
        snapGrid={[16, 16]}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="journey-canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="color-mix(in oklch, var(--border) 50%, transparent)"
          style={{ backgroundColor: journeyPalette.canvas }}
        />
        {showMinimap && (
          <MiniMap
            nodeColor={(node) => {
              const d = node.data as Record<string, unknown>;
              if (node.type === "source") return journeyPalette.source;
              return d?.isLastSeen ? journeyPalette.highlight : journeyPalette.neutral;
            }}
            nodeStrokeWidth={3}
            nodeBorderRadius={8}
            maskColor={journeyPalette.minimapMask}
            style={{ width: 160, height: 120 }}
            className="!border-border/70 !bg-card/90"
            pannable
            zoomable
          />
        )}
        <CanvasToolbar
          showMinimap={showMinimap}
          onToggleMinimap={() => setShowMinimap((v) => !v)}
        />
      </ReactFlow>

      <JourneyNodeDetail
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}

export function JourneyCanvasView(props: JourneyCanvasViewProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
