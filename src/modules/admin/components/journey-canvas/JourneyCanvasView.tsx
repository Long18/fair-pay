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
  SearchIcon,
} from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { JourneyNode } from "./JourneyNode";
import { JourneySourceNode } from "./JourneySourceNode";
import { JourneyEdge } from "./JourneyEdge";
import { JourneyNodeDetailPanel } from "./JourneyNodeDetail";
import { useJourneyGraph } from "./use-journey-graph";
import { useGraphPathHighlight } from "./use-graph-path-highlight";
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

function FitViewOnLoad({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodeCount > 0) {
      const timer = setTimeout(() => fitView({ duration: 300, padding: 0.2 }), 80);
      return () => clearTimeout(timer);
    }
  }, [nodeCount, fitView]);

  return null;
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
        onClick={() => fitView({ duration: 300, padding: 0.2 })}
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
  const { nodes, edges, isLoading } = useJourneyGraph({
    userId,
    sessionId,
    fromIso,
    toIso,
    eventNames,
    sourceName,
    entryLink,
  });

  const [search, setSearch] = useState("");
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

  const filteredBase = useMemo(() => {
    if (!search.trim()) return { nodes, edges };
    const q = search.trim().toLowerCase();
    const matchingIds = new Set<string>();
    for (const n of nodes) {
      if (n.type === "source") continue;
      const pagePath = (n.data as { pagePath?: string }).pagePath ?? "";
      if (pagePath.toLowerCase().includes(q)) matchingIds.add(n.id);
    }
    return {
      nodes: nodes.map((n) => ({
        ...n,
        hidden: n.type !== "source" && !matchingIds.has(n.id),
      })),
      edges: edges.map((e) => ({
        ...e,
        hidden: !matchingIds.has(e.target) && !e.source.startsWith("__source__"),
      })),
    };
  }, [nodes, edges, search]);

  const highlighted = useGraphPathHighlight(
    filteredBase.nodes,
    filteredBase.edges,
    pathSteps,
    activeStepIndex,
  );

  useEffect(() => {
    setRfNodes(highlighted.nodes);
    setRfEdges(highlighted.edges);
  }, [highlighted.nodes, highlighted.edges, setRfNodes, setRfEdges]);

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
    () => nodes.filter((node) => node.type !== "source" && !node.hidden).length,
    [nodes],
  );

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col ${className ?? ""}`}>
      <div className="absolute left-3 top-3 z-10 w-[min(240px,calc(100%-1.5rem))]">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tAdmin("journey.canvas.filterPages")}
            className="h-8 border-border/70 bg-card/90 pl-8 text-xs backdrop-blur-md"
          />
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-surface-overlay" data-slot="journey-canvas">
        <style>{CANVAS_STYLES}</style>
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground" aria-busy="true">
            <Loader2Icon className="mr-2 h-5 w-5 animate-spin" />
            {tAdmin("journey.canvas.loading")}
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center">
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
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            className="journey-canvas h-full w-full"
          >
            <FitViewOnLoad nodeCount={nodes.length} />
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
        {tAdmin("journey.canvas.description", { pages: pageNodeCount, edges: edges.length })}
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
