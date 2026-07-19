export type Plan = "free" | "pro";

export type SubscriptionStatus =
  | "inactive"
  | "active"
  | "past_due"
  | "canceled"
  | "revoked";

/** Patch applied to `subscriptions` (upsert by user_id). */
export interface SubscriptionRowPatch {
  user_id: string;
  plan: Plan;
  status: SubscriptionStatus;
  polar_customer_id: string | null;
  polar_subscription_id: string | null;
  expires_at: string | null;
  updated_at: string;
}

export interface PolarCustomerRef {
  id?: string | null;
  external_id?: string | null;
}

export interface PolarSubscriptionData {
  id?: string | null;
  status?: string | null;
  current_period_end?: string | null;
  customer?: PolarCustomerRef | null;
}

export interface PolarWebhookEvent {
  type: string;
  data?: PolarSubscriptionData | null;
}

const ACTIVE_EVENTS = new Set([
  "subscription.active",
  "subscription.created",
  "subscription.updated",
  "subscription.uncanceled",
]);

const END_EVENTS = new Set([
  "subscription.canceled",
  "subscription.revoked",
]);

function normalizeStatus(raw: string | null | undefined): string {
  return (raw ?? "").toLowerCase();
}

/**
 * Map a Polar subscription webhook event to a subscriptions row patch.
 * Returns null when the event cannot be attributed to a FairPay user
 * (missing customer.external_id) or the type is ignored.
 */
export function mapPolarEventToSubscriptionPatch(
  event: PolarWebhookEvent,
  now: Date = new Date(),
): SubscriptionRowPatch | null {
  const data = event.data;
  if (!data) return null;

  const userId = data.customer?.external_id?.trim();
  if (!userId) return null;

  const type = event.type;
  const polarStatus = normalizeStatus(data.status);
  const periodEnd = data.current_period_end ?? null;
  const periodEnded =
    periodEnd != null ? new Date(periodEnd).getTime() <= now.getTime() : true;

  const base = {
    user_id: userId,
    polar_customer_id: data.customer?.id ?? null,
    polar_subscription_id: data.id ?? null,
    expires_at: periodEnd,
    updated_at: now.toISOString(),
  };

  if (type === "subscription.past_due" || polarStatus === "past_due") {
    return { ...base, plan: "pro", status: "past_due" };
  }

  if (END_EVENTS.has(type) || polarStatus === "canceled" || polarStatus === "revoked") {
    const status: SubscriptionStatus =
      type === "subscription.revoked" || polarStatus === "revoked"
        ? "revoked"
        : "canceled";

    // Canceled but period not ended yet: keep Pro until current_period_end.
    if (status === "canceled" && !periodEnded) {
      return { ...base, plan: "pro", status: "canceled" };
    }

    return { ...base, plan: "free", status };
  }

  if (ACTIVE_EVENTS.has(type)) {
    return { ...base, plan: "pro", status: "active" };
  }

  return null;
}
