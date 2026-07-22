import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPlatformShareIntent, shareWithTracking } from "@/lib/share-tracking";
import { appendShareRef } from "@/lib/share-ref";
import { DEFAULT_UTM_PLATFORMS } from "@/lib/utm-config";

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
    const trackedUrl = appendShareRef("https://long-pay.vercel.app/debts/123", {
      source: "native_share",
      medium: "social_share",
      campaign: "debt_share",
      content: "debt_detail_share_button",
    });
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
      url: trackedUrl,
    });
    expect(trackEventMock.mock.calls[0][0].properties).toMatchObject({
      share_method: "native_share",
      share_platform_detection: "native_unobservable",
      share_target_observable: false,
      utm_source: "native_share",
    });
    expect(trackEventMock.mock.calls.map(([event]) => event.event_name)).toEqual([
      "share_button_clicked",
      "share_link_generated",
      "share_native_sheet_opened",
      "share_completed",
    ]);
  });

  it("falls back to tracked copy flow when native share is unavailable", async () => {
    const trackedUrl = appendShareRef("/groups/show/abc", {
      source: "copy_link",
      medium: "copy_link",
      campaign: "group_invite",
      content: "copy_link_button",
    });
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
      url: trackedUrl,
    });
    expect(clipboardWrite).toHaveBeenCalledWith(trackedUrl);
    expect(trackEventMock.mock.calls.some(([event]) => event.event_name === "share_completed")).toBe(true);
    const copyEvent = trackEventMock.mock.calls.find(([event]) => event.event_name === "share_copy_link_clicked")?.[0];
    expect(copyEvent.properties).toMatchObject({
      share_method: "copy_link",
      share_platform_detection: "copy_unknown",
      share_target_observable: false,
      utm_source: "copy_link",
      utm_medium: "copy_link",
    });
  });

  it("opens explicit platform share intents with platform source", async () => {
    const platform = DEFAULT_UTM_PLATFORMS.find((item) => item.platform_key === "facebook")!;
    const trackedUrl = appendShareRef("https://long-pay.vercel.app/api/share/debt?t=abc", {
      source: platform.source,
      medium: platform.medium,
      campaign: "debt_share",
      content: "debt_detail_share_button",
    });
    const openShareIntent = vi.fn().mockResolvedValue(undefined);
    const result = await shareWithTracking({
      shareUrl: "https://long-pay.vercel.app/api/share/debt?t=abc",
      destinationUrl: "https://long-pay.vercel.app/debts/123",
      title: "Debt",
      text: "Open debt",
      entityType: "debt",
      entityId: "123",
      campaign: "debt_share",
      content: "debt_detail_share_button",
      pagePath: "/debts/123",
      platform,
      openShareIntent,
    });

    expect(result.status).toBe("opened");
    expect(result.url).toBe(trackedUrl);
    expect(trackedUrl).toContain("ref=");
    expect(openShareIntent).toHaveBeenCalledWith(
      expect.stringContaining("facebook.com/sharer"),
      platform,
    );
    const generated = trackEventMock.mock.calls.find(([event]) => event.event_name === "share_link_generated")?.[0];
    expect(generated.properties).toMatchObject({
      share_method: "platform",
      share_platform: "facebook",
      share_platform_detection: "explicit",
      share_target_observable: true,
      destination_path: "/debts/123",
      generated_path: "/api/share/debt?t=abc",
      utm_source: "facebook",
    });
    expect(generated.properties.generated_url).toBeUndefined();
    expect(generated.properties.generated_url_hash).toMatch(/^[a-f0-9]{8}$/);
  });

  it("encodes platform intent URL templates", () => {
    const platform = DEFAULT_UTM_PLATFORMS.find((item) => item.platform_key === "telegram")!;
    expect(
      buildPlatformShareIntent({
        trackedUrl: "https://long-pay.vercel.app/debts/123?ref=9Z",
        title: "Debt & friends",
        text: "Open now",
        platform,
      }),
    ).toBe(
      "https://t.me/share/url?url=https%3A%2F%2Flong-pay.vercel.app%2Fdebts%2F123%3Fref%3D9Z&text=Open%20now",
    );
  });
});
