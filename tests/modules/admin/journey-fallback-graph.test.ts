import { describe, expect, it } from "vitest";
import { buildFallbackGraphFromPath } from "@/modules/admin/components/journey-canvas/journey-fallback-graph";
import type { JourneyPathStep } from "@/modules/admin/components/journey-canvas/journey-path";

const steps: JourneyPathStep[] = [
  { eventId: "1", pagePath: "/", eventName: "page_view", occurredAt: "2026-01-02T09:00:00Z", index: 0 },
  { eventId: "2", pagePath: "/connections", eventName: "page_view", occurredAt: "2026-01-02T10:00:00Z", index: 1 },
  { eventId: "3", pagePath: "/debts/foo", eventName: "nav_click", occurredAt: "2026-01-02T11:00:00Z", index: 2 },
];

describe("buildFallbackGraphFromPath", () => {
  it("returns empty graph for no steps", () => {
    expect(buildFallbackGraphFromPath([])).toEqual({ nodes: [], edges: [] });
  });

  it("builds linear nodes and edges from unique pages in visit order", () => {
    const { nodes, edges } = buildFallbackGraphFromPath(steps, "google", "https://example.com");

    const journeyNodes = nodes.filter((node) => node.type === "journey");
    expect(journeyNodes).toHaveLength(3);
    expect(journeyNodes.map((node) => node.id)).toEqual(["/", "/connections", "/debts/foo"]);

    const sourceNode = nodes.find((node) => node.type === "source");
    expect(sourceNode).toBeDefined();
    expect((sourceNode?.data as { sourceName?: string }).sourceName).toBe("google");

    expect(edges).toHaveLength(3);
    expect(edges.some((edge) => edge.source.startsWith("__source__"))).toBe(true);
  });
});
