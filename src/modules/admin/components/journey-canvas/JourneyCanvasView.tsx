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
  GitBranchIcon,
} from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JourneyNode } from "./JourneyNode";
import { JourneySourceNode } from "./JourneySourceNode";
import { JourneyEdge } from "./JourneyEdge";
import { JourneyNodeDetail } from "./JourneyNodeDetail";
import { useJourneyGraph } from "./use-journey-graph";
import { journeyPalette } from "./journey-theme";
import { useAdminTranslation } from "../../i18n";

const nodeTypes = { journey: JourneyNode, source: JourneySourceNode } as const;
const edgeTypes = { journey: JourneyEdge } as const;

const CANVAS_HEIGHT = "min-h-[calc(100vh-320px)] h-[calc(100vh-320px)]";

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

function FitViewOnLoad({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodeCount > 0) {
      const timer = setTimeout(() => fitView({ duration: 300, padding: 0.25 }), 80);
      return () => clearTimeout(timer);
    }
  }, [nodeCount, fitView]);

  return null;
}

function CanvasToolbar({ showMinimap, onToggleMinimap }: { showMinimap: boolean; onToggleMinimap: () => void }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { tAdmin } = useAdminTranslation();

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
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={tAdmin("journey.canvas.zoomIn")}
        aria-label={tAdmin("journey.canvas.zoomIn")}
      >
        <ZoomInIcon size={18} />
      </button>
      <button
        type="button"
        onClick={() => zoomOut({ duration: 200 })}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={tAdmin("journey.canvas.zoomOut")}
        aria-label={tAdmin("journey.canvas.zoomOut")}
      >
        <ZoomOutIcon size={18} />
      </button>
      <div className="mx-0.5 h-4 w-px bg-border/80" />
      <button
        type="button"
        onClick={() => fitView({ duration: 300, padding: 0.25 })}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={tAdmin("journey.canvas.fitView")}
        aria-label={tAdmin("journey.canvas.fitView")}
      >
        <MaximizeIcon size={18} />
      </button>
      <button
        type="button"
        onClick={onToggleMinimap}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          showMinimap ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        title={tAdmin("journey.canvas.minimap")}
        aria-label={tAdmin("journey.canvas.minimap")}
        aria-pressed={showMinimap}
      >
        <MapIcon size={18} />
      </button>
    </div>
  );
}

function CanvasInner({
  userId,
  sessionId,
  fromIso,
  toIso,
  eventNames,
  sourceName,
  entryLink,
}: JourneyCanvasViewProps) {
  const { tAdmin } = useAdminTranslation();
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
    setRfNodes(nodes);
    setRfEdges(edges);
  }, [nodes, edges, setRfNodes, setRfEdges]);

  const [showMinimap, setShowMinimap] = useState(true);
  const [selectedNode, setSelectedNode] = useState<{
    pagePath: string;
    visitCount: number;
    lastVisitedAt: string;
    eventTypes: string[];
    avgDurationSeconds: number | null;
  } | null>(null);

  const pageNodeCount = useMemo(
    () => nodes.filter((node) => node.type !== "source").length,
    [nodes],
  );

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
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

  const canvasBody = (() => {
    if (isLoading) {
      return (
        <div
          className={`flex ${CANVAS_HEIGHT} items-center justify-center bg-muted/20 text-muted-foreground`}
          data-slot="journey-canvas"
          aria-busy="true"
        >
          <Loader2Icon className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
          {tAdmin("journey.canvas.loading")}
        </div>
      );
    }

    if (nodes.length === 0) {
      return (
        <div
          className={`flex ${CANVAS_HEIGHT} items-center justify-center bg-muted/20`}
          data-slot="journey-canvas"
        >
          <Empty className="min-h-[320px]">
            <EmptyMedia variant="icon">
              <ActivityIcon className="h-6 w-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>{tAdmin("journey.canvas.emptyTitle")}</EmptyTitle>
              <EmptyDescription>
                {tAdmin("journey.canvas.emptyDescription")}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent />
          </Empty>
        </div>
      );
    }

    return (
      <div
        className={`relative ${CANVAS_HEIGHT} overflow-hidden bg-muted/10`}
        data-slot="journey-canvas"
      >
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
          nodesDraggable
          snapToGrid
          snapGrid={[16, 16]}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.15}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="journey-canvas"
        >
          <FitViewOnLoad nodeCount={nodes.length} />
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="color-mix(in oklch, var(--border) 55%, transparent)"
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
              style={{ width: 180, height: 130 }}
              className="!border-border/70 !bg-card/90 !shadow-md"
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
  })();

  return (
    <Card className="overflow-hidden" data-slot="journey-canvas-layout">
      <CardHeader className="border-b bg-card/50 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <GitBranchIcon className="h-4 w-4 text-primary" aria-hidden="true" />
          {tAdmin("journey.canvas.title")}
        </CardTitle>
        <CardDescription>
          {isLoading
            ? tAdmin("journey.canvas.loading")
            : tAdmin("journey.canvas.description", {
                pages: pageNodeCount,
                edges: edges.length,
              })}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">{canvasBody}</CardContent>
    </Card>
  );
}

export function JourneyCanvasView(props: JourneyCanvasViewProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
