import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
import type {
  JourneyGraphResponse,
  JourneyGraphNode,
  JourneyGraphEdge,
} from "../../types";
import Dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";

export function useJourneyGraph(params: {
  userId: string | undefined;
  sessionId: string | null;
  fromIso: string | null;
  toIso: string | null;
  eventNames: string[] | null;
  sourceName?: string | null;
  entryLink?: string | null;
}) {
  const { userId, sessionId, fromIso, toIso, eventNames, sourceName, entryLink } = params;

  const { data, isLoading } = useQuery({
    queryKey: [
      "admin",
      "journey-graph",
      userId,
      sessionId,
      fromIso,
      toIso,
      eventNames,
    ],
    enabled: !!userId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("admin_get_user_journey_graph", {
        p_user_id: userId,
        p_session_id: sessionId !== "all" ? sessionId : null,
        p_from: fromIso,
        p_to: toIso,
        p_event_names: eventNames,
      });
      if (error) throw error;
      return data as unknown as JourneyGraphResponse;
    },
  });

  const { nodes, edges, lastSeenNodeId } = useMemo(() => {
    const graphData = data as JourneyGraphResponse | undefined;

    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      return { nodes: [] as Node[], edges: [] as Edge[], lastSeenNodeId: null };
    }

    const g = new Dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
      rankdir: "LR",
      nodesep: 60,
      ranksep: 140,
      marginx: 48,
      marginy: 48,
    });

    const NODE_WIDTH = 280;
    const NODE_HEIGHT = 150;

    for (const node of graphData.nodes) {
      g.setNode(node.page_path, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }

    for (const edge of graphData.edges) {
      g.setEdge(edge.source, edge.target);
    }

    Dagre.layout(g);

    const rfNodes: Node[] = graphData.nodes.map((n: JourneyGraphNode) => {
      const pos = g.node(n.page_path);
      return {
        id: n.page_path,
        type: "journey",
        position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
        data: {
          pagePath: n.page_path,
          visitCount: n.visit_count,
          lastVisitedAt: n.last_visited_at,
          eventTypes: n.event_types,
          avgDurationSeconds: n.avg_duration_seconds,
          isLastSeen: false,
          pathState: "idle" as const,
        },
      };
    });

    let lastSeenId: string | null = null;
    let maxTime: string | null = null;
    for (const n of graphData.nodes) {
      if (maxTime === null || n.last_visited_at > maxTime) {
        maxTime = n.last_visited_at;
        lastSeenId = n.page_path;
      }
    }

    if (lastSeenId !== null) {
      const target = rfNodes.find((n) => n.id === lastSeenId);
      if (target) {
        target.data = { ...target.data, isLastSeen: true };
      }
    }

    const rfEdges: Edge[] = graphData.edges.map(
      (e: JourneyGraphEdge, i: number) => ({
        id: `e-${i}-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        type: "journey",
        data: { frequency: e.frequency },
      })
    );

    // Find root nodes (nodes with no incoming edges)
    const targetSet = new Set(graphData.edges.map((e) => e.target));
    const rootNodeIds = graphData.nodes.reduce<typeof graphData.nodes[number]["page_path"][]>((acc, n) => {
      if (!targetSet.has(n.page_path)) acc.push(n.page_path);
      return acc;
    }, []);

    // Add synthetic source nodes above each root node
    const sourceLabel = sourceName ?? "direct";
    for (const rootId of rootNodeIds) {
      const rootNode = rfNodes.find((n) => n.id === rootId);
      if (!rootNode) continue;

      const sourceNodeId = `__source__${rootId}`;
      const sourceNode: Node = {
        id: sourceNodeId,
        type: "source",
        position: {
          x: rootNode.position.x - 180,
          y: rootNode.position.y + NODE_HEIGHT / 2 - 40,
        },
        data: {
          sourceName: sourceLabel,
          entryLink: entryLink ?? null,
        },
      };

      rfNodes.push(sourceNode);
      rfEdges.push({
        id: `e-source-${rootId}`,
        source: sourceNodeId,
        target: rootId,
        type: "journey",
        data: { frequency: 1 },
      });
    }

    return { nodes: rfNodes, edges: rfEdges, lastSeenNodeId: lastSeenId };
  }, [data, sourceName, entryLink]);

  return { nodes, edges, isLoading, lastSeenNodeId, rawData: data };
}
