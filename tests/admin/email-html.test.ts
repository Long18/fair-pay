import { describe, expect, it } from "vitest";

import { buildInviteEmailPreview } from "@/modules/admin/email/invite-email";
import { buildReminderEmailPreview } from "@/modules/admin/email/reminder-email";

describe("admin email HTML previews", () => {
  it("renders invite email with a clear CTA and no empty panel marker", () => {
    const preview = buildInviteEmailPreview({
      emails: ["noreply.long.fairpay@gmail.com"],
      inviterName: "Long",
      appUrl: "https://long-pay.vercel.app",
    });

    expect(preview.subject).toContain("FairPay");
    expect(preview.html).toContain("Bắt đầu với FairPay");
    expect(preview.html).toContain("https://long-pay.vercel.app");
    expect(preview.html).not.toContain("undefined");
  });

  it("renders debt reminder email with CTA pointing to /balances (deeplink)", () => {
    const preview = buildReminderEmailPreview({
      userName: "Test Debtor",
      title: "Payment debt reminder",
      message: "Please settle your FairPay balance.",
      totalAmount: 250000,
      hasAuthAccount: true,
      appUrl: "https://long-pay.vercel.app",
      link: "/dashboard",
      debtBreakdown: [
        {
          counterpartyName: "Long",
          amount: 250000,
          currency: "VND",
          transactions: [
            {
              description: "Dinner",
              expenseDate: "2026-06-28",
              amount: 250000,
              currency: "VND",
            },
          ],
        },
      ],
      groupBreakdown: [
        {
          groupId: "abc-123",
          groupName: "Trip group",
          subtotalAmount: 250000,
          currency: "VND",
          counterparties: [
            {
              counterpartyName: "Long",
              amount: 250000,
              currency: "VND",
              transactions: [],
            },
          ],
        },
      ],
    });

    expect(preview.html).toContain("Test Debtor");
    expect(preview.html).toContain("250.000");
    expect(preview.html).toContain("Trip group");
    // Smart CTA deeplink: reminder emails always go to /balances
    expect(preview.html).toContain("https://long-pay.vercel.app/balances");
    // Group header deeplink to specific group page
    expect(preview.html).toContain("https://long-pay.vercel.app/groups/abc-123");
    expect(preview.html).not.toContain("undefined");
  });

  it("renders reminder email for non-auth user with /register CTA", () => {
    const preview = buildReminderEmailPreview({
      userName: "Guest",
      title: "You owe money",
      message: "Pay up",
      totalAmount: 100000,
      hasAuthAccount: false,
      appUrl: "https://long-pay.vercel.app",
    });

    expect(preview.html).toContain("https://long-pay.vercel.app/register");
    expect(preview.html).not.toContain("/balances");
  });
});
