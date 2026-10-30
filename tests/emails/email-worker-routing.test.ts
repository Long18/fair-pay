import { describe, expect, it } from "vitest";

import {
  normalizeReminderEmailContext,
  shouldMarkSent,
  splitRecipientBatch,
  toReminderContextInput,
  type QueueRow,
} from "../../supabase/functions/send-email-notifications/routing";

const context = (total: number, computedAt: string) => ({
  total_amount: total,
  primary_currency: "VND",
  sender_display_name: "Long",
  primary_group_name: "Chuyến Đà Nẵng 2026",
  computed_at: computedAt,
  debt_breakdown: [{ counterparty_key: "u-minh", counterparty_name: "Minh Tuấn", amount: total, currency: "VND" }],
  group_breakdown: [],
});

function row(id: string, type: string, createdAt: string, emailContext: unknown = null): QueueRow {
  return {
    notification_id: id,
    user_id: "user-an",
    user_email: "an@example.com",
    user_name: "An",
    has_auth_account: true,
    notification_type: type,
    title: "t",
    message: "m",
    link: null,
    created_at: createdAt,
    email_context: emailContext,
  };
}

describe("email worker routing", () => {
  it("sends reminders with a snapshot separately from the digest, newest snapshot wins", () => {
    const rows = [
      row("r-old", "settlement_reminder", "2026-10-30T01:00:00Z", context(500000, "2026-10-30T01:00:00Z")),
      row("e-1", "expense_added", "2026-10-30T02:00:00Z"),
      row("r-new", "settlement_reminder", "2026-10-30T03:00:00Z", context(850000, "2026-10-30T03:00:00Z")),
      row("r-legacy", "settlement_reminder", "2026-10-30T04:00:00Z"),
    ];

    const { reminder, digestRows } = splitRecipientBatch(rows);
    expect(reminder?.latest.notification_id).toBe("r-new");
    expect(reminder?.context.total_amount).toBe(850000);
    expect(reminder?.rows.map((item) => item.notification_id)).toEqual(["r-old", "r-new", "r-legacy"]);
    expect(digestRows.map((item) => item.notification_id)).toEqual(["e-1"]);
  });

  it("falls back to a digest row when no reminder has a usable snapshot (F11)", () => {
    const rows = [row("r-legacy", "settlement_reminder", "2026-10-30T04:00:00Z"), row("e-1", "expense_added", "2026-10-30T02:00:00Z")];
    const { reminder, digestRows } = splitRecipientBatch(rows);
    expect(reminder).toBeNull();
    expect(digestRows.map((item) => item.notification_id)).toEqual(["e-1", "r-legacy"]);
  });

  it("marks sent and skipped batches, leaves failed sends for the next run", () => {
    expect(shouldMarkSent("sent")).toBe(true);
    expect(shouldMarkSent("skipped")).toBe(true);
    expect(shouldMarkSent("failed")).toBe(false);
  });

  it("maps the snake_case snapshot into the view model input", () => {
    const normalized = normalizeReminderEmailContext(context(850000, "2026-10-30T04:00:00.000Z"));
    expect(normalized).not.toBeNull();
    expect(toReminderContextInput(normalized!)).toMatchObject({
      totalAmount: 850000,
      primaryCurrency: "VND",
      senderDisplayName: "Long",
      primaryGroupName: "Chuyến Đà Nẵng 2026",
      computedAt: "2026-10-30T04:00:00.000Z",
      debtBreakdown: [{ counterpartyKey: "u-minh", counterpartyName: "Minh Tuấn", amount: 850000, currency: "VND" }],
    });
  });

  it("accepts old snapshots without the new fields", () => {
    const old = normalizeReminderEmailContext({
      total_amount: 1000,
      debt_breakdown: [{ counterparty_key: "k", counterparty_name: "A", amount: 1000, currency: "VND" }],
    });
    expect(old).toMatchObject({ sender_display_name: null, primary_group_name: null, computed_at: null, primary_currency: null });
  });
});
