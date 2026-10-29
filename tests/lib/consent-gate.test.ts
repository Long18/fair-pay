import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  clearConsentState,
  isAnalyticsConsentGiven,
  isExperienceConsentGiven,
  isMarketingConsentGiven,
  isPreferencesConsentGiven,
  readConsentState,
  resetConsentCacheForTests,
  subscribeConsent,
  writeConsentState,
} from "@/lib/analytics/consent-gate";

describe("consent gate", () => {
  beforeEach(() => {
    localStorage.clear();
    resetConsentCacheForTests();
  });

  it("is pending and denies every category when nothing is stored", () => {
    expect(readConsentState()).toBeNull();
    expect(isPreferencesConsentGiven()).toBe(false);
    expect(isExperienceConsentGiven()).toBe(false);
    expect(isMarketingConsentGiven()).toBe(false);
  });

  it("stores each category independently", () => {
    writeConsentState({ preferences: true, experience: true, marketing: false });

    expect(isPreferencesConsentGiven()).toBe(true);
    expect(isExperienceConsentGiven()).toBe(true);
    expect(isAnalyticsConsentGiven()).toBe(true);
    expect(isMarketingConsentGiven()).toBe(false);
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? "{}")).toMatchObject({
      schema: 2,
      preferences: "accepted",
      experience: "accepted",
      marketing: "rejected",
    });
  });

  it.each([
    ["fairpay-consent:v1", "accepted"],
    ["fairpay-consent", "rejected"],
  ] as const)("migrates %s (%s) into v2", (key, analytics) => {
    localStorage.setItem(key, JSON.stringify({ analytics, timestamp: "2026-01-01T00:00:00.000Z" }));

    expect(readConsentState()).toEqual({
      schema: 2,
      preferences: "accepted",
      experience: analytics,
      marketing: analytics,
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    expect(localStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).not.toBeNull();
  });

  it("keeps v1 pending decisions pending", () => {
    localStorage.setItem("fairpay-consent:v1", JSON.stringify({ analytics: "pending", timestamp: null }));
    expect(readConsentState()).toBeNull();
  });

  it("ignores malformed v2 payloads", () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ schema: 2, experience: "yes" }));
    expect(readConsentState()).toBeNull();
  });

  it("notifies subscribers on write and clear", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeConsent(listener);

    writeConsentState({ preferences: false, experience: false, marketing: false });
    clearConsentState();
    unsubscribe();
    writeConsentState({ preferences: true, experience: true, marketing: true });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(readConsentState()?.marketing).toBe("accepted");
  });
});
