import { describe, expect, it } from "vitest";
import { insertRowsWithFallback } from "../../supabase/functions/track-client-event/insert-with-fallback";

describe("insertRowsWithFallback", () => {
  it("returns the full batch when the bulk insert succeeds", async () => {
    const rows = [
      { event_name: "session_started" },
      { event_name: "page_view" },
    ];

    const result = await insertRowsWithFallback(
      rows,
      async () => ({ error: null }),
      async () => {
        throw new Error("insertOne should not run on bulk success");
      },
    );

    expect(result).toEqual({ accepted: 2, rejectedNames: [] });
  });

  it("keeps valid events when one name fails the bulk insert", async () => {
    const rows = [
      { event_name: "session_started" },
      { event_name: "page_view" },
      { event_name: "nav_click" },
    ];

    const result = await insertRowsWithFallback(
      rows,
      async () => ({ error: { message: "violates check constraint" } }),
      async (row) => (
        row.event_name === "session_started"
          ? { error: { message: "violates check constraint" } }
          : { error: null }
      ),
    );

    expect(result).toEqual({
      accepted: 2,
      rejectedNames: ["session_started"],
    });
  });

  it("reports zero accepted when every row fails", async () => {
    const rows = [{ event_name: "session_started" }];

    const result = await insertRowsWithFallback(
      rows,
      async () => ({ error: { message: "violates check constraint" } }),
      async () => ({ error: { message: "violates check constraint" } }),
    );

    expect(result).toEqual({
      accepted: 0,
      rejectedNames: ["session_started"],
    });
  });
});
