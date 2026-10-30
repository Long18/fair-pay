import { describe, expect, it } from "vitest";

import { buildEmailHtml, buildEmailText, buildSubject } from "../../supabase/functions/send-email-notifications/digest";
import type { QueueRow } from "../../supabase/functions/send-email-notifications/routing";

function row(overrides: Partial<QueueRow>): QueueRow {
  return {
    notification_id: "n-1",
    user_id: "user-an",
    user_email: "an@example.com",
    user_name: "An",
    has_auth_account: true,
    notification_type: "expense_added",
    title: "Bữa tối hải sản",
    message: "Minh Tuấn đã thêm chi phí 600.000 ₫",
    link: "/expenses/show/e-1",
    created_at: "2026-10-30T04:00:00Z",
    email_context: null,
    ...overrides,
  };
}

const appUrl = "https://long-pay.vercel.app";
const legacyReminder = row({
  notification_id: "r-1",
  notification_type: "settlement_reminder",
  title: "Nhắc thanh toán công nợ",
  message: "An, bạn đang có 850.000 ₫ cần thanh toán trên FairPay.",
  link: "/dashboard",
});

describe("notification digest", () => {
  it("renders a reminder without snapshot as badge + in-app message + one link, no breakdown or title", () => {
    const html = buildEmailHtml("An", [row({}), legacyReminder], appUrl);

    expect(html).toContain("Nhắc thanh toán");
    expect(html).toContain("An, bạn đang có 850.000 ₫ cần thanh toán trên FairPay.");
    expect(html).toContain("https://long-pay.vercel.app/balances?src=email_digest_reminder");
    expect(html).toContain("Xem số dư →");
    expect(html).not.toContain("Nhắc thanh toán công nợ");
    expect(html).not.toContain("debt-summary");
    expect(html).not.toContain("<img");
  });

  it("uses Vietnamese-only labels, subject and footer", () => {
    const rows = [row({}), legacyReminder];
    const html = buildEmailHtml("An", rows, appUrl);
    const text = buildEmailText("An", rows, appUrl);

    expect(buildSubject(2, rows)).toBe("FairPay: 2 thông báo mới");
    expect(buildSubject(1, [row({})])).toBe("FairPay: Chi phí mới");
    const visibleHtml = html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
    for (const output of [visibleHtml, text]) {
      expect(output).not.toMatch(/\b(View|Hello|Payment reminder|New expense|notifications?)\b/);
      expect(output).not.toMatch(/[a-zà-ỹ] \/ [A-Z]/);
    }
    expect(text).toContain("[Nhắc thanh toán]\nAn, bạn đang có 850.000 ₫ cần thanh toán trên FairPay.\nXem số dư: https://long-pay.vercel.app/balances?src=email_digest_reminder");
  });

  it("points guests to register for reminder rows", () => {
    const html = buildEmailHtml("An", [{ ...legacyReminder, has_auth_account: false }], appUrl);
    expect(html).toContain("https://long-pay.vercel.app/register?src=email_digest_reminder");
    expect(html).not.toContain("/balances");
  });
});
