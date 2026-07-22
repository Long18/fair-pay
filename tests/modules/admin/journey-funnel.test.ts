import { describe, expect, it } from "vitest";
import { computeJourneyFunnelStages } from "@/modules/admin/components/journey-canvas/journey-funnel";
import type { UserTrackingEventRow } from "@/modules/admin/types";

function makeEvent(eventName: string, id: string): UserTrackingEventRow {
  return {
    id,
    session_id: "session-1",
    user_id: "user-1",
    anonymous_id: "anon-1",
    event_name: eventName,
    event_category: "test",
    page_path: "/test",
    target_type: null,
    target_key: null,
    flow_name: null,
    step_name: null,
    referrer_path: null,
    properties: {},
    occurred_at: "2026-07-22T10:00:00.000Z",
  };
}

describe("computeJourneyFunnelStages", () => {
  it("marks stages reached when matching events exist", () => {
    const events = [
      makeEvent("session_started", "1"),
      makeEvent("page_view", "2"),
      makeEvent("auth_login_success", "3"),
    ];

    const stages = computeJourneyFunnelStages(events);

    expect(stages.map((stage) => stage.reached)).toEqual([true, true, true, false, false]);
    expect(stages[0].count).toBe(1);
    expect(stages[1].count).toBe(1);
    expect(stages[2].count).toBe(1);
  });

  it("computes conversion from prior stage when both stages have events", () => {
    const events = [
      makeEvent("session_started", "0"),
      makeEvent("page_view", "1"),
      makeEvent("page_view", "2"),
      makeEvent("auth_login_success", "3"),
    ];

    const stages = computeJourneyFunnelStages(events);

    const authStage = stages.find((stage) => stage.key === "auth");
    expect(authStage?.reached).toBe(true);
    expect(authStage?.conversionFromPrior).toBe(50);
  });

  it("returns empty funnel for no events", () => {
    const stages = computeJourneyFunnelStages([]);
    expect(stages).toHaveLength(5);
    expect(stages.every((stage) => !stage.reached)).toBe(true);
  });
});
