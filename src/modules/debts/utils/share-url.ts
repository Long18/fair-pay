import { toVersionToken } from "@/lib/share-url";

type DebtShareVersionSource = {
  viewerId?: string | null;
  counterpartyId?: string | null;
  latestActivityAt?: string | null;
};

function extractCounterpartyIdFromUrl(url: URL): string | null {
  const fromQuery = url.searchParams.get("counterparty_id") || url.searchParams.get("id");
  if (fromQuery) return fromQuery;

  const match = url.pathname.match(/\/debts\/([^/?#]+)/);
  return match?.[1] ?? null;
}

export function buildDebtShareUrl(
  debt: DebtShareVersionSource,
  currentUrl: string,
): string {
  try {
    const current = new URL(currentUrl);
    const viewerId = debt.viewerId;
    const counterpartyId = debt.counterpartyId || extractCounterpartyIdFromUrl(current);

    if (!viewerId || !counterpartyId) {
      return currentUrl;
    }

    const url = new URL("/api/share/debt", current.origin);
    const versionSource = debt.latestActivityAt || new Date().toISOString();

    url.searchParams.set("viewer_id", viewerId);
    url.searchParams.set("counterparty_id", counterpartyId);
    url.searchParams.set("v", toVersionToken(versionSource));

    return url.toString();
  } catch {
    return currentUrl;
  }
}
