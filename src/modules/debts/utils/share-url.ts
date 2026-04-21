import { toVersionToken } from "@/lib/share-url";

type DebtShareVersionSource = {
  viewerId?: string | null;
  counterpartyId?: string | null;
  latestActivityAt?: string | null;
};

/** Strip hyphens from a UUID and convert the 32 hex chars to 16 bytes. */
function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  if (hex.length !== 32) throw new Error("Invalid UUID length");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Encode raw bytes to base64url (URL-safe, no padding). */
function toBase64Url(buf: Uint8Array): string {
  const binary = Array.from(buf, (b) => String.fromCharCode(b)).join("");
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Encode viewer + counterparty UUIDs into a compact base64url token (~43 chars).
 */
function encodeDebtToken(viewerId: string, counterpartyId: string): string {
  const buf = new Uint8Array(32);
  buf.set(uuidToBytes(viewerId), 0);
  buf.set(uuidToBytes(counterpartyId), 16);
  return toBase64Url(buf);
}

function extractCounterpartyIdFromUrl(url: URL): string | null {
  const fromQuery =
    url.searchParams.get("counterparty_id") || url.searchParams.get("id");
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
    const counterpartyId =
      debt.counterpartyId || extractCounterpartyIdFromUrl(current);

    if (!viewerId || !counterpartyId) {
      return currentUrl;
    }

    const url = new URL("/api/share/debt", current.origin);
    const versionSource = debt.latestActivityAt || new Date().toISOString();

    const token = encodeDebtToken(viewerId, counterpartyId);
    url.searchParams.set("t", token);
    url.searchParams.set("v", toVersionToken(versionSource));

    return url.toString();
  } catch {
    return currentUrl;
  }
}
