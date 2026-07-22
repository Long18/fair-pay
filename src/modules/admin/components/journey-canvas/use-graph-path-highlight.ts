import { useMemo } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { JourneyPathStep } from "./journey-path";
import type { JourneyNodePathState } from "./journey-theme";

export function applyPathStateToGraph(
  nodes: Node[],
  edges: Edge[],
  pathSteps: JourneyPathStep[],
  activeStepIndex: number,
): { nodes: Node[]; edges: Edge[] } {
  if (pathSteps.length === 0) {
    return { nodes, edges };
  }

  const visitedPages = new Set(
    pathSteps.slice(0, activeStepIndex + 1).map((s) => s.pagePath),
  );
  const activePage = pathSteps[activeStepIndex]?.pagePath ?? null;
  const prevPage = activeStepIndex > 0 ? pathSteps[activeStepIndex - 1]?.pagePath : null;

  const nextNodes = nodes.map((node) => {
    if (node.type === "source") return node;
    const pagePath = (node.data as { pagePath?: string }).pagePath;
    if (!pagePath) return node;

    let pathState: JourneyNodePathState = "idle";
    const isLastSeen = (node.data as { isLastSeen?: boolean }).isLastSeen ?? false;

    if (pagePath === activePage) {
      pathState = "active";
    } else if (visitedPages.has(pagePath)) {
      pathState = "visited";
    } else if (isLastSeen) {
      pathState = "lastSeen";
    }

    return {
      ...node,
      data: {
        ...node.data,
        pathState,
        isLastSeen: isLastSeen && pathState === "lastSeen",
      },
    };
  });

  const activeEdgeKey =
    prevPage && activePage ? `${prevPage}->${activePage}` : null;

  const nextEdges = edges.map((edge) => {
    const key = `${edge.source}->${edge.target}`;
    const isActive = activeEdgeKey === key;
    const isVisited = pathSteps.some((step, i) => {
      if (i === 0) return false;
      const from = pathSteps[i - 1]?.pagePath;
      const to = step.pagePath;
      return `${from}->${to}` === key && i <= activeStepIndex;
    });

    return {
      ...edge,
      data: {
        ...(edge.data as object),
        isActive,
        isVisited,
      },
    };
  });

  return { nodes: nextNodes, edges: nextEdges };
}

export function useGraphPathHighlight(
  nodes: Node[],
  edges: Edge[],
  pathSteps: JourneyPathStep[],
  activeStepIndex: number,
) {
  return useMemo(
    () => applyPathStateToGraph(nodes, edges, pathSteps, activeStepIndex),
    [nodes, edges, pathSteps, activeStepIndex],
  );
}
