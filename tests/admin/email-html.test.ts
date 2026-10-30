import { describe, expect, it } from "vitest";

import { buildInviteEmailPreview } from "@/modules/admin/email/invite-email";
import { buildReminderEmailPreview } from "@/modules/admin/email/reminder-email";

describe("admin email HTML previews", () => {
  it("renders invite email with a clear CTA and no empty panel marker", async () => {
    const preview = await buildInviteEmailPreview({
      emails: ["noreply.long.fairpay@gmail.com"],
      inviterName: "Long",
      appUrl: "https://long-pay.vercel.app",
    });

    expect(preview.subject).toContain("FairPay");
    expect(preview.html).toContain("Bắt đầu với FairPay");
    expect(preview.html).toContain("https://long-pay.vercel.app");
    expect(preview.html).not.toContain("undefined");
  });

  it("renders debt reminder email with a /balances CTA and group as a hint, not a link", async () => {
    const counterparty = { counterpartyKey: "u-long", counterpartyName: "Long", amount: 250000, currency: "VND" };
    const preview = await buildReminderEmailPreview({
      recipient: { name: "Test Debtor", hasAccount: true },
      appUrl: "https://long-pay.vercel.app",
      context: {
        totalAmount: 250000,
        debtBreakdown: [counterparty],
        groupBreakdown: [{ groupId: "abc-123", groupName: "Trip group", subtotalAmount: 250000, currency: "VND", counterparties: [counterparty] }],
      },
    });

    expect(preview.html).toContain("Test Debtor");
    expect(preview.html).toContain("250.000");
    expect(preview.html).toContain("Trip group");
    expect(preview.html).toContain("https://long-pay.vercel.app/balances?src=email_reminder");
    expect(preview.html).not.toContain("/groups/abc-123");
    expect(preview.html).not.toContain("undefined");
  });

  it("renders reminder email for non-auth user with /register CTA", async () => {
    const preview = await buildReminderEmailPreview({
      recipient: { name: "Guest", hasAccount: false },
      appUrl: "https://long-pay.vercel.app",
      context: { debtBreakdown: [{ counterpartyName: "Long", amount: 100000, currency: "VND" }] },
    });

    expect(preview.html).toContain("https://long-pay.vercel.app/register");
    expect(preview.html).not.toContain("/balances");
  });
});
