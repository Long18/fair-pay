/**
 * Compact share-link tokens.
 *
 * Encodes two UUIDs (viewer + counterparty) into a single base64url string
 * (~43 chars) instead of passing them as separate query params (~72 chars).
 *
 * Format: base64url( viewer_uuid_bytes ‖ counterparty_uuid_bytes )
 *         = 32 raw bytes → 43 base64url characters
 */

/** Strip hyphens from a UUID and convert the 32 hex chars to 16 bytes. */
function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '')
  if (hex.length !== 32) throw new Error('Invalid UUID length')
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/** Convert 16 bytes back to a UUID string with hyphens. */
function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}

/** Standard base64 → base64url (URL-safe, no padding). */
function toBase64Url(buf: Uint8Array): string {
  // Node/Edge: Buffer is available in Vercel functions
  const b64 = typeof Buffer !== 'undefined'
    ? Buffer.from(buf).toString('base64')
    : btoa(String.fromCharCode(...buf))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** base64url → bytes. */
function fromBase64Url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(padded, 'base64'))
  }
  const binary = atob(padded)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

// ── Public API ──────────────────────────────────────────────────────────

export interface DebtShareIds {
  viewerId: string
  counterpartyId: string
}

/**
 * Encode viewer + counterparty UUIDs into a compact token.
 *
 * @example
 *   encodeDebtToken('9ac73f98-...', '18441dda-...')
 *   // → "msxz-Yb_VN2DN-loFugU5RhEHdpP31f-gp4F3XlZJZc"
 */
export function encodeDebtToken(viewerId: string, counterpartyId: string): string {
  const buf = new Uint8Array(32)
  buf.set(uuidToBytes(viewerId), 0)
  buf.set(uuidToBytes(counterpartyId), 16)
  return toBase64Url(buf)
}

/**
 * Decode a compact token back to viewer + counterparty UUIDs.
 * Returns `null` if the token is malformed.
 */
export function decodeDebtToken(token: string): DebtShareIds | null {
  try {
    const buf = fromBase64Url(token)
    if (buf.length !== 32) return null
    return {
      viewerId: bytesToUuid(buf.slice(0, 16)),
      counterpartyId: bytesToUuid(buf.slice(16, 32)),
    }
  } catch {
    return null
  }
}
