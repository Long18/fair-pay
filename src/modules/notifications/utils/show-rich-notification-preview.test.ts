import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { showRichNotificationPreview } from "./show-rich-notification-preview";
import { NOTIFICATION_PREVIEW_EVENT } from "./notification-preview-events";
import type { Notification } from "../types";

const baseNotification = (
  id: string,
  created_at: string,
  link: string | null = null
): Notification => ({
  id,
  user_id: "u1",
  actor_id: "actor1",
  type: "expense_added",
  title: `Title ${id}`,
  message: `Message ${id}`,
  is_read: false,
  created_at,
  link,
  related_id: null,
});

describe("showRichNotificationPreview", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dispatches one preview per notification in the burst (oldest first)", () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const win = window as unknown as {
      dispatchEvent: (e: Event) => boolean;
      setTimeout: typeof setTimeout;
    };
    win.dispatchEvent = (event: Event) => {
      handler((event as CustomEvent).detail);
      return true;
    };

    const notifications = [
      baseNotification("1", "2020-01-01T00:00:00Z"),
      baseNotification("2", "2020-01-03T00:00:00Z", "/expenses/2"),
    ];

    showRichNotificationPreview({
      notifications,
      burstIds: ["1", "2"],
      isMobile: false,
      reducedMotion: false,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(110);
    expect(handler).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
    expect(handler.mock.calls[0][0]).toMatchObject({
      notification: expect.objectContaining({ id: "1" }),
      viewLink: undefined,
    });
    expect(handler.mock.calls[1][0]).toMatchObject({
      notification: expect.objectContaining({ id: "2" }),
      viewLink: "/expenses/2",
    });
  });

  it("includes viewLink when a single notification has a link", () => {
    const handler = vi.fn();
    const win = window as unknown as { dispatchEvent: (e: Event) => boolean };
    win.dispatchEvent = (event: Event) => {
      handler((event as CustomEvent).detail);
      return true;
    };

    showRichNotificationPreview({
      notifications: [baseNotification("1", "2020-01-01T00:00:00Z", "/pay/1")],
      burstIds: ["1"],
      isMobile: true,
      reducedMotion: true,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      viewLink: "/pay/1",
      isMobile: true,
      reducedMotion: true,
    });
  });

  it("does not dispatch when burst ids match nothing", () => {
    const dispatch = vi.fn();
    vi.stubGlobal("window", { dispatchEvent: dispatch });

    showRichNotificationPreview({
      notifications: [],
      burstIds: ["missing"],
      isMobile: false,
      reducedMotion: false,
    });

    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("NOTIFICATION_PREVIEW_EVENT", () => {
  it("uses a stable event name", () => {
    expect(NOTIFICATION_PREVIEW_EVENT).toBe("fairpay:notification-preview");
  });
});
