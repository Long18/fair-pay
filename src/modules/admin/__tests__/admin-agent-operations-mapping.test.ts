import { describe, it, expect } from "vitest";
import {
  formatVndAmount,
  buildDetailViewModel,
  statusBadgeVariant,
  FORBIDDEN_AGENT_OPERATION_FIELDS,
} from "../pages/admin-agent-operations.utils";
import type { AgentOperationRow, AgentOperationStatus } from "../types";

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<AgentOperationRow> = {}): AgentOperationRow {
  return {
    operation_id: "op-uuid-1",
    user_id: "user-uuid-1",
    user_full_name: "Nguyễn Văn A",
    user_email: "a@example.com",
    status: "committed",
    source: "internal_mcp",
    preview_id: "preview-uuid-1",
    group_id: "group-uuid-1",
    group_name: "Nhóm Test",
    description: "Bữa tối",
    category: "Food & Drink",
    expense_date: "2026-06-23",
    split_method: "equal",
    payer_user_id: "payer-uuid-1",
    payer_full_name: "Nguyễn Văn A",
    expense_id: "expense-uuid-1",
    total_amount: 500000,
    currency: "VND",
    splits_count: 3,
    error_code: null,
    error_message: null,
    created_at: "2026-06-23T08:00:00Z",
    updated_at: "2026-06-23T08:00:10Z",
    preview_expires_at: "2026-06-23T08:10:00Z",
    preview_is_consumed: true,
    has_confirmation: true,
    confirmation_used: true,
    ...overrides,
  };
}

// ─── formatVndAmount ──────────────────────────────────────────────────────────

describe("formatVndAmount", () => {
  it("formats integer VND with Vietnamese locale and ₫ symbol", () => {
    const result = formatVndAmount(500000);
    expect(result).toContain("₫");
    expect(result).toContain("500");
  });

  it("returns null for null amount", () => {
    expect(formatVndAmount(null)).toBeNull();
  });

  it("returns null for undefined amount", () => {
    expect(formatVndAmount(undefined)).toBeNull();
  });

  it("formats zero correctly", () => {
    const result = formatVndAmount(0);
    expect(result).not.toBeNull();
    expect(result).toContain("₫");
  });

  it("formats large amounts without overflow", () => {
    // Max valid VND amount per migration: 9999999999
    const result = formatVndAmount(9999999999);
    expect(result).toContain("₫");
    expect(result).not.toBeNull();
  });
});

// ─── buildDetailViewModel ─────────────────────────────────────────────────────

