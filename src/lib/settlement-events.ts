/**
 * Global settlement event for cross-component communication.
 * When any settlement occurs, dispatch this event so hooks like
 * useAggregatedDebts can refetch immediately.
 */

const SETTLEMENT_EVENT = 'debts-updated';

export function dispatchSettlementEvent() {
  window.dispatchEvent(new CustomEvent(SETTLEMENT_EVENT));
}

export function onSettlementEvent(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(SETTLEMENT_EVENT, handler);
  return () => window.removeEventListener(SETTLEMENT_EVENT, handler);
}
