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
  'http-api-webhooks-momo': {
    description: 'Receives MoMo payment confirmations. Requires MoMo HMAC signature validation. Not invocable from the console — webhook-only endpoint.',
    callability: 'disabled',
  },

  'edge-sepay-webhook': {
    description: 'Receives SePay VietQR payment confirmations. Validated via shared secret. Not invocable from the console.',
    callability: 'disabled',
  },

  'http-api-admin-api-console-execute': {
    description: 'Internal admin proxy endpoint used by this API console. Disabled to prevent recursive self-invocation.',
    callability: 'disabled',
  },

  // ─── HTTP enrichments ──────────────────────────────────────────────────────

  'http-api-og-expense': {
    description: 'Returns an Open Graph image (PNG) for an expense. Used for social sharing previews.',
    params: [
      { name: 'id', type: 'uuid', required: true, example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Expense UUID' },
    ],
    response_examples: [
      { status: 200, description: 'PNG image buffer', body: '<image/png binary>' },
      { status: 400, description: 'Missing id param', body: { error: 'Missing expense id' } },
    ],
  },

  'http-api-debt-who-owes-who': {
    description: 'Returns a simplified debt graph showing who owes whom across all users.',
    response_examples: [
      { status: 200, description: 'Debt matrix', body: [{ from: 'user-a', to: 'user-b', amount: 150000, currency: 'VND' }] },
    ],
  },

  'http-api-debt-all-users-summary': {
    description: 'Aggregate debt summary per user — total owed and total owing.',
    response_examples: [
      { status: 200, description: 'Summary list', body: [{ user_id: 'uuid', total_owed: 500000, total_owing: 200000 }] },
    ],
  },

  // ─── RPC enrichments ───────────────────────────────────────────────────────

  'rpc-is-admin': {
    description: 'Returns true if the calling user has the admin role. Used in AdminGuard and useIsAdmin hook.',
    response_examples: [
      { status: 200, description: 'Admin user', body: true },
      { status: 200, description: 'Non-admin user', body: false },
    ],
  },

  'rpc-get-user-debts-public': {
    description: 'Returns all debts for a given user (public-safe view). Used in the public debt share page.',
    params: [
      { name: 'p_user_id', type: 'uuid', required: true, example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Target user UUID' },
    ],
    response_examples: [
      { status: 200, description: 'Debt list', body: [{ creditor_id: 'uuid', amount: 75000, currency: 'VND', expense_title: 'Lunch' }] },
    ],
  },

  'rpc-get-expense-splits-public': {
    description: 'Returns splits for an expense without requiring authentication. Used for OG image generation.',
    params: [
      { name: 'p_expense_id', type: 'uuid', required: true, example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Expense UUID' },
    ],
    response_examples: [
      { status: 200, description: 'Split list', body: [{ user_id: 'uuid', display_name: 'Alice', share: 50000, is_settled: false }] },
    ],
  },

  'rpc-settle-split': {
    description: 'Marks a single expense split as settled and records a payment event.',
    params: [
      { name: 'p_split_id', type: 'uuid', required: true, example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Split UUID to settle' },
    ],
    response_examples: [
      { status: 200, description: 'Success', body: true },
      { status: 200, description: 'Not found / already settled', body: false },
    ],
  },

  'rpc-settle-splits-batch': {
    description: 'Settles multiple splits in one transaction. Used for "Settle All" bulk operations.',
    params: [
      { name: 'p_split_ids', type: 'uuid[]', required: true, example: ['id-1', 'id-2'], description: 'Array of split UUIDs' },
    ],
    response_examples: [
      { status: 200, description: 'Settled count', body: { settled: 3 } },
    ],
  },

  'rpc-get-user-balance': {
    description: 'Calculates the net balance for the calling user across all unsettled splits.',
    response_examples: [
      { status: 200, description: 'Net balance (positive = owed money)', body: { balance: 125000, currency: 'VND' } },
    ],
  },

  'rpc-get-admin-stats': {
    description: 'Returns high-level platform statistics for the admin overview dashboard.',
    response_examples: [
      { status: 200, description: 'Stats object', body: { total_users: 42, total_expenses: 318, total_groups: 15, total_settled: 210 } },
    ],
  },

  'rpc-get-admin-users': {
    description: 'Returns all users with their roles, join dates, and activity metadata.',
    response_examples: [
      { status: 200, description: 'User list', body: [{ id: 'uuid', email: 'alice@example.com', role: 'user', created_at: '2024-01-15T10:00:00Z' }] },
    ],
  },

  'rpc-read-admin-audit-logs': {
    description: 'Paginated audit log reader for admins. Supports filtering by actor, action type, and date range.',
    params: [
      { name: 'p_limit', type: 'integer', required: false, example: 25, description: 'Page size (default 25)' },
      { name: 'p_offset', type: 'integer', required: false, example: 0, description: 'Pagination offset' },
      { name: 'p_actor_id', type: 'uuid', required: false, example: null, description: 'Filter by actor user ID' },
    ],
    response_examples: [
      { status: 200, description: 'Log page', body: { entries: [{ id: 'uuid', actor_id: 'uuid', action_type: 'expense_created', created_at: '2025-03-01T12:00:00Z' }], total: 142 } },
    ],
  },

  'rpc-bulk-delete-expenses': {
    description: 'Hard-deletes multiple expenses and their associated splits. Irreversible — use with caution.',
    params: [
      { name: 'p_expense_ids', type: 'uuid[]', required: true, example: ['id-1', 'id-2'], description: 'Expense UUIDs to delete' },
    ],
    response_examples: [
      { status: 200, description: 'Deleted count', body: { deleted: 2 } },
    ],
  },

  'rpc-admin-update-user-role': {
    description: 'Grants or revokes the admin role for a given user. Only callable by existing admins.',
    params: [
      { name: 'p_user_id', type: 'uuid', required: true, example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Target user UUID' },
      { name: 'p_role', type: 'text', required: true, example: 'admin', description: '"admin" or "user"' },
    ],
    response_examples: [
      { status: 200, description: 'Success', body: true },
    ],
  },

  'rpc-get-expense-og-data': {
    description: 'Returns expense metadata formatted for OG image rendering (title, amount, participants).',
    params: [
      { name: 'p_expense_id', type: 'uuid', required: true, example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Expense UUID' },
    ],
    response_examples: [
      { status: 200, description: 'OG data', body: { title: 'Team Lunch', amount: 300000, currency: 'VND', participants: ['Alice', 'Bob'] } },
    ],
  },

  'rpc-get-who-owes-who': {
    description: 'Returns the simplified debt graph for the calling user or all users (admin).',
    response_examples: [
      { status: 200, description: 'Debt graph', body: [{ from_user: 'Alice', to_user: 'Bob', amount: 50000 }] },
    ],
  },
};