describe("buildDetailViewModel – safe field mapping", () => {
  it("maps all whitelisted fields from the row", () => {
    const row = makeRow();
    const vm = buildDetailViewModel(row);

    expect(vm.operation_id).toBe(row.operation_id);
    expect(vm.user_id).toBe(row.user_id);
    expect(vm.user_full_name).toBe(row.user_full_name);
    expect(vm.user_email).toBe(row.user_email);
    expect(vm.status).toBe(row.status);
    expect(vm.source).toBe(row.source);
    expect(vm.preview_id).toBe(row.preview_id);
    expect(vm.group_id).toBe(row.group_id);
    expect(vm.group_name).toBe(row.group_name);
    expect(vm.description).toBe(row.description);
    expect(vm.payer_full_name).toBe(row.payer_full_name);
    expect(vm.split_method).toBe(row.split_method);
    expect(vm.expense_id).toBe(row.expense_id);
    expect(vm.total_amount).toBe(row.total_amount);
    expect(vm.currency).toBe(row.currency);
    expect(vm.splits_count).toBe(row.splits_count);
    expect(vm.error_code).toBe(row.error_code);
    expect(vm.error_message).toBe(row.error_message);
    expect(vm.created_at).toBe(row.created_at);
    expect(vm.updated_at).toBe(row.updated_at);
    expect(vm.preview_expires_at).toBe(row.preview_expires_at);
    expect(vm.preview_is_consumed).toBe(row.preview_is_consumed);
    expect(vm.has_confirmation).toBe(true);
    expect(vm.confirmation_used).toBe(true);
  });

  it.each(FORBIDDEN_AGENT_OPERATION_FIELDS)(
    "never includes forbidden field '%s' in the view model",
    (field) => {
      const row = makeRow();
      const vm = buildDetailViewModel(row);
      expect(Object.prototype.hasOwnProperty.call(vm, field)).toBe(false);
    }
  );

  it("handles null nullable fields gracefully", () => {
    const row = makeRow({
      user_full_name: null,
      user_email: null,
      source: null,
      preview_id: null,
      group_id: null,
      group_name: null,
      description: null,
      category: null,
      expense_date: null,
      split_method: null,
      payer_user_id: null,
      payer_full_name: null,
      expense_id: null,
      total_amount: null,
      currency: null,
      splits_count: null,
      error_code: null,
      error_message: null,
      preview_expires_at: null,
      preview_is_consumed: null,
      has_confirmation: false,
      confirmation_used: null,
    });
    const vm = buildDetailViewModel(row);
    expect(vm.user_full_name).toBeNull();
    expect(vm.expense_id).toBeNull();
    expect(vm.total_amount).toBeNull();
  });

  it("committed rows have expense_id, total_amount, splits_count", () => {
    const row = makeRow({ status: "committed", expense_id: "exp-1", total_amount: 100000, splits_count: 2 });
    const vm = buildDetailViewModel(row);
    expect(vm.expense_id).toBe("exp-1");
    expect(vm.total_amount).toBe(100000);
    expect(vm.splits_count).toBe(2);
  });

  it("failed rows have error_code and error_message; no expense fields", () => {
    const row = makeRow({
      status: "failed",
      expense_id: null,
      total_amount: null,
      splits_count: null,
      currency: null,
      error_code: "INVALID_EXPENSE_DATA",
      error_message: "Split sum mismatch",
    });
    const vm = buildDetailViewModel(row);
    expect(vm.error_code).toBe("INVALID_EXPENSE_DATA");
    expect(vm.error_message).toBe("Split sum mismatch");
    expect(vm.expense_id).toBeNull();
  });
});

// ─── statusBadgeVariant ───────────────────────────────────────────────────────

const ALL_STATUSES: AgentOperationStatus[] = [
  "pending", "previewed", "confirmed", "committed", "failed", "expired",
];

const ALLOWED_VARIANTS = ["default", "secondary", "destructive", "outline"] as const;
type AllowedVariant = typeof ALLOWED_VARIANTS[number];

describe("statusBadgeVariant", () => {
  it.each(ALL_STATUSES)(
    "returns a valid Badge variant for status '%s'",
    (status) => {
      const variant = statusBadgeVariant(status);
      expect(ALLOWED_VARIANTS).toContain(variant as AllowedVariant);
    }
  );

  it("maps 'committed' to 'default' (primary success colour)", () => {
    expect(statusBadgeVariant("committed")).toBe("default");
  });

  it("maps 'failed' to 'destructive'", () => {
    expect(statusBadgeVariant("failed")).toBe("destructive");
  });

  it("maps 'pending' and 'expired' to 'secondary' (neutral)", () => {
    expect(statusBadgeVariant("pending")).toBe("secondary");
    expect(statusBadgeVariant("expired")).toBe("secondary");
  });
});

// ─── FORBIDDEN_AGENT_OPERATION_FIELDS ────────────────────────────────────────

describe("FORBIDDEN_AGENT_OPERATION_FIELDS constant", () => {
  it("includes all security-critical fields", () => {
    const forbidden = FORBIDDEN_AGENT_OPERATION_FIELDS as readonly string[];
    expect(forbidden).toContain("preview_hash");
    expect(forbidden).toContain("confirmation_id");
    expect(forbidden).toContain("idempotency_key");
    expect(forbidden).toContain("response_body");
    expect(forbidden).toContain("preview_data");
  });

  it("does NOT include safe display fields", () => {
    const forbidden = FORBIDDEN_AGENT_OPERATION_FIELDS as readonly string[];
    // These are safe and should always be present
    expect(forbidden).not.toContain("operation_id");
    expect(forbidden).not.toContain("status");
    expect(forbidden).not.toContain("created_at");
    expect(forbidden).not.toContain("user_email");
  });
});
