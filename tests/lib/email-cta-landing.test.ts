import { beforeEach, describe, expect, it } from "vitest";

import {
  emailCtaVariantForPath,
  isAuthPath,
  loadPendingEmailCtaLanding,
  readEmailCtaSrc,
  savePendingEmailCtaLanding,
  stripEmailCtaSrc,
} from "@/lib/email-cta-landing";

describe("email CTA landing helpers", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("only accepts email_* sources", () => {
    expect(readEmailCtaSrc("?src=email_reminder")).toBe("email_reminder");
    expect(readEmailCtaSrc("?next=%2Fbalances&src=email_digest_reminder")).toBe("email_digest_reminder");
    expect(readEmailCtaSrc("?src=newsletter")).toBeNull();
    expect(readEmailCtaSrc("?src=email_<x>")).toBeNull();
  });

  it("derives the variant from the landing route", () => {
    expect(emailCtaVariantForPath("/register")).toBe("guest");
    expect(emailCtaVariantForPath("/balances")).toBe("registered");
    expect(isAuthPath("/login")).toBe(true);
    expect(isAuthPath("/balances")).toBe(false);
  });

  it("strips src but keeps other params", () => {
    expect(stripEmailCtaSrc("?src=email_reminder")).toBe("");
    expect(stripEmailCtaSrc("?tab=groups&src=email_reminder")).toBe("?tab=groups");
  });

  it("persists the pending landing across the login redirect", () => {
    savePendingEmailCtaLanding({ src: "email_reminder", variant: "registered" });
    expect(loadPendingEmailCtaLanding()).toEqual({ src: "email_reminder", variant: "registered" });
    savePendingEmailCtaLanding(null);
    expect(loadPendingEmailCtaLanding()).toBeNull();
  });
});
