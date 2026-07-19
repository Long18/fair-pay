import { describe, expect, it } from "vitest";
import { mapPolarEventToSubscriptionPatch } from "./polar-webhook-map";

const USER = "11111111-1111-1111-1111-111111111111";
const CUSTOMER = "cust_polar_1";
const SUB = "sub_polar_1";
const NOW = new Date("2026-07-19T12:00:00.000Z");
const FUTURE = "2026-08-19T12:00:00.000Z";
const PAST = "2026-06-01T12:00:00.000Z";

function event(
  type: string,
  overrides: {
    status?: string;
    current_period_end?: string | null;
    external_id?: string | null;
  } = {},
) {
  return {
    type,
    data: {
      id: SUB,
      status: overrides.status,
      current_period_end: overrides.current_period_end ?? FUTURE,
      customer: {
        id: CUSTOMER,
        external_id: overrides.external_id === undefined ? USER : overrides.external_id,
      },
    },
  };
}

describe("mapPolarEventToSubscriptionPatch", () => {
  it("returns null without external_id", () => {
    expect(
      mapPolarEventToSubscriptionPatch(event("subscription.active", { external_id: null }), NOW),
    ).toBeNull();
  });

  it("returns null for unknown event types", () => {
    expect(mapPolarEventToSubscriptionPatch(event("order.created"), NOW)).toBeNull();
  });

  it.each(["subscription.active", "subscription.created", "subscription.updated"])(
    "maps %s to pro/active",
    (type) => {
      const patch = mapPolarEventToSubscriptionPatch(event(type, { status: "active" }), NOW);
      expect(patch).toMatchObject({
        user_id: USER,
        plan: "pro",
        status: "active",
        polar_customer_id: CUSTOMER,
        polar_subscription_id: SUB,
        expires_at: FUTURE,
      });
      expect(patch?.updated_at).toBe(NOW.toISOString());
    },
  );

  it("maps past_due to pro/past_due", () => {
    expect(
      mapPolarEventToSubscriptionPatch(
        event("subscription.updated", { status: "past_due" }),
        NOW,
      ),
    ).toMatchObject({ plan: "pro", status: "past_due" });

    expect(
      mapPolarEventToSubscriptionPatch(event("subscription.past_due"), NOW),
    ).toMatchObject({ plan: "pro", status: "past_due" });
  });

  it("keeps pro when canceled but period not ended", () => {
    expect(
      mapPolarEventToSubscriptionPatch(
        event("subscription.canceled", { current_period_end: FUTURE }),
        NOW,
      ),
    ).toMatchObject({ plan: "pro", status: "canceled" });
  });

  it("sets free when canceled and period ended", () => {
    expect(
      mapPolarEventToSubscriptionPatch(
        event("subscription.canceled", { current_period_end: PAST }),
        NOW,
      ),
    ).toMatchObject({ plan: "free", status: "canceled" });
  });

  it("sets free on revoked even if period end is in the future", () => {
    expect(
      mapPolarEventToSubscriptionPatch(
        event("subscription.revoked", { current_period_end: FUTURE }),
        NOW,
      ),
    ).toMatchObject({ plan: "free", status: "revoked" });
  });
});
