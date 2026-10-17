import type { AuditLogEntry } from "../../types";
import type { AuditEntityHints } from "./use-audit-entities";

/** DEV-only fixture for UI review (`?auditPreview=1` on audit logs tab). */
export const AUDIT_PREVIEW_ENTRY: AuditLogEntry = {
  id: "preview-audit-settle-summary",
  source: "audit_logs",
  timestamp: new Date().toISOString(),
  actor_id: "00000000-0000-0000-0000-000000000002",
  actor_name: "Admin User",
  actor_email: "admin@fairpay.local",
  actor_avatar_url: null,
  action_type: "SETTLE_SUMMARY",
  table_name: "expense_splits",
  entity_type: null,
  entity_id: "11111111-1111-4111-8111-111111111111",
  old_data: {
    splits: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        user_id: "00000000-0000-0000-0000-000000000003",
        expense_id: "33333333-3333-4333-8333-333333333333",
        group_id: "44444444-4444-4444-8444-444444444444",
        computed_amount: 150_000,
        remaining_amount: 0,
        is_settled: true,
        settled_at: new Date().toISOString(),
      },
    ],
  },
  new_data: {
    settlement_id: "11111111-1111-4111-8111-111111111111",
    split_ids: ["22222222-2222-4222-8222-222222222222"],
    splits_updated: 4,
    total_amount: 601_822,
    currency: "VND",
    counterparty_ids: ["00000000-0000-0000-0000-000000000004"],
    group_ids: ["44444444-4444-4444-8444-444444444444"],
    actor_id: "00000000-0000-0000-0000-000000000002",
  },
  metadata: null,
};

/** Labels for dev preview (IDs are not in the local DB). */
export const AUDIT_PREVIEW_ENTITY_HINTS: AuditEntityHints = {
  users: [
    {
      id: "00000000-0000-0000-0000-000000000002",
      full_name: "Admin User",
      avatar_url: null,
    },
    {
      id: "00000000-0000-0000-0000-000000000003",
      full_name: "Minh Anh",
      avatar_url: null,
    },
    {
      id: "00000000-0000-0000-0000-000000000004",
      full_name: "Bảo Châu",
      avatar_url: null,
    },
  ],
  groups: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      name: "Roommates Q3",
      avatar_url: null,
    },
  ],
  expenses: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      description: "Tiền điện tháng 9",
      amount: 450_000,
      currency: "VND",
      expense_date: "2025-09-15",
      group_id: "44444444-4444-4444-8444-444444444444",
    },
  ],
};
