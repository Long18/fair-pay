// ─── Manual Catalog Overrides ─────────────────────────────────────────────────
// Add entries here to override or enrich auto-generated catalog entries.
// Keys must match the `id` field in catalog.generated.ts.
// Changes here are never overwritten by the generator.

import type { ApiCatalogEntry } from './types';

/**
 * Partial overrides keyed by entry ID.
 * Any field here is deeply merged over the generated entry at runtime.
 */
export const catalogOverrides: Partial<Record<string, Partial<ApiCatalogEntry>>> = {
  // Example override — add richer description and example to an entry:
  // 'rpc-is-admin': {
  //   description: 'Used in AdminGuard and use-is-admin hook. Safe to call from any authenticated user.',
  //   response_examples: [
  //     { status: 200, description: 'Admin user', body: true },
  //     { status: 200, description: 'Non-admin user', body: false },
  //   ],
  // },

  // Webhook entries — document as disabled with rationale
  'http-webhooks-momo': {
    description: 'Receives MoMo payment confirmations. Requires MoMo HMAC signature validation. Not invocable from the console — webhook-only endpoint.',
    callability: 'disabled',
  },

  'edge-sepay-webhook': {
    description: 'Receives SePay VietQR payment confirmations. Validated via shared secret. Not invocable from the console.',
    callability: 'disabled',
  },
};
