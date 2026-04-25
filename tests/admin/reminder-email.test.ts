import { describe, expect, it } from "vitest";

import { buildReminderEmailPreview } from "@/modules/admin/email/reminder-email";

describe("admin reminder email helpers", () => {
  it("renders who owes whom with responsive email-safe markup", () => {
    const preview = buildReminderEmailPreview({
      userName: "Long",
      title: "Nhắc thanh toán công nợ",
      message: "Long, bạn đang có 4.868 ₫ cần thanh toán trên FairPay.",
      appUrl: "https://long-pay.vercel.app/",
      link: "/dashboard",
      totalAmount: 4868,
      debtBreakdown: [
        {
          counterpartyName: "Lê A",
          counterpartyEmail: "a@example.com",
          amount: 4868,
          currency: "VND",
          transactions: [
            {
              description: "Bún bò cuối tuần",
              amount: 3000,
              currency: "VND",
              expenseDate: "2026-04-25",
            },
            {
              description: "Cà phê nhóm",
              amount: 1868,
              currency: "VND",
              expenseDate: "2026-04-24",
            },
          ],
        },
      ],
    });

    expect(preview.html).toContain("Chi tiết công nợ / Debt breakdown");
    expect(preview.html).toContain("Lê A");
    expect(preview.html).toContain("a@example.com");
    expect(preview.html).toContain("Bún bò cuối tuần");
    expect(preview.html).toContain("Cà phê nhóm");
    expect(preview.html).toContain("https://long-pay.vercel.app/dashboard");
    expect(preview.text).toContain("You owe Lê A");
    expect(preview.text).toContain("Bún bò cuối tuần");
  });

  it("escapes user-controlled reminder fields and does not emit raw MIME boundaries", () => {
    const preview = buildReminderEmailPreview({
      userName: "<script>alert(1)</script>",
      title: "Nhắc <bad>",
      message: "Pay <now>",
      debtBreakdown: [
        {
          counterpartyName: "<img src=x>",
          amount: 1000,
          currency: "VND",
        },
      ],
    });

    expect(preview.html).not.toContain("<script>");
    expect(preview.html).not.toContain("<img src=x>");
    expect(preview.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(preview.html).toContain("&lt;img src=x&gt;");
    expect(preview.html).not.toContain("--message");
    expect(preview.html).not.toContain("--attachment");
  });
});
