import { describe, expect, it } from "vitest";
import { extractGroups, normalizeGroupsListPayload } from "../format-group-list";

describe("normalizeGroupsListPayload", () => {
  it("passes through Agent API shape", () => {
    const payload = {
      groups: [{ id: "g1", name: "Trip", description: null }],
    };
    expect(normalizeGroupsListPayload(payload)).toEqual(payload);
    expect(extractGroups(payload)).toHaveLength(1);
  });

  it("maps legacy get_groups membership rows", () => {
    const legacy = [
      {
        group_id: "g1",
        role: "admin",
        groups: { id: "g1", name: "Amanotes", description: "HQ" },
      },
    ];
    expect(normalizeGroupsListPayload(legacy)).toEqual({
      groups: [{ id: "g1", name: "Amanotes", description: "HQ" }],
    });
  });

  it("returns empty groups for error envelopes", () => {
    expect(normalizeGroupsListPayload({ error: { code: "X" } })).toEqual({ groups: [] });
  });
});
