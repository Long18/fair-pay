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

  it("builds a bilingual FairPay invite preview for a Gmail-like surface", () => {
    const preview = buildInviteEmailPreview({
      emails: ["friend@example.com"],
      inviterName: "Long",
      appUrl: "https://long-pay.vercel.app",
    });

    expect(preview.subject).toBe("Long mời bạn sử dụng FairPay");
    expect(preview.previewText).toContain("Chia tiền nhóm");
    expect(preview.html).toContain("https://long-pay.vercel.app");
    expect(preview.html).toContain("Bắt đầu với FairPay");
  });

  it("escapes user-controlled invite fields in the generated html", () => {
    const preview = buildInviteEmailPreview({
      emails: ["friend@example.com"],
      inviterName: "<script>alert(1)</script>",
      appUrl: "https://long-pay.vercel.app?next=<bad>",
    });

    expect(preview.html).not.toContain("<script>");
    expect(preview.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(preview.html).toContain("https://long-pay.vercel.app?next=&lt;bad&gt;");
  });
});
