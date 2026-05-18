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
    expect(preview.html).toContain("@media only screen and (max-width: 640px)");
    expect(preview.html).toContain('class="email-body"');
    expect(preview.html).toContain('class="cta-link"');
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

  it("renders hero imagery and grouped debt sections with avatar fallback plus accessible alt text", () => {
    const preview = buildReminderEmailPreview({
      userName: "Long",
      title: "Nhắc thanh toán công nợ",
      message: "Long, bạn đang có 9.000 ₫ cần thanh toán trên FairPay.",
      totalAmount: 9000,
      groupBreakdown: [
        {
          groupId: "icloud",
          groupName: "iCloud",
          groupAvatarUrl: "https://cdn.example.com/icloud.png",
          subtotalAmount: 5000,
          currency: "VND",
          counterparties: [
            {
              counterpartyName: "An",
              amount: 5000,
              currency: "VND",
              transactions: [{ description: "Storage tháng 5", amount: 5000, currency: "VND" }],
            },
          ],
        },
        {
          groupId: "youtube",
          groupName: "YouTube Premium",
          subtotalAmount: 4000,
          currency: "VND",
          counterparties: [
            {
              counterpartyName: "Bình",
              amount: 4000,
              currency: "VND",
            },
          ],
        },
      ],
    });

    expect(preview.html).toContain("/assets/email/debt-reminder-hero.jpg");
    expect(preview.html).toContain('alt="FairPay debt reminder overview"');
    expect(preview.html).toContain('alt="iCloud"');
    expect(preview.html).toContain("YouTube Premium");
    expect(preview.html).toContain("YP");
    expect(preview.html).toContain('class="group-header-table"');
    expect(preview.html).toContain('class="group-header-amount"');
    expect(preview.html).toContain("Tổng cần trả sau bù trừ");
    expect(preview.html).toContain("subtotal có thể khác tổng chính thức sau bù trừ");
    expect(preview.text).toContain("iCloud");
    expect(preview.text).toContain("Storage tháng 5");
  });

  it("uses register CTA for placeholder recipients", () => {
    const preview = buildReminderEmailPreview({
      userName: "Placeholder",
      title: "Nhắc thanh toán công nợ",
      message: "Bạn còn nợ.",
      hasAuthAccount: false,
      totalAmount: 1000,
      debtBreakdown: [
        {
          counterpartyName: "An",
          amount: 1000,
          currency: "VND",
        },
      ],
    });

    expect(preview.html).toContain("Tạo tài khoản để xem chi tiết / Create account to view");
    expect(preview.html).toContain("https://long-pay.vercel.app/register");
    expect(preview.text).toContain("Create your FairPay account: https://long-pay.vercel.app/register");
  });

  it("keeps legacy debt-only notifications readable when group data is absent", () => {
    const preview = buildReminderEmailPreview({
      userName: "Legacy",
      title: "Nhắc thanh toán công nợ",
      message: "Bạn còn nợ.",
      totalAmount: 1200,
      debtBreakdown: [
        {
          counterpartyName: "An",
          amount: 1200,
          currency: "VND",
        },
      ],
    });

    expect(preview.html).toContain("Các khoản bên dưới được nhóm theo người bạn cần thanh toán.");
    expect(preview.html).toContain("An");
    expect(preview.html).not.toContain("subtotal có thể khác tổng chính thức sau bù trừ");
  });
});
