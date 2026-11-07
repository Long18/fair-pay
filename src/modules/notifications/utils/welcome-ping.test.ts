import { describe, it, expect, beforeEach } from "vitest";
import {
  NOTIF_WELCOME_PING_KEY,
  tryConsumeWelcomePing,
} from "./welcome-ping";

describe("tryConsumeWelcomePing", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("consumes the ping slot once per session", () => {
    expect(tryConsumeWelcomePing()).toBe(true);
    expect(sessionStorage.getItem(NOTIF_WELCOME_PING_KEY)).toBe("1");
    expect(tryConsumeWelcomePing()).toBe(false);
  });
});
