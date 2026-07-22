/**
 * Global settlement event for cross-component communication.
 * When any settlement occurs, dispatch this event so hooks like
 * useAggregatedDebts can refetch immediately.
 */

import { journeyTracking } from "@/lib/journey-tracking";

const SETTLEMENT_EVENT = 'debts-updated';

export function dispatchSettlementEvent() {
  window.dispatchEvent(new CustomEvent(SETTLEMENT_EVENT));
}

export function onSettlementEvent(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(SETTLEMENT_EVENT, handler);
  return () => window.removeEventListener(SETTLEMENT_EVENT, handler);
}

export function trackSettlementCompleted(properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  journeyTracking.trackEvent({
    event_name: "settlement_completed",
    event_category: "settlement",
    page_path: window.location.pathname,
    flow_name: "settlement",
    step_name: "completed",
    properties: {
      result_status: "success",
      ...properties,
    },
  });
}
