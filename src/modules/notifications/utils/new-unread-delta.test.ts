import { describe, it, expect } from "vitest";
import { diffNewUnreadIds, pickNotificationsForToast } from "./new-unread-delta";

describe("diffNewUnreadIds", () => {
  it("returns initial kind without new ids on first snapshot", () => {
    expect(diffNewUnreadIds(null, ["a", "b"])).toEqual({
      kind: "initial",
      newIds: [],
    });
  });

  it("detects ids that were not in the previous unread set", () => {
    const known = new Set(["a"]);
    expect(diffNewUnreadIds(known, ["a", "b", "c"])).toEqual({
      kind: "delta",
      newIds: ["b", "c"],
    });
  });
});

describe("pickNotificationsForToast", () => {
  it("returns matching rows newest-first", () => {
    const rows = [
      { id: "1", created_at: "2020-01-01T00:00:00Z" },
      { id: "2", created_at: "2020-01-02T00:00:00Z" },
    ];
    expect(pickNotificationsForToast(rows, ["1", "2"]).map((r) => r.id)).toEqual([
      "2",
      "1",
    ]);
  });
});

