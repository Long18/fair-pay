export interface ReminderDebtTransaction {
  description: string;
  amount: number;
  currency?: string | null;
  expenseDate?: string | null;
}

export interface ReminderDebtBreakdownItem {
  counterpartyName: string;
  counterpartyEmail?: string | null;
  amount: number;
  currency?: string | null;
  transactions?: ReminderDebtTransaction[];
}

export interface ReminderGroupBreakdownItem {
  groupId?: string | null;
  groupName: string;
  groupAvatarUrl?: string | null;
  subtotalAmount: number;
  currency?: string | null;
  counterparties: ReminderDebtBreakdownItem[];
}

export interface ReminderEmailPreviewInput {
  userName: string;
  title: string;
  message: string;
  debtBreakdown?: ReminderDebtBreakdownItem[];
  groupBreakdown?: ReminderGroupBreakdownItem[];
  totalAmount?: number;
  hasAuthAccount?: boolean;
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

function formatDate(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function normalizeHref(appUrl: string, link: string): string {
  return `${appUrl.replace(/\/$/, "")}/${link.replace(/^\//, "")}`;
}

function getInitials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "FP";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function buildTransactionRows(
  transactions: ReminderDebtTransaction[],
  fallbackCurrency: string,
): string {
  return transactions.slice(0, 5).map((transaction) => {
    const safeDescription = escapeHtml(transaction.description || "Chi phí");
    const safeTransactionAmount = escapeHtml(
      formatCurrency(transaction.amount, transaction.currency || fallbackCurrency),
    );
    const safeDate = escapeHtml(formatDate(transaction.expenseDate));

    return `<tr>
      <td style="padding:8px 0;border-top:1px solid #e2e8f0;">
        <div style="font-size:13px;line-height:1.45;font-weight:600;color:#334155;">${safeDescription}</div>
        ${safeDate ? `<div style="font-size:11px;line-height:1.45;color:#94a3b8;">${safeDate}</div>` : ""}
      </td>
      <td align="right" style="padding:8px 0;border-top:1px solid #e2e8f0;white-space:nowrap;font-size:13px;font-weight:700;color:#0f172a;">
        ${safeTransactionAmount}
      </td>
    </tr>`;
  }).join("");
}

function buildCounterpartyRows(
  counterparties: ReminderDebtBreakdownItem[],
  options?: { compact?: boolean },
): string {
  if (!counterparties.length) return "";

  return counterparties.map((item) => {
    const safeName = escapeHtml(item.counterpartyName || "Không rõ");
    const safeEmail = item.counterpartyEmail ? escapeHtml(item.counterpartyEmail) : "";
    const safeAmount = escapeHtml(formatCurrency(item.amount, item.currency || "VND"));
    const transactionRows = buildTransactionRows(item.transactions || [], item.currency || "VND");

    return `<tr>
      <td style="padding:${options?.compact ? "10px" : "12px"} 0;border-bottom:1px solid #eef2f7;">
        <div style="font-size:13px;line-height:1.5;color:#475569;">Bạn cần trả / You owe</div>
        <div style="font-size:15px;line-height:1.45;font-weight:700;color:#0f172a;">${safeName}</div>
        ${safeEmail ? `<div style="font-size:12px;line-height:1.45;color:#64748b;">${safeEmail}</div>` : ""}
      </td>
      <td align="right" style="padding:${options?.compact ? "10px" : "12px"} 0;border-bottom:1px solid #eef2f7;white-space:nowrap;">
        <div style="font-size:16px;line-height:1.45;font-weight:800;color:#dc2626;">${safeAmount}</div>
      </td>
    </tr>
    ${transactionRows ? `<tr>
      <td colspan="2" style="padding:0 0 14px;border-bottom:1px solid #eef2f7;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:10px;background:#ffffff;padding:2px 12px;">
          ${transactionRows}
        </table>
      </td>
    </tr>` : ""}`;
  }).join("");
}

function buildLegacyDebtTextLines(debtBreakdown: ReminderDebtBreakdownItem[]): string[] {
  if (!debtBreakdown.length) return [];

  return debtBreakdown.map((item) => (
    [
      `- You owe ${item.counterpartyName}: ${formatCurrency(item.amount, item.currency || "VND")}`,
      ...(item.transactions || []).slice(0, 5).map((transaction) => (
        `  • ${transaction.description}: ${formatCurrency(transaction.amount, transaction.currency || item.currency || "VND")}`
      )),
    ].join("\n")
  ));
}

function buildGroupTextLines(groupBreakdown: ReminderGroupBreakdownItem[]): string[] {
  if (!groupBreakdown.length) return [];

  return groupBreakdown.flatMap((group) => [
    `- ${group.groupName}: ${formatCurrency(group.subtotalAmount, group.currency || "VND")} chưa settle / outstanding`,
    ...group.counterparties.flatMap((counterparty) => [
      `  • You owe ${counterparty.counterpartyName}: ${formatCurrency(counterparty.amount, counterparty.currency || group.currency || "VND")}`,
      ...(counterparty.transactions || []).slice(0, 5).map((transaction) => (
        `    - ${transaction.description}: ${formatCurrency(transaction.amount, transaction.currency || counterparty.currency || group.currency || "VND")}`
      )),
    ]),
  ]);
}

function buildGroupAvatarHtml(group: ReminderGroupBreakdownItem): string {
  const safeGroupName = escapeHtml(group.groupName || "Group");

  if (group.groupAvatarUrl) {
    return `<img src="${escapeHtml(group.groupAvatarUrl)}" width="48" height="48" alt="${safeGroupName}" style="display:block;width:48px;height:48px;border-radius:999px;object-fit:cover;border:1px solid #e2e8f0;">`;
  }

  return `<div aria-label="${safeGroupName}" style="width:48px;height:48px;border-radius:999px;background:#e0e7ff;color:#4338ca;font-size:16px;line-height:48px;font-weight:800;text-align:center;">
    ${escapeHtml(getInitials(group.groupName || "FairPay"))}
  </div>`;
}

function buildGroupSections(groupBreakdown: ReminderGroupBreakdownItem[]): string {
  if (!groupBreakdown.length) return "";

  return groupBreakdown.map((group) => {
    const safeGroupName = escapeHtml(group.groupName || "Direct / Ngoài group");
    const safeSubtotal = escapeHtml(formatCurrency(group.subtotalAmount, group.currency || "VND"));
    const counterpartyRows = buildCounterpartyRows(group.counterparties, { compact: true });

    return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:14px;border:1px solid #e2e8f0;border-radius:14px;background:#ffffff;padding:0 16px;">
      <tr>
        <td style="padding:16px 0 12px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td width="58" valign="top">${buildGroupAvatarHtml(group)}</td>
              <td valign="middle">
                <div style="font-size:12px;line-height:1.5;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Group</div>
                <div style="font-size:17px;line-height:1.4;font-weight:800;color:#0f172a;">${safeGroupName}</div>
              </td>
              <td align="right" valign="middle" style="white-space:nowrap;">
                <div style="font-size:11px;line-height:1.5;color:#64748b;">Chưa settle / Outstanding</div>
                <div style="font-size:18px;line-height:1.3;font-weight:900;color:#dc2626;">${safeSubtotal}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            ${counterpartyRows}
          </table>
        </td>
      </tr>
    </table>`;
  }).join("");
}

export function buildReminderEmailPreview(input: ReminderEmailPreviewInput): ReminderEmailPreview {
  const appUrl = input.appUrl || "https://long-pay.vercel.app";
  const hasAuthAccount = input.hasAuthAccount !== false;
  const detailLink = hasAuthAccount ? input.link || "/dashboard" : "/register";
  const ctaLink = hasAuthAccount ? "/dashboard" : "/register";
  const ctaLabel = hasAuthAccount
    ? "Mở FairPay / Open FairPay"
    : "Tạo tài khoản để xem chi tiết / Create account to view";
  const subject = `[FairPay] Payment reminder: ${input.title}`;
  const previewText = input.message;
  const debtBreakdown = input.debtBreakdown || [];
  const groupBreakdown = input.groupBreakdown || [];
  const totalAmount = input.totalAmount ?? debtBreakdown.reduce((sum, item) => sum + item.amount, 0);

  const safeUser = escapeHtml(input.userName);
  const safeTitle = escapeHtml(input.title);
  const safeMessage = escapeHtml(input.message);
  const safeTotal = escapeHtml(formatCurrency(totalAmount || 0));
  const safeHref = escapeHtml(normalizeHref(appUrl, detailLink));
  const safeCtaHref = escapeHtml(normalizeHref(appUrl, ctaLink));
  const safeHeroUrl = escapeHtml(normalizeHref(appUrl, "/assets/email/debt-reminder-hero.jpg"));
  const groupSections = buildGroupSections(groupBreakdown);
  const legacyDebtRows = buildCounterpartyRows(debtBreakdown);
  const groupTextLines = buildGroupTextLines(groupBreakdown);
  const debtTextLines = groupTextLines.length ? groupTextLines : buildLegacyDebtTextLines(debtBreakdown);

  const text = [
    `Hi ${input.userName},`,
    ``,
    `You have 1 new notification on FairPay.`,
    ``,
    `[Payment reminder] ${input.title}`,
    input.message,
    `Tổng cần trả sau bù trừ / Total due after netting: ${formatCurrency(totalAmount || 0)}`,
    debtTextLines.length ? "" : null,
    ...debtTextLines,
    groupBreakdown.length
      ? "Lưu ý / Note: Group subtotals show unsettled items inside each group and may differ from the final netted total."
      : null,
    `Link: ${normalizeHref(appUrl, detailLink)}`,
    ``,
    hasAuthAccount ? `Open FairPay: ${normalizeHref(appUrl, ctaLink)}` : `Create your FairPay account: ${normalizeHref(appUrl, ctaLink)}`,
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
               style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#111827;">
              <img src="${safeHeroUrl}" width="600" alt="FairPay debt reminder overview" style="display:block;width:100%;max-width:600px;height:auto;">
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:24px 32px;text-align:center;">
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
                      ${hasAuthAccount ? "Xem chi tiết / View" : "Tạo tài khoản để xem / Create account to view"} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              ${(groupSections || legacyDebtRows) ? `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:20px;border:1px solid #dbeafe;border-radius:16px;padding:0 16px;background:#f8fafc;">
                <tr>
                  <td style="padding:16px 0 8px;">
                    <div style="font-size:12px;color:#4f46e5;text-transform:uppercase;letter-spacing:0.08em;font-weight:800;">Chi tiết công nợ / Debt breakdown</div>
                    <div style="margin-top:4px;font-size:22px;line-height:1.2;font-weight:900;color:#0f172a;">Tổng cần trả sau bù trừ: ${safeTotal}</div>
                    <div style="margin-top:6px;font-size:13px;line-height:1.6;color:#64748b;">
                      ${groupSections
                        ? "Các section bên dưới là các khoản chưa settle theo group; subtotal có thể khác tổng chính thức sau bù trừ."
                        : "Các khoản bên dưới được nhóm theo người bạn cần thanh toán."}
                    </div>
                  </td>
                </tr>
              </table>
              ${groupSections || `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:14px;border:1px solid #e2e8f0;border-radius:12px;padding:0 16px;background:#ffffff;">
                ${legacyDebtRows}
              </table>`}` : ""}
              <div style="text-align:center;margin-top:32px;">
                <a href="${safeCtaHref}"
                   style="display:inline-block;background:#6366f1;color:#fff;padding:13px 28px;
                          border-radius:999px;text-decoration:none;font-size:15px;font-weight:700;">
                  ${ctaLabel}
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
