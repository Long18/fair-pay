import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { cleanEditorHtml, renderDebtReminderEmail, renderInviteEmail } from "@fairpay/emails";

const repoRoot = path.resolve(__dirname, "../..");

describe("React Email transactional templates", () => {
  it("applies editor-authored static content and escapes placeholder values in rich HTML", async () => {
    const email = await renderInviteEmail({
      inviterName: "<b>Mallory</b>",
      appUrl: "https://long-pay.vercel.app",
      content: {
        subject: "{{inviterName}} rủ bạn dùng FairPay",
        bodyHtml: '<p>Chào bạn, <strong>{{inviterName}}</strong> đang chờ.</p><script>alert(1)</script><p onclick="x()">Hi</p>',
      },
    });

    expect(email.subject).toBe("<b>Mallory</b> rủ bạn dùng FairPay");
    expect(email.html).toContain("&lt;b&gt;Mallory&lt;/b&gt;");
    expect(email.html).not.toContain("<b>Mallory</b>");
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("onclick");
    expect(email.html).toMatch(/<p style="margin:0 0 10px;[^"]*">Chào bạn/);
    expect(email.text).toContain("Chào bạn, <b>Mallory</b> đang chờ.");
  });

  it("strips React Email editor scaffolding while keeping inline styles mergeable", () => {
    const raw = '<div data-type="container" class="node-container"><p class="node-paragraph" style="">Xin chào</p><p></p></div>';
    expect(cleanEditorHtml(raw)).toBe("<p>Xin chào</p>");
  });

  it("renders the debt reminder subject, CTA and per-person lines from one view model", async () => {
    const email = await renderDebtReminderEmail({
      recipient: { name: "An", hasAccount: true },
      appUrl: "https://long-pay.vercel.app",
      context: {
        totalAmount: 5000,
        groupBreakdown: [
          {
            groupId: "g-1",
            groupName: "Trip",
            subtotalAmount: 5000,
            currency: "VND",
            counterparties: [{ counterpartyName: "Bình", amount: 5000, currency: "VND" }],
          },
        ],
      },
    });

    expect(email.subject).toBe("FairPay: Còn 5.000\u00a0₫ chưa settle với 1 người");
    expect(email.previewText).toMatch(/^Bình · Tính đến \d\d:\d\d \d\d\/\d\d$/);
    expect(email.html).toContain('class="cta-link"');
    expect(email.html).toContain("Xem số dư &amp; thanh toán");
    expect(email.text).toContain("- Bình: 5.000\u00a0₫ (Trip)");
  });

  it("keeps the committed Supabase Edge bundle in sync with emails/src", () => {
    expect(() =>
      execFileSync("node", ["scripts/bundle-transactional-emails.mjs", "--check"], { cwd: repoRoot, stdio: "pipe" }),
    ).not.toThrow();
  });
});
