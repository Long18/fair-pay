import { describe, expect, it } from "vitest";

import { reminderFixtures } from "@fairpay/emails";
import { buildReminderEmailPreview } from "@/modules/admin/email/reminder-email";

const F2 = reminderFixtures.find((fixture) => fixture.id === "F2")!.input;

describe("admin reminder email helpers", () => {
  it("renders the per-person layout with one CTA and no legacy blocks", async () => {
    const preview = await buildReminderEmailPreview(F2);

    expect(preview.subject).toBe("FairPay: Còn 850.000\u00a0₫ chưa settle với 3 người");
    expect(preview.html).toContain('data-email-shell="fairpay-transactional"');
    expect(preview.html).toContain('data-email-block="counterparty-list"');
    expect(preview.html).toContain("Minh Tuấn");
    expect(preview.html).toContain("Chi phí sinh hoạt Q2");
    expect(preview.html).toContain("Tổng cần settle");
    expect(preview.html).toContain('class="cta-link"');
    expect(preview.html).toContain("https://long-pay.vercel.app/balances?src=email_reminder");
    expect(preview.html).toContain("@media only screen and (max-width: 640px)");

    expect(preview.html).not.toContain("<img");
    expect(preview.html).not.toContain("/groups/");
    expect(preview.html).not.toContain('data-email-block="notification-card"');
    expect(preview.html).not.toContain(" / ");
    expect(preview.html.match(/<a\s/g)).toHaveLength(1);
  });

  it("shows the total exactly once in the visible body", async () => {
    const preview = await buildReminderEmailPreview(F2);
    const body = preview.html.slice(preview.html.indexOf('data-email-block="wordmark"'));
    expect(body.split("850.000").length - 1).toBe(1);
  });

  it("escapes user-controlled names", async () => {
    const preview = await buildReminderEmailPreview({
      recipient: { name: "<script>alert(1)</script>", hasAccount: true },
      context: {
        debtBreakdown: [{ counterpartyKey: "x", counterpartyName: "<img src=x>", amount: 1000, currency: "VND" }],
      },
    });

    expect(preview.html).not.toContain("<script>");
    expect(preview.html).not.toContain("<img src=x>");
    expect(preview.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(preview.html).toContain("&lt;img src=x&gt;");
  });

  it("uses the guest trust line, register CTA and guest footer", async () => {
    const preview = await buildReminderEmailPreview(reminderFixtures.find((fixture) => fixture.id === "F3")!.input);

    expect(preview.html).toContain("Long dùng FairPay để chia chi phí nhóm Chuyến Đà Nẵng 2026.");
    expect(preview.html).toContain("Tạo tài khoản FairPay");
    expect(preview.html).toContain("https://long-pay.vercel.app/register?src=email_reminder");
    expect(preview.html).not.toContain("/balances");
    expect(preview.html).toContain("Bạn nhận email này vì Long đã thêm email của bạn vào một nhóm trên FairPay.");
    expect(preview.text).toContain("Tạo tài khoản FairPay: https://long-pay.vercel.app/register?src=email_reminder");
  });

  it("renders the overflow line after the top 5", async () => {
    const preview = await buildReminderEmailPreview(reminderFixtures.find((fixture) => fixture.id === "F4")!.input);
    expect(preview.html).toContain("và 2 người khác — xem đầy đủ trong FairPay");
    expect(preview.html).not.toContain("Gia Huy");
  });
});
