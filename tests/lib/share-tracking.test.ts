import { beforeEach, describe, expect, it, vi } from "vitest";
import { shareWithTracking } from "@/lib/share-tracking";

const { trackEventMock } = vi.hoisted(() => ({
  trackEventMock: vi.fn(),
}));

vi.mock("@/lib/journey-tracking", () => ({
  journeyTracking: {
    trackEvent: trackEventMock,
  },
}));

describe("share tracking helpers", () => {
  beforeEach(() => {
    trackEventMock.mockClear();
  });

  it("tracks native share event sequence", async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const result = await shareWithTracking({
      baseUrl: "https://long-pay.vercel.app/debts/123",
      title: "Debt",
      text: "Open debt",
      entityType: "debt",
      entityId: "123",
      campaign: "debt_share",
      content: "debt_detail_share_button",
      pagePath: "/debts/123",
      nativeShare,
      canUseNativeShare: true,
    });

    expect(result.status).toBe("shared");
    expect(nativeShare).toHaveBeenCalledWith({
      title: "Debt",
      text: "Open debt",
      url: "https://long-pay.vercel.app/debts/123?utm_source=native_share&utm_medium=social_share&utm_campaign=debt_share&utm_content=debt_detail_share_button",
    });
    expect(trackEventMock.mock.calls.map(([event]) => event.event_name)).toEqual([
      "share_button_clicked",
      "share_link_generated",
      "share_native_sheet_opened",
      "share_completed",
    ]);
  });

  it("falls back to tracked copy flow when native share is unavailable", async () => {
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    const result = await shareWithTracking({
      baseUrl: "/groups/show/abc",
      entityType: "group",
      entityId: "abc",
      campaign: "group_invite",
      content: "group_detail_invite_button",
      fallbackContent: "copy_link_button",
      pagePath: "/groups/show/abc",
      canUseNativeShare: false,
      nativeShare: undefined,
      clipboardWrite,
    });

    expect(result).toEqual({
      status: "copied",
      url: "/groups/show/abc?utm_source=copy_link&utm_medium=copy_link&utm_campaign=group_invite&utm_content=copy_link_button",
    });
    expect(clipboardWrite).toHaveBeenCalledWith(
      "/groups/show/abc?utm_source=copy_link&utm_medium=copy_link&utm_campaign=group_invite&utm_content=copy_link_button",
    );
    expect(trackEventMock.mock.calls.some(([event]) => event.event_name === "share_completed")).toBe(true);
  });
});
