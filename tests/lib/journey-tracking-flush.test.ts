import { describe, expect, it, vi } from "vitest";
import { sendTrackingEventsWithSplitRetry } from "@/lib/journey-tracking/flush";

describe("sendTrackingEventsWithSplitRetry", () => {
  it("does not retry when the batch succeeds", async () => {
    const send = vi.fn(async () => {});
    const events = [{ event_name: "session_started" }, { event_name: "page_view" }];

    await expect(sendTrackingEventsWithSplitRetry(events, send)).resolves.toEqual({
      dropped: [],
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(events);
  });

  it("retries one-by-one and keeps valid events when the batch fails", async () => {
    const send = vi.fn(async (batch: { event_name: string }[]) => {
      if (batch.length > 1 || batch[0]?.event_name === "session_started") {
        throw new Error("constraint");
      }
    });
    const events = [{ event_name: "session_started" }, { event_name: "page_view" }];

    await expect(sendTrackingEventsWithSplitRetry(events, send)).resolves.toEqual({
      dropped: [{ event_name: "session_started" }],
    });
    expect(send).toHaveBeenCalledTimes(3);
  });
});
