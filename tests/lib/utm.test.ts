import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_STORAGE_KEYS,
  buildTrackedUrl,
  captureAttributionFromUrl,
  getAttributionEventProperties,
  getCanonicalDestinationPath,
  getCurrentAttributionContext,
  stripTrackingParams,
  type CookieAdapter,
  type StorageLike,
} from "@/lib/utm";

class MemoryStorage implements StorageLike {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

class MemoryCookie implements CookieAdapter {
  private store = new Map<string, string>();

  read(name: string) {
    return this.store.get(name) ?? null;
  }

  write(name: string, value: string) {
    this.store.set(name, value);
  }
}

describe("buildTrackedUrl", () => {
  it("adds sanitized UTM parameters while preserving existing query params", () => {
    expect(
      buildTrackedUrl({
        baseUrl: "https://long-pay.vercel.app/debts/123?v=1",
        source: "Facebook Messenger",
        medium: "Social Share",
        campaign: "Debt Share",
        content: "Debt Detail Share Button",
      }),
    ).toBe(
      "https://long-pay.vercel.app/debts/123?v=1&utm_source=facebook_messenger&utm_medium=social_share&utm_campaign=debt_share&utm_content=debt_detail_share_button",
    );
  });

  it("supports relative URLs and extra params", () => {
    expect(
      buildTrackedUrl({
        baseUrl: "/groups/show/abc?tab=members",
        baseOrigin: "https://long-pay.vercel.app",
        source: "copy_link",
        medium: "copy_link",
        campaign: "group_invite",
        content: "copy_link_button",
        extraParams: { ref: "invite-123" },
      }),
    ).toBe(
      "/groups/show/abc?tab=members&utm_source=copy_link&utm_medium=copy_link&utm_campaign=group_invite&utm_content=copy_link_button&ref=invite-123",
    );
  });

  it("does not overwrite existing UTM params unless requested", () => {
    const input = "/profile/123?utm_source=zalo&utm_campaign=old";
    expect(
      buildTrackedUrl({
        baseUrl: input,
        baseOrigin: "https://long-pay.vercel.app",
        source: "facebook",
        medium: "social_share",
        campaign: "profile_share",
        content: "profile_header_share_button",
      }),
    ).toBe(
      "/profile/123?utm_source=zalo&utm_campaign=old&utm_medium=social_share&utm_content=profile_header_share_button",
    );

    expect(
      buildTrackedUrl({
        baseUrl: input,
        baseOrigin: "https://long-pay.vercel.app",
        source: "facebook",
        medium: "social_share",
        campaign: "profile_share",
        content: "profile_header_share_button",
        overwriteUtm: true,
      }),
    ).toBe(
      "/profile/123?utm_source=facebook&utm_campaign=profile_share&utm_medium=social_share&utm_content=profile_header_share_button",
    );
  });

  it("strips tracking params for compact admin destination display", () => {
    expect(
      stripTrackingParams("https://long-pay.vercel.app/debts/123?tab=activity&utm_source=facebook&utm_campaign=debt_share&fbclid=abc"),
    ).toBe("https://long-pay.vercel.app/debts/123?tab=activity");

    expect(
      getCanonicalDestinationPath("/api/share/debt?t=abc&utm_source=facebook&utm_medium=social_share"),
    ).toBe("/api/share/debt?t=abc");
  });
});

describe("attribution capture", () => {
  it("sets first touch once and updates last touch for later UTM visits", () => {
    const storage = new MemoryStorage();
    const cookie = new MemoryCookie();

    captureAttributionFromUrl({
      href: "https://long-pay.vercel.app/debts/123?utm_source=facebook&utm_medium=social_share&utm_campaign=debt_share&utm_content=debt_detail_share_button",
      referrer: "",
      now: "2026-05-01T01:00:00.000Z",
      storage,
      cookie,
    });

    const second = captureAttributionFromUrl({
      href: "https://long-pay.vercel.app/groups/show/abc?utm_source=zalo&utm_medium=referral&utm_campaign=group_invite",
      referrer: "",
      now: "2026-05-01T02:00:00.000Z",
      storage,
      cookie,
    });

    expect(second.first_touch?.utm_source).toBe("facebook");
    expect(second.first_touch?.utm_campaign).toBe("debt_share");
    expect(second.last_touch?.utm_source).toBe("zalo");
    expect(second.last_touch?.utm_campaign).toBe("group_invite");
  });

  it("falls back to mapped referrer and does not let direct overwrite last touch", () => {
    const storage = new MemoryStorage();
    const cookie = new MemoryCookie();

    captureAttributionFromUrl({
      href: "https://long-pay.vercel.app/",
      referrer: "https://instagram.com/fairpay",
      now: "2026-05-01T01:00:00.000Z",
      storage,
      cookie,
    });

    const second = captureAttributionFromUrl({
      href: "https://long-pay.vercel.app/dashboard",
      referrer: "",
      now: "2026-05-01T02:00:00.000Z",
      storage,
      cookie,
    });

    expect(second.last_touch?.utm_source).toBe("instagram");
    expect(second.last_touch?.utm_medium).toBe("referral");
  });

  it("reads attribution context from storage and returns flat event properties", () => {
    const storage = new MemoryStorage();
    const cookie = new MemoryCookie();

    captureAttributionFromUrl({
      href: "https://long-pay.vercel.app/profile/123?utm_source=copy_link&utm_medium=copy_link&utm_campaign=profile_share&utm_content=copy_link_button",
      now: "2026-05-01T01:00:00.000Z",
      storage,
      cookie,
    });

    const context = getCurrentAttributionContext({ storage, cookie });
    expect(storage.getItem(ATTRIBUTION_STORAGE_KEYS.firstTouch)).toBeTruthy();
    expect(cookie.read(ATTRIBUTION_STORAGE_KEYS.lastTouch)).toBeTruthy();
    expect(getAttributionEventProperties(context)).toMatchObject({
      utm_source: "copy_link",
      utm_medium: "copy_link",
      utm_campaign: "profile_share",
      utm_content: "copy_link_button",
      attribution_type: "last_touch",
      first_utm_source: "copy_link",
      last_utm_source: "copy_link",
    });
  });
});
