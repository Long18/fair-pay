import { describe, expect, it } from "vitest";

import {
  normalizeEmailOverview,
  normalizeReminderRequests,
  stampReminderEmailContext,
} from "../../api/admin/email/[action]";
import {
  buildReminderContextMeta,
  partitionReminderRowsByCurrency,
} from "../../src/modules/admin/pages/admin-devtool/helpers";
import type { DebtReminderRow } from "../../src/modules/admin/pages/admin-devtool/types";

function debtRow(overrides: Partial<DebtReminderRow> = {}): DebtReminderRow {
  return {
    user_id: "user-1",
    full_name: "An",
    email: "an@example.com",
    emails: [],
    avatar_url: null,
    has_auth_account: true,
    total_i_owe: 850000,
    net_balance: -850000,
    active_debt_relationships: 3,
    debt_breakdown: [
      {
        counterparty_key: "u-minh",
        counterparty_name: "Minh Tuấn",
        counterparty_email: null,
        amount: 350000,
        currency: "VND",
        direction: "user_owes_counterparty",
        transactions: [],
      },
    ],
    group_breakdown: [
      { group_id: "g-1", group_name: "Chuyến Đà Nẵng 2026", group_avatar_url: null, subtotal_amount: 600000, currency: "VND", counterparties: [] },
      { group_id: "g-2", group_name: "Chi phí sinh hoạt Q2", group_avatar_url: null, subtotal_amount: 250000, currency: "VND", counterparties: [] },
      { group_id: null, group_name: "Ngoài nhóm", group_avatar_url: null, subtotal_amount: 900000, currency: "VND", counterparties: [] },
    ],
    ...overrides,
  };
}

describe("reminder enqueue context", () => {
  it("stamps currency, largest real group and snapshot time", () => {
    expect(buildReminderContextMeta(debtRow(), new Date("2026-10-30T04:00:00.000Z"))).toEqual({
      primary_currency: "VND",
      primary_group_name: "Chuyến Đà Nẵng 2026",
      computed_at: "2026-10-30T04:00:00.000Z",
    });
  });

  it("excludes rows that owe in more than one currency", () => {
    const usdRow = debtRow({
      user_id: "user-2",
      debt_breakdown: [
        ...debtRow().debt_breakdown,
        { ...debtRow().debt_breakdown[0], counterparty_key: "u-bob", currency: "USD", amount: 20 },
      ],
    });
    const { eligible, excluded } = partitionReminderRowsByCurrency([debtRow(), usdRow]);
    expect(eligible.map((row) => row.user_id)).toEqual(["user-1"]);
    expect(excluded.map((row) => row.user_id)).toEqual(["user-2"]);
  });

  it("server stamps sender name and keeps the client snapshot time", () => {
    expect(
      stampReminderEmailContext(
        { total_amount: 1, computed_at: "2026-10-30T04:00:00.000Z" },
        { senderDisplayName: "Long", computedAt: "2026-10-30T05:00:00.000Z" },
      ),
    ).toEqual({ total_amount: 1, computed_at: "2026-10-30T04:00:00.000Z", sender_display_name: "Long" });
    expect(stampReminderEmailContext(null, { senderDisplayName: "Long", computedAt: "x" })).toBeNull();
  });
});

describe("admin email API helpers", () => {
  it("maps RPC overview data into stable endpoint fields", () => {
    const debtor = {
      user_id: "user-1",
      full_name: "Test Debtor",
      email: "debtor@example.com",
      total_i_owe: 125000,
    };

    expect(normalizeEmailOverview({ pending_queue_count: 3, debtors: [debtor] })).toEqual({
      pending_queue_count: 3,
      debtors: [debtor],
    });
  });

  it("falls back to empty overview fields for malformed RPC data", () => {
    expect(normalizeEmailOverview({ pending_queue_count: "3", debtors: null })).toEqual({
      pending_queue_count: 0,
      debtors: [],
    });
  });

  it("preserves selected recipient emails and reminder email context", () => {
    const emailContext = {
      total_amount: 125000,
      debt_breakdown: [{ counterparty_name: "Long", amount: 125000, currency: "VND" }],
    };

    expect(
      normalizeReminderRequests({
        reminders: [
          {
            user_id: "user-1",
            title: "Payment debt reminder",
            message: "Please settle up",
            link: "/dashboard",
            recipient_emails: ["noreply.long.fairpay@gmail.com"],
            email_context: emailContext,
          },
          {
            user_id: "user-2",
            title: "Missing message",
          },
        ],
      }),
    ).toEqual([
      {
        user_id: "user-1",
        title: "Payment debt reminder",
        message: "Please settle up",
        link: "/dashboard",
        recipient_emails: ["noreply.long.fairpay@gmail.com"],
        email_context: emailContext,
      },
    ]);
  });
});
