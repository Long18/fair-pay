import type { Edge, Node } from "@xyflow/react";
import type { JourneyPathStep } from "./journey-path";

const NODE_WIDTH = 280;
const NODE_HEIGHT = 150;
const H_GAP = 140;

/** Linear LR graph from path steps when the journey-graph RPC returns no nodes. */
export function buildFallbackGraphFromPath(
  pathSteps: JourneyPathStep[],
  sourceName?: string | null,
  entryLink?: string | null,
): { nodes: Node[]; edges: Edge[] } {
  if (!pathSteps.length) {
    return { nodes: [], edges: [] };
  }

  const pageMeta = new Map<
    string,
    { visitCount: number; lastVisitedAt: string; eventTypes: Set<string> }
  >();

  for (const step of pathSteps) {
    const existing = pageMeta.get(step.pagePath);
    if (existing) {
      existing.visitCount += 1;
      existing.lastVisitedAt = step.occurredAt;
      existing.eventTypes.add(step.eventName);
    } else {
      pageMeta.set(step.pagePath, {
        visitCount: 1,
        lastVisitedAt: step.occurredAt,
        eventTypes: new Set([step.eventName]),
      });
    }
  }

  const uniquePages: string[] = [];
  for (const step of pathSteps) {
    if (!uniquePages.includes(step.pagePath)) {
      uniquePages.push(step.pagePath);
    }
  }

  const lastPage = uniquePages[uniquePages.length - 1];

  const rfNodes: Node[] = uniquePages.map((pagePath, index) => {
    const meta = pageMeta.get(pagePath)!;
    return {
      id: pagePath,
      type: "journey",
      position: { x: index * (NODE_WIDTH + H_GAP), y: 0 },
      data: {
        pagePath,
        visitCount: meta.visitCount,
        lastVisitedAt: meta.lastVisitedAt,
        eventTypes: [...meta.eventTypes],
        avgDurationSeconds: null,
        isLastSeen: pagePath === lastPage,
        pathState: "idle" as const,
      },
    };
  });

  const rfEdges: Edge[] = [];
  for (let i = 0; i < uniquePages.length - 1; i += 1) {
    rfEdges.push({
      id: `e-fallback-${i}-${uniquePages[i]}-${uniquePages[i + 1]}`,
      source: uniquePages[i],
      target: uniquePages[i + 1],
      type: "journey",
      data: { frequency: 1 },
    });
  }

  const firstPage = uniquePages[0];
  const sourceNodeId = `__source__${firstPage}`;
  rfNodes.unshift({
    id: sourceNodeId,
    type: "source",
    position: { x: -180, y: NODE_HEIGHT / 2 - 40 },
    data: {
      sourceName: sourceName ?? "direct",
      entryLink: entryLink ?? null,
    },
  });
  rfEdges.unshift({
    id: `e-source-fallback-${firstPage}`,
    source: sourceNodeId,
    target: firstPage,
    type: "journey",
    data: { frequency: 1 },
  });

  return { nodes: rfNodes, edges: rfEdges };
}
