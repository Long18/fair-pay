import { describe, expect, it } from "vitest";

import { normalizeEmailOverview, normalizeReminderRequests } from "../../api/admin/email/[action]";

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
