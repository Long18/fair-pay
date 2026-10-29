import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useConsent } from "@/hooks/use-consent";
import { resetConsentCacheForTests } from "@/lib/analytics/consent-gate";
import { ATTRIBUTION_STORAGE_KEYS, captureAttributionFromUrl } from "@/lib/utm";

describe("useConsent", () => {
  beforeEach(() => {
    localStorage.clear();
    resetConsentCacheForTests();
  });

  it("opens the modal with every category pre-selected while pending", () => {
    const { result } = renderHook(() => useConsent());

    expect(result.current.isConsentPending).toBe(true);
    expect(result.current.isConsentModalOpen).toBe(true);
    expect(result.current.choices).toEqual({ preferences: true, experience: true, marketing: true });
  });

  it("rejectAll denies every category and closes the modal", () => {
    const { result } = renderHook(() => useConsent());

    act(() => result.current.rejectAll());

    expect(result.current.isConsentModalOpen).toBe(false);
    expect(result.current.choices).toEqual({ preferences: false, experience: false, marketing: false });
    expect(result.current.isExperienceAllowed).toBe(false);
  });

  it("confirmChoices saves partial toggles and wipes attribution when marketing is off", () => {
    const { result } = renderHook(() => useConsent());

    act(() => result.current.acceptAll());
    captureAttributionFromUrl({ href: "https://long-pay.vercel.app/?utm_source=zalo&utm_medium=dm", referrer: "" });
    expect(localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.firstTouch)).not.toBeNull();

    act(() => result.current.confirmChoices({ preferences: true, experience: true, marketing: false }));

    expect(result.current.isExperienceAllowed).toBe(true);
    expect(result.current.isMarketingAllowed).toBe(false);
    expect(localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.firstTouch)).toBeNull();
  });

  it("can be reopened to manage choices and shares state across hooks", () => {
    const first = renderHook(() => useConsent());
    const second = renderHook(() => useConsent());

    act(() => first.result.current.acceptAll());
    expect(second.result.current.isConsentModalOpen).toBe(false);

    act(() => second.result.current.openConsentModal());
    expect(first.result.current.isConsentModalOpen).toBe(true);
    expect(first.result.current.isConsentPending).toBe(false);

    act(() => first.result.current.closeConsentModal());
    expect(second.result.current.isConsentModalOpen).toBe(false);
  });
});
