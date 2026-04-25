export interface ReminderDebtBreakdownItem {
  counterpartyName: string;
  counterpartyEmail?: string | null;
  amount: number;
  currency?: string | null;
}

export interface ReminderEmailPreviewInput {
  userName: string;
  title: string;
  message: string;
  debtBreakdown?: ReminderDebtBreakdownItem[];
  totalAmount?: number;
  appUrl?: string;
  link?: string;
}

export interface ReminderEmailPreview {
  subject: string;
  previewText: string;
  html: string;
  text: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCurrency(value: number, currency = "VND"): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
}

function normalizeHref(appUrl: string, link: string): string {
  return `${appUrl.replace(/\/$/, "")}/${link.replace(/^\//, "")}`;
}

function buildDebtRows(debtBreakdown: ReminderDebtBreakdownItem[]): string {
  if (!debtBreakdown.length) return "";

  return debtBreakdown.map((item) => {
    const safeName = escapeHtml(item.counterpartyName || "Không rõ");
    const safeEmail = item.counterpartyEmail ? escapeHtml(item.counterpartyEmail) : "";
    const safeAmount = escapeHtml(formatCurrency(item.amount, item.currency || "VND"));

    return `<tr>
      <td style="padding:12px 0;border-bottom:1px solid #eef2f7;">
        <div style="font-size:13px;line-height:1.5;color:#475569;">Bạn cần trả / You owe</div>
        <div style="font-size:15px;line-height:1.45;font-weight:700;color:#0f172a;">${safeName}</div>
        ${safeEmail ? `<div style="font-size:12px;line-height:1.45;color:#64748b;">${safeEmail}</div>` : ""}
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid #eef2f7;white-space:nowrap;">
        <div style="font-size:16px;line-height:1.45;font-weight:800;color:#dc2626;">${safeAmount}</div>
      </td>
    </tr>`;
  }).join("");
}

function buildDebtTextLines(debtBreakdown: ReminderDebtBreakdownItem[]): string[] {
  if (!debtBreakdown.length) return [];

  return debtBreakdown.map((item) => (
    `- You owe ${item.counterpartyName}: ${formatCurrency(item.amount, item.currency || "VND")}`
  ));
}

export function buildReminderEmailPreview(input: ReminderEmailPreviewInput): ReminderEmailPreview {
  const appUrl = input.appUrl || "https://long-pay.vercel.app";
  const link = input.link || "/dashboard";
  const subject = `[FairPay] Payment reminder: ${input.title}`;
  const previewText = input.message;
  const debtBreakdown = input.debtBreakdown || [];
  const totalAmount = input.totalAmount ?? debtBreakdown.reduce((sum, item) => sum + item.amount, 0);

  const safeUser = escapeHtml(input.userName);
  const safeTitle = escapeHtml(input.title);
  const safeMessage = escapeHtml(input.message);
  const safeTotal = escapeHtml(formatCurrency(totalAmount || 0));
  const safeHref = escapeHtml(normalizeHref(appUrl, link));
  const safeAppUrl = escapeHtml(appUrl);
  const debtRows = buildDebtRows(debtBreakdown);
  const debtTextLines = buildDebtTextLines(debtBreakdown);

  const text = [
    `Hi ${input.userName},`,
    ``,
    `You have 1 new notification on FairPay.`,
    ``,
    `[Payment reminder] ${input.title}`,
    input.message,
    debtTextLines.length ? "" : null,
    ...debtTextLines,
    `Link: ${normalizeHref(appUrl, link)}`,
    ``,
    `Open FairPay: ${appUrl}`,
  ].filter((line): line is string => line !== null).join("\n");

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>FairPay Notifications</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:26px;font-weight:700;color:#fff;letter-spacing:-0.5px;">FairPay</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;">
                Chia sẻ chi phí thông minh &bull; Smart expense splitting
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#fff;padding:32px;">
              <p style="margin:0 0 6px;font-size:16px;color:#1a1a1a;">
                Xin chào / Hello, <strong>${safeUser}</strong>
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#666;">
                Bạn có <strong>1 thông báo mới / 1 new notification</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;">
                    <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;">
                      Nhắc thanh toán / Payment reminder
                    </div>
                    <div style="font-size:14px;font-weight:600;color:#1a1a1a;margin-bottom:3px;">
                      ${safeTitle}
                    </div>
                    <div style="font-size:13px;color:#555;line-height:1.5;">
                      ${safeMessage}
                    </div>
                    <a href="${safeHref}"
                       style="display:inline-block;margin-top:6px;font-size:12px;color:#6366f1;text-decoration:none;">
                      Xem chi tiết / View &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              ${debtRows ? `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:20px;border:1px solid #e2e8f0;border-radius:12px;padding:0 16px;background:#f8fafc;">
                <tr>
                  <td colspan="2" style="padding:16px 0 4px;">
                    <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Chi tiết công nợ / Debt breakdown</div>
                    <div style="margin-top:4px;font-size:22px;line-height:1.2;font-weight:800;color:#0f172a;">Tổng cần trả: ${safeTotal}</div>
                  </td>
                </tr>
                ${debtRows}
              </table>` : ""}
              <div style="text-align:center;margin-top:32px;">
                <a href="${safeAppUrl}"
                   style="display:inline-block;background:#6366f1;color:#fff;padding:13px 36px;
                          border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
                  Mở FairPay / Open FairPay
                </a>
              </div>
              <p style="margin:28px 0 0;font-size:11px;color:#aaa;text-align:center;
                        border-top:1px solid #f0f0f0;padding-top:20px;line-height:1.8;">
                Để tắt email thông báo, vào <strong>Cài đặt &rarr; Thông báo</strong>.<br>
                To disable email notifications, go to <strong>Settings &rarr; Notifications</strong>.<br>
                &copy; 2026 FairPay
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, previewText, html, text };
}
