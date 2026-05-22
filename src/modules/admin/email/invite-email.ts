import { buildEmailPanel, buildEmailShell, escapeEmailHtml } from "./email-design-system";

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
  return escapeEmailHtml(text);
}

export function buildInviteEmailPreview(input: InviteEmailPreviewInput): InviteEmailPreview {
  const recipients = normalizeInviteEmails(input.emails);
  const inviterName = input.inviterName?.trim() || "Một người bạn";
  const appUrl = input.appUrl || "https://long-pay.vercel.app";
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

  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#0f172a;">Xin chào,</p>
    <p style="margin:0;font-size:15px;line-height:1.8;color:#475569;">
      ${safeInviterName} mời bạn vào FairPay để chia tiền nhóm, theo dõi ai nợ ai, và settle up rõ ràng sau mỗi chuyến đi, bữa ăn, hoặc nhóm bạn.
    </p>
    ${buildEmailPanel({
      label: "Invite block",
      title: "Bạn có thể dùng FairPay để",
      description: "Split bill nhanh, xem công nợ theo thời gian thực, và nhận nhắc thanh toán qua email hoặc thông báo trong app.",
      tone: "invite",
      marker: "invite-benefits",
    })}
    <p style="margin:18px 0 0;font-size:12px;line-height:1.7;color:#94a3b8;text-align:center;">Nếu nút không hoạt động, mở liên kết này: <a href="${safeAppUrl}" style="color:#4f46e5;text-decoration:none;">${safeAppUrl}</a></p>`;

  const html = buildEmailShell({
    title: subject,
    previewText,
    eyebrow: "FairPay Invite",
    heading: "Chia tiền nhóm không còn rối",
    subheading: `${inviterName} vừa mời bạn vào FairPay.`,
    bodyHtml,
    ctaHref: appUrl,
    ctaLabel: "Bắt đầu với FairPay",
    tone: "invite",
  });

  return {
    recipients,
    subject,
    previewText,
    html,
    text,
  };
}
