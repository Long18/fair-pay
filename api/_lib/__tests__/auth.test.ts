import { describe, expect, it } from "vitest";

import { getAuthenticatedUser } from "../auth";

describe("getAuthenticatedUser", () => {
  it("returns a structured auth error when authorization header is missing", async () => {
    await expect(getAuthenticatedUser(undefined)).resolves.toMatchObject({
      user: null,
      error: "Missing authorization header",
      supabase: null,
    });
  });

  it("returns a structured auth error when authorization header is not bearer format", async () => {
    await expect(getAuthenticatedUser("Basic token")).resolves.toMatchObject({
      user: null,
      error: "Invalid authorization header format",
      supabase: null,
    });
  });
});
