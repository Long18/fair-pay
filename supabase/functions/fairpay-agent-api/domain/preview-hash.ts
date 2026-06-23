// Canonical JSON + SHA-256 hash for preview integrity.
//
// The hash binds the actor + the immutable preview content. The Edge function
// stores the canonical JSON server-side and returns only id+hash to clients;
// confirm + commit re-supply the hash so we can detect tampering on either
// side of the wire.

/**
 * Stable JSON serializer: object keys are sorted recursively. Arrays are
 * preserved in their input order (split order is part of the contract).
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(canonicalValue(value))
}

function canonicalValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(canonicalValue)
  const obj = value as Record<string, unknown>
  const sorted: Record<string, unknown> = {}
  for (const k of Object.keys(obj).sort()) {
    sorted[k] = canonicalValue(obj[k])
  }
  return sorted
}

/**
 * SHA-256 of the canonical JSON, hex-encoded. Uses the Web Crypto API
 * available in Deno + modern browsers.
 */
export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  const bytes = new Uint8Array(buf)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

export async function hashPreview(value: unknown): Promise<string> {
  return sha256Hex(canonicalize(value))
}
