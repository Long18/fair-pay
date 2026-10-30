import { describe, expect, it } from "vitest";

import {
  buildInviteEmailPreview,
  normalizeInviteEmails,
} from "@/modules/admin/email/invite-email";

describe("admin invite email helpers", () => {
  it("normalizes comma, space, and newline separated emails without duplicates", () => {
    expect(
      normalizeInviteEmails(" alice@example.com, bob@example.com\nalice@example.com carol@example.com "),
    ).toEqual(["alice@example.com", "bob@example.com", "carol@example.com"]);
  });

  it("builds a Vietnamese FairPay invite preview on the transactional shell", async () => {
    const preview = await buildInviteEmailPreview({
      emails: ["friend@example.com"],
      inviterName: "Long",
      appUrl: "https://long-pay.vercel.app",
    });

    expect(preview.subject).toBe("Long mời bạn sử dụng FairPay");
    expect(preview.previewText).toContain("Chia tiền nhóm");
    expect(preview.html).toContain("https://long-pay.vercel.app");
    expect(preview.html).toContain("Bắt đầu với FairPay");
    expect(preview.html).toContain('data-email-shell="fairpay-transactional"');
    expect(preview.html).toContain('data-email-block="invite-body"');
    expect(preview.html).toContain("chia hóa đơn nhanh");
    expect(preview.html).toContain('class="cta-link"');
    expect(preview.html).toContain("Bạn nhận email này vì có tài khoản FairPay hoặc được mời vào FairPay.");
    expect(preview.html).not.toContain("<img");
    expect(preview.html).not.toMatch(/Why FairPay|You are receiving/);
  });

  it("escapes user-controlled invite fields in the generated html", async () => {
    const preview = await buildInviteEmailPreview({
      emails: ["friend@example.com"],
      inviterName: "<script>alert(1)</script>",
      appUrl: "https://long-pay.vercel.app?next=<bad>",
    });

    expect(preview.html).not.toContain("<script>");
    expect(preview.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(preview.html).toContain("https://long-pay.vercel.app?next=&lt;bad&gt;");
  });
});
