const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface InviteEmailPreviewInput {
  emails: string[];
  inviterName?: string | null;
  appUrl?: string;
}

export interface InviteEmailPreview {
  recipients: string[];
  subject: string;
  previewText: string;
  html: string;
  text: string;
}

export function normalizeInviteEmails(value: string | string[]): string[] {
  const rawItems = Array.isArray(value)
    ? value
    : value.split(/[\s,;]+/);

  const emails = rawItems
    .map((email) => email.trim().toLowerCase())
    .filter((email) => EMAIL_RE.test(email));

  return Array.from(new Set(emails));
}

export function escapeInviteHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildInviteEmailPreview(input: InviteEmailPreviewInput): InviteEmailPreview {
  const recipients = normalizeInviteEmails(input.emails);
  const inviterName = input.inviterName?.trim() || "Một người bạn";
  const appUrl = input.appUrl || "https://fairpay.app";
  const subject = `${inviterName} mời bạn sử dụng FairPay`;
  const previewText = "Chia tiền nhóm, theo dõi ai nợ ai, và settle up rõ ràng hơn cùng FairPay.";
  const safeInviterName = escapeInviteHtml(inviterName);
  const safeAppUrl = escapeInviteHtml(appUrl);

  const text = [
    `Xin chào,`,
    ``,
    `${inviterName} mời bạn sử dụng FairPay để chia tiền nhóm, theo dõi ai nợ ai, và settle up rõ ràng hơn.`,
    ``,
    `Bắt đầu với FairPay: ${appUrl}`,
    ``,
    `FairPay - Chia sẻ chi phí thông minh`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeInviteHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">
    ${escapeInviteHtml(previewText)}
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f6f7fb;padding:28px 12px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;box-shadow:0 18px 60px rgba(15,23,42,0.10);">
          <tr>
            <td style="padding:28px 32px;background:#111827;color:#ffffff;">
              <div style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#a5b4fc;font-weight:700;">FairPay Invite</div>
              <div style="margin-top:10px;font-size:30px;line-height:1.15;font-weight:800;letter-spacing:-0.04em;">Chia tiền nhóm không còn rối</div>
              <div style="margin-top:10px;font-size:14px;line-height:1.7;color:#d1d5db;">${safeInviterName} vừa mời bạn vào FairPay.</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#111827;">Xin chào,</p>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:#4b5563;">
                FairPay giúp bạn ghi lại chi phí chung, biết chính xác ai đang nợ ai, và settle up minh bạch sau mỗi chuyến đi, bữa ăn, hoặc nhóm bạn.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 26px;border:1px solid #eef2ff;border-radius:14px;background:#f8fafc;">
                <tr>
                  <td style="padding:18px 20px;font-size:14px;line-height:1.8;color:#374151;">
                    <strong style="color:#111827;">Bạn có thể dùng FairPay để:</strong><br>
                    - Split bill nhanh giữa bạn bè và nhóm<br>
                    - Theo dõi công nợ theo thời gian thực<br>
                    - Nhận nhắc thanh toán qua email/thông báo
                  </td>
                </tr>
              </table>
              <div style="text-align:center;margin:30px 0;">
                <a href="${safeAppUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:999px;padding:14px 28px;font-size:15px;font-weight:700;">
                  Bắt đầu với FairPay
                </a>
              </div>
              <p style="margin:0;font-size:12px;line-height:1.7;color:#9ca3af;text-align:center;">Nếu nút không hoạt động, mở liên kết này: <a href="${safeAppUrl}" style="color:#4f46e5;text-decoration:none;">${safeAppUrl}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    recipients,
    subject,
    previewText,
    html,
    text,
  };
}
