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

const nodeTypes = { journey: JourneyNode, source: JourneySourceNode } as const;
const edgeTypes = { journey: JourneyEdge } as const;

const CANVAS_STYLES = `
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(182,160,255,0.4), 0 0 40px rgba(119,161,255,0.2); }
  50% { box-shadow: 0 0 30px rgba(182,160,255,0.65), 0 0 60px rgba(119,161,255,0.35); }
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
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 p-1.5 bg-[#131313]/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
      <button
        type="button"
        onClick={() => zoomIn({ duration: 200 })}
        className="w-9 h-9 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all"
        title="Phóng to"
      >
        <ZoomInIcon size={18} />
      </button>
      <button
        type="button"
        onClick={() => zoomOut({ duration: 200 })}
        className="w-9 h-9 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all"
        title="Thu nhỏ"
      >
        <ZoomOutIcon size={18} />
      </button>
      <div className="w-px h-4 bg-white/10 mx-0.5" />
      <button
        type="button"
        onClick={() => fitView({ duration: 300, padding: 0.2 })}
        className="w-9 h-9 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all"
        title="Fit view"
      >
        <MaximizeIcon size={18} />
      </button>
      <button
        type="button"
        onClick={onToggleMinimap}
        className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
          showMinimap ? "text-violet-300 bg-white/10" : "text-white/50 hover:text-white hover:bg-white/10"
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
      <div className="flex items-center justify-center h-[680px] bg-[#0e0e0e] rounded-lg text-white/50">
        <Loader2Icon className="mr-2 h-5 w-5 animate-spin" />
        Đang tải journey graph...
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[680px] bg-[#0e0e0e] rounded-lg">
        <Empty className="min-h-[320px]">
          <EmptyMedia variant="icon">
            <ActivityIcon className="h-6 w-6 text-white/40" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle className="text-white/70">Chưa có dữ liệu journey</EmptyTitle>
            <EmptyDescription className="text-white/40">
              Không tìm thấy dữ liệu trong khoảng thời gian đã chọn.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      </div>
    );
  }

  return (
    <div className="relative h-[680px] bg-[#0e0e0e] rounded-lg overflow-hidden border border-white/5">
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
          color="rgba(255,255,255,0.07)"
          style={{ backgroundColor: "#0e0e0e" }}
        />
        {showMinimap && (
          <MiniMap
            nodeColor={(node) => {
              const d = node.data as Record<string, unknown>;
              if (node.type === "source") return "#f59e0b";
              return d?.isLastSeen ? "#b6a0ff" : "#4a4a5a";
            }}
            nodeStrokeWidth={3}
            nodeBorderRadius={8}
            maskColor="rgba(0,0,0,0.7)"
            style={{ width: 160, height: 120 }}
            className="!bg-[#131313] !border-white/10"
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
