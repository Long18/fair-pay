import { describe, expect, it } from "vitest";
import { buildJourneyPath, formatPageBasename } from "@/modules/admin/components/journey-canvas/journey-path";
import type { UserTrackingEventRow } from "@/modules/admin/types";

function makeEvent(
  overrides: Partial<UserTrackingEventRow> & Pick<UserTrackingEventRow, "id" | "event_name" | "page_path" | "occurred_at">,
): UserTrackingEventRow {
  return {
    session_id: "sess-1",
    user_id: "user-1",
    anonymous_id: "anon-1",
    event_category: "navigation",
    target_type: null,
    target_key: null,
    flow_name: null,
    step_name: null,
    referrer_path: null,
    properties: {},
    ...overrides,
  };
}

describe("buildJourneyPath", () => {
  it("returns empty array for no events", () => {
    expect(buildJourneyPath(undefined)).toEqual([]);
    expect(buildJourneyPath([])).toEqual([]);
  });

  it("sorts events chronologically and dedupes consecutive same page", () => {
    const events = [
      makeEvent({ id: "2", event_name: "page_view", page_path: "/dashboard", occurred_at: "2026-01-02T10:00:00Z" }),
      makeEvent({ id: "1", event_name: "page_view", page_path: "/", occurred_at: "2026-01-02T09:00:00Z" }),
      makeEvent({ id: "3", event_name: "nav_click", page_path: "/dashboard", occurred_at: "2026-01-02T10:05:00Z" }),
      makeEvent({ id: "4", event_name: "page_view", page_path: "/settings", occurred_at: "2026-01-02T11:00:00Z" }),
    ];

    const path = buildJourneyPath(events);
    expect(path).toHaveLength(3);
    expect(path[0].pagePath).toBe("/");
    expect(path[1].pagePath).toBe("/dashboard");
    expect(path[2].pagePath).toBe("/settings");
    expect(path.map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it("ignores events outside path event names", () => {
    const events = [
      makeEvent({ id: "1", event_name: "cta_click", page_path: "/", occurred_at: "2026-01-02T09:00:00Z" }),
    ];
    expect(buildJourneyPath(events)).toEqual([]);
  });
});

describe("formatPageBasename", () => {
  it("returns last path segment with slash", () => {
    expect(formatPageBasename("/dashboard/settings")).toBe("/settings");
    expect(formatPageBasename("/")).toBe("/");
  });
});
