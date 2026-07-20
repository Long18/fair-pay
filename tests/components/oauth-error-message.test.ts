import { describe, expect, it } from "vitest";
import { suggestsMergedAccountOAuthError } from "@/components/auth/oauth-error-message";

describe("suggestsMergedAccountOAuthError", () => {
  it("detects banned_until scan failures", () => {
    expect(
      suggestsMergedAccountOAuthError(
        "server_error",
        'sql: Scan error on column index 1, name "banned_until": unsupported Scan, storing driver.Value type string into type *time.Time',
      ),
    ).toBe(true);
  });

  it("detects user_banned", () => {
    expect(suggestsMergedAccountOAuthError("user_banned", null)).toBe(true);
  });

  it("does not treat generic server_error as merge hint", () => {
    expect(
      suggestsMergedAccountOAuthError("server_error", "unexpected failure"),
    ).toBe(false);
  });

  it("does not treat bare banned substring as merge hint", () => {
    expect(suggestsMergedAccountOAuthError(null, "account banned")).toBe(false);
  });
});
