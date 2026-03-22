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
}) {
  const { userId, sessionId, fromIso, toIso, eventNames } = params;

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
      rankdir: "TB",
      nodesep: 80,
      ranksep: 120,
      marginx: 40,
      marginy: 40,
    });

    for (const node of graphData.nodes) {
      g.setNode(node.page_path, { width: 240, height: 120 });
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
        position: { x: pos.x - 120, y: pos.y - 60 },
        data: {
          pagePath: n.page_path,
          visitCount: n.visit_count,
          lastVisitedAt: n.last_visited_at,
          eventTypes: n.event_types,
          avgDurationSeconds: n.avg_duration_seconds,
          isLastSeen: false,
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

    return { nodes: rfNodes, edges: rfEdges, lastSeenNodeId: lastSeenId };
  }, [data]);

  return { nodes, edges, isLoading, lastSeenNodeId, rawData: data };
}
