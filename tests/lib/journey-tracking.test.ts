import { describe, expect, it } from "vitest";
import { getTrackedElementPayload } from "@/lib/journey-tracking/dom";
import {
  JOURNEY_STORAGE_KEYS,
  bootstrapJourneySession,
  ensureAnonymousId,
  resetJourneySession,
  type StorageLike,
} from "@/lib/journey-tracking/session";
import { sanitizeTrackingPath, sanitizeTrackingReferrer } from "@/lib/journey-tracking/url";

class MemoryStorage implements StorageLike {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

describe("journey tracking helpers", () => {
  it("sanitizes page paths and keeps only allowed attribution params", () => {
    expect(
      sanitizeTrackingPath("https://long-pay.vercel.app/groups/create?utm_source=meta&token=secret&ref=invite"),
    ).toBe("/groups/create?utm_source=meta&ref=invite");

    expect(sanitizeTrackingPath("/dashboard?fbclid=123&email=test@example.com")).toBe(
      "/dashboard?fbclid=123",
    );

    expect(sanitizeTrackingPath("not a valid url")).toBe("/not%20a%20valid%20url");
  });

  it("sanitizes referrers down to origin and pathname", () => {
    expect(
      sanitizeTrackingReferrer("https://www.google.com/search?q=fairpay&utm_source=search"),
    ).toBe("https://www.google.com/search");

    expect(sanitizeTrackingReferrer("invalid")).toBeNull();
    expect(sanitizeTrackingReferrer(null)).toBeNull();
  });

  it("bootstraps and reuses anonymous journey sessions", () => {
    const localStorage = new MemoryStorage();
    const sessionStorage = new MemoryStorage();

    const firstSession = bootstrapJourneySession({
      localStorage,
      sessionStorage,
      href: "https://long-pay.vercel.app/groups/create?utm_source=meta&token=secret",
      referrer: "https://www.google.com/search?q=fairpay",
      locale: "vi-VN",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });

    expect(firstSession.anonymousId).toBe(ensureAnonymousId(localStorage));
    expect(firstSession.landingPath).toBe("/groups/create?utm_source=meta");
    expect(firstSession.landingReferrer).toBe("https://www.google.com/search");
    expect(firstSession.entryLink).toBe("/groups/create?utm_source=meta");
    expect(firstSession.locale).toBe("vi-VN");
    expect(firstSession.deviceType).toBe("mobile");

    const secondSession = bootstrapJourneySession({
      localStorage,
      sessionStorage,
      href: "https://long-pay.vercel.app/dashboard?utm_source=other",
      referrer: "https://facebook.com/ads",
      locale: "en-US",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
    });

    expect(secondSession.id).toBe(firstSession.id);
    expect(secondSession.startedAt).toBe(firstSession.startedAt);
    expect(secondSession.landingPath).toBe(firstSession.landingPath);
    expect(secondSession.landingReferrer).toBe(firstSession.landingReferrer);
    expect(secondSession.entryLink).toBe(firstSession.entryLink);
  });

  it("resets session while keeping anonymous identity and clearing last path", () => {
    const sessionStorage = new MemoryStorage();
    sessionStorage.setItem(JOURNEY_STORAGE_KEYS.lastPath, "/dashboard");

    const resetSession = resetJourneySession({
      sessionStorage,
      href: "https://long-pay.vercel.app/payments/create?utm_campaign=launch",
      referrer: "https://zalo.me/ref/abc",
      locale: "vi-VN",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      anonymousId: "anon-123",
    });

    expect(resetSession.anonymousId).toBe("anon-123");
    expect(resetSession.landingPath).toBe("/payments/create?utm_campaign=launch");
    expect(resetSession.landingReferrer).toBe("https://zalo.me/ref/abc");
    expect(resetSession.deviceType).toBe("desktop");
    expect(sessionStorage.getItem(JOURNEY_STORAGE_KEYS.lastPath)).toBeNull();
  });

  it("builds tracked element payload from data attributes", () => {
    const button = document.createElement("button");
    button.dataset.trackId = "expense:create";
    button.dataset.trackEvent = "form_submit";
    button.dataset.trackCategory = "expense";
    button.dataset.trackFlow = "expense-create";
    button.dataset.trackStep = "details";
    button.dataset.trackEntityId = "exp-1";
    button.dataset.trackEntityType = "expense";
    button.dataset.trackEntityPath = "/expenses/show/exp-1";

    expect(getTrackedElementPayload(button)).toEqual({
      eventName: "form_submit",
      eventCategory: "expense",
      targetType: "button",
      targetKey: "expense:create",
      flowName: "expense-create",
      stepName: "details",
      properties: {
        entity_id: "exp-1",
        entity_type: "expense",
        entity_path: "/expenses/show/exp-1",
      },
    });
  });

  it("returns null for untracked elements", () => {
    const anchor = document.createElement("a");
    anchor.href = "/groups/create";

    expect(getTrackedElementPayload(anchor)).toBeNull();
  });
});
