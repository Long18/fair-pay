import { describe, expect, it } from "vitest";
import {
  loginStatusSignOutMessage,
  shouldSignOutForLoginStatus,
} from "@/lib/auth/login-account-status";

describe("shouldSignOutForLoginStatus", () => {
  it("signs out merged leftovers", () => {
    expect(
      shouldSignOutForLoginStatus({
        ok: false,
        reason: "merged_into_other_account",
        primary_email: "a@example.com",
      }),
    ).toBe(true);
  });

  it("signs out missing auth user (deleted after merge)", () => {
    expect(
      shouldSignOutForLoginStatus({ ok: false, reason: "auth_user_missing" }),
    ).toBe(true);
  });

  it("keeps live profile sessions", () => {
    expect(
      shouldSignOutForLoginStatus({ ok: true, has_profile: true }),
    ).toBe(false);
  });

  it("keeps incomplete signup without profile", () => {
    expect(
      shouldSignOutForLoginStatus({ ok: true, has_profile: false }),
    ).toBe(false);
  });
});

describe("loginStatusSignOutMessage", () => {
  it("mentions primary email when present", () => {
    const msg = loginStatusSignOutMessage({
      ok: false,
      reason: "merged_into_other_account",
      primary_email: "primary@example.com",
    });
    expect(msg).toContain("primary@example.com");
  });
});
