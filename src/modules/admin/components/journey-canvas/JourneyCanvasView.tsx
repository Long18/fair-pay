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
import { JourneyNodeDetailPanel } from "./JourneyNodeDetail";
import { FocusActivePathNode } from "./FocusActivePathNode";
import { useJourneyGraph } from "./use-journey-graph";
import { useGraphPathHighlight } from "./use-graph-path-highlight";
import { buildFallbackGraphFromPath } from "./journey-fallback-graph";
import { journeyPalette } from "./journey-theme";
import type { JourneyPathStep } from "./journey-path";
import { useAdminTranslation } from "../../i18n";

const nodeTypes = { journey: JourneyNode, source: JourneySourceNode } as const;
const edgeTypes = { journey: JourneyEdge } as const;

const CANVAS_STYLES = `
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 18px color-mix(in oklch, var(--primary) 22%, transparent); }
  50% { box-shadow: 0 0 28px color-mix(in oklch, var(--primary) 34%, transparent); }
}
@keyframes journey-edge-dash {
  to { stroke-dashoffset: -20; }
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
  pathSteps: JourneyPathStep[];
  activeStepIndex: number;
  className?: string;
}

function CanvasToolbar({
  showMinimap,
  onToggleMinimap,
}: {
  showMinimap: boolean;
  onToggleMinimap: () => void;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { tAdmin } = useAdminTranslation();

  return (
    <div
      className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border p-1.5 shadow-2xl backdrop-blur-xl"
      style={{
        backgroundColor: journeyPalette.glassBg,
        borderColor: journeyPalette.glassBorder,
      }}
    >
      <button
        type="button"
        onClick={() => zoomIn({ duration: 200 })}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={tAdmin("journey.canvas.zoomIn")}
        aria-label={tAdmin("journey.canvas.zoomIn")}
      >
        <ZoomInIcon size={16} />
      </button>
      <button
        type="button"
        onClick={() => zoomOut({ duration: 200 })}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={tAdmin("journey.canvas.zoomOut")}
        aria-label={tAdmin("journey.canvas.zoomOut")}
      >
        <ZoomOutIcon size={16} />
      </button>
      <div className="mx-0.5 h-4 w-px bg-border/80" />
      <button
        type="button"
        onClick={() => void fitView({ duration: 300, padding: 0.25 })}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={tAdmin("journey.canvas.fitView")}
        aria-label={tAdmin("journey.canvas.fitView")}
      >
        <MaximizeIcon size={16} />
      </button>
      <button
        type="button"
        onClick={onToggleMinimap}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          showMinimap ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        title={tAdmin("journey.canvas.minimap")}
        aria-label={tAdmin("journey.canvas.minimap")}
        aria-pressed={showMinimap}
      >
        <MapIcon size={16} />
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
  pathSteps,
  activeStepIndex,
  className,
}: JourneyCanvasViewProps) {
  const { tAdmin } = useAdminTranslation();
  const { nodes: rpcNodes, edges: rpcEdges, isLoading } = useJourneyGraph({
    userId,
    sessionId,
    fromIso,
    toIso,
    eventNames,
    sourceName,
    entryLink,
  });

  const fallbackGraph = useMemo(
    () => buildFallbackGraphFromPath(pathSteps, sourceName, entryLink),
    [pathSteps, sourceName, entryLink],
  );

  const baseNodes = rpcNodes.length > 0 ? rpcNodes : fallbackGraph.nodes;
  const baseEdges = rpcNodes.length > 0 ? rpcEdges : fallbackGraph.edges;
  const hasGraph = baseNodes.length > 0;

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [showMinimap, setShowMinimap] = useState(true);
  const [selectedNode, setSelectedNode] = useState<{
    pagePath: string;
    visitCount: number;
    lastVisitedAt: string;
    eventTypes: string[];
    avgDurationSeconds: number | null;
  } | null>(null);

  const highlighted = useGraphPathHighlight(
    baseNodes,
    baseEdges,
    pathSteps,
    activeStepIndex,
  );

  const activePagePath = pathSteps[activeStepIndex]?.pagePath ?? null;

  const graphSignature = useMemo(
    () => `${sessionId}::${baseNodes.map((node) => node.id).join("|")}`,
    [sessionId, baseNodes],
  );

  useEffect(() => {
    setRfNodes(highlighted.nodes);
    setRfEdges(highlighted.edges);
  }, [highlighted.nodes, highlighted.edges, graphSignature, setRfNodes, setRfEdges]);

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

  const pageNodeCount = useMemo(
    () => baseNodes.filter((node) => node.type !== "source").length,
    [baseNodes],
  );

  return (
    <div className={`relative flex h-full min-h-[380px] flex-col ${className ?? ""}`}>
      <div
        className="relative h-full min-h-[380px] flex-1 overflow-hidden bg-surface-overlay"
        data-slot="journey-canvas"
      >
        <style>{CANVAS_STYLES}</style>
        {isLoading ? (
          <div className="flex h-full min-h-[380px] items-center justify-center text-muted-foreground" aria-busy="true">
            <Loader2Icon className="mr-2 h-5 w-5 animate-spin" />
            {tAdmin("journey.canvas.loading")}
          </div>
        ) : !hasGraph ? (
          <div className="flex h-full min-h-[380px] items-center justify-center">
            <Empty className="min-h-[200px]">
              <EmptyMedia variant="icon">
                <ActivityIcon className="h-5 w-5 text-muted-foreground" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>{tAdmin("journey.canvas.emptyTitle")}</EmptyTitle>
                <EmptyDescription>{tAdmin("journey.canvas.emptyDescription")}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent />
            </Empty>
          </div>
        ) : (
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={onNodeClick}
            nodesDraggable
            snapToGrid
            snapGrid={[16, 16]}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            className="journey-canvas !h-full !w-full !min-h-[380px]"
          >
            <FocusActivePathNode
              key={graphSignature}
              activePagePath={activePagePath}
              activeStepIndex={activeStepIndex}
            />
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1.5}
              color={journeyPalette.dotGrid}
            />
            {showMinimap ? (
              <MiniMap
                nodeColor={(node) => {
                  const d = node.data as Record<string, unknown>;
                  if (node.type === "source") return journeyPalette.source;
                  if (d?.pathState === "active") return journeyPalette.highlight;
                  if (d?.pathState === "visited") return journeyPalette.highlightAlt;
                  return journeyPalette.neutral;
                }}
                nodeStrokeWidth={3}
                nodeBorderRadius={8}
                maskColor={journeyPalette.minimapMask}
                style={{ width: 160, height: 110 }}
                className="!border-border/70 !bg-card/90 !shadow-md"
                pannable
                zoomable
              />
            ) : null}
            <CanvasToolbar showMinimap={showMinimap} onToggleMinimap={() => setShowMinimap((v) => !v)} />
          </ReactFlow>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {tAdmin("journey.canvas.description", { pages: pageNodeCount, edges: baseEdges.length })}
      </p>

      <JourneyNodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
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
