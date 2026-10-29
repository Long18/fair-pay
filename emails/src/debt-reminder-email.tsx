import { Img, Section } from "react-email";
import { GroupDebtSections, LegacyDebtList } from "./components/debt-breakdown";
import { EmailPanel } from "./components/email-panel";
import { FairPayShell } from "./components/fairpay-shell";
import { RichText } from "./components/rich-text";
import debtReminderStatic from "./content/debt-reminder.static.json";
import type { DebtReminderEmailContent, DebtReminderEmailInput } from "./types";
import { DEFAULT_APP_URL, fillTemplate, formatCurrency, normalizeHref } from "./utils";

export const defaultDebtReminderContent: DebtReminderEmailContent = debtReminderStatic;

export function resolveDebtReminderEmail(input: DebtReminderEmailInput) {
  const appUrl = input.appUrl || DEFAULT_APP_URL;
  const hasAuthAccount = input.hasAuthAccount !== false;
  const content: DebtReminderEmailContent = { ...defaultDebtReminderContent, ...input.content };
  const debtBreakdown = input.debtBreakdown || [];
  const groupBreakdown = input.groupBreakdown || [];
  const totalAmount = input.totalAmount ?? debtBreakdown.reduce((sum, item) => sum + item.amount, 0);
  const detailHref = normalizeHref(appUrl, hasAuthAccount ? input.link || "/balances" : "/register");
  const ctaHref = normalizeHref(appUrl, hasAuthAccount ? "/balances" : "/register");
  const tokens = {
    userName: input.userName,
    title: input.title,
    message: input.message,
    total: formatCurrency(totalAmount || 0),
  };

  return {
    appUrl,
    hasAuthAccount,
    content,
    tokens,
    debtBreakdown,
    groupBreakdown,
    totalAmount,
    detailHref,
    ctaHref,
    ctaLabel: hasAuthAccount ? content.ctaLabelAuth : content.ctaLabelGuest,
    subject: fillTemplate(content.subject, tokens),
    previewText: input.message,
  };
}

export function DebtReminderEmail(input: DebtReminderEmailInput) {
  const resolved = resolveDebtReminderEmail(input);
  const { appUrl, hasAuthAccount, content, tokens, debtBreakdown, groupBreakdown, detailHref, ctaHref, ctaLabel } = resolved;
  const hasBreakdown = groupBreakdown.length > 0 || debtBreakdown.length > 0;

  return (
    <FairPayShell
      title="FairPay Notifications"
      previewText={resolved.previewText}
      eyebrow={fillTemplate(content.eyebrow, tokens)}
      heading={fillTemplate(content.heading, tokens)}
      subheading={fillTemplate(hasAuthAccount ? content.subheadingAuth : content.subheadingGuest, tokens)}
      ctaHref={ctaHref}
      ctaLabel={ctaLabel}
      footerHtml={fillTemplate(content.footerHtml, tokens, { escape: true })}
      tone="reminder"
      hero={
        <Section data-email-block="hero-image" style={{ background: "#0f172a", lineHeight: 0, fontSize: 0 }}>
          <Img
            src={normalizeHref(appUrl, "/assets/email/debt-reminder-hero.jpg")}
            width="600"
            height="140"
            alt={content.heroAlt}
            style={{ display: "block", width: "100%", maxWidth: "600px", height: "140px", objectFit: "cover", objectPosition: "center top", border: 0 }}
          />
        </Section>
      }
    >
      <RichText
        html={fillTemplate(content.greetingHtml, tokens, { escape: true })}
        tagStyles={{ p: "margin:0 0 8px;font-size:15px;line-height:1.7;color:#475569;" }}
        data-email-block="greeting"
      />
      <EmailPanel
        label={content.notificationLabel}
        title={input.title}
        description={input.message}
        tone="reminder"
        marker="notification-card"
      >
        <a href={detailHref} style={{ display: "inline-block", fontSize: "13px", color: "#f43f5e", textDecoration: "none", fontWeight: 700 }}>
          {hasAuthAccount ? content.viewLinkAuth : content.viewLinkGuest} &rarr;
        </a>
      </EmailPanel>
      {hasBreakdown ? (
        <>
          <EmailPanel
            label={content.breakdownLabel}
            title={fillTemplate(content.breakdownTitle, tokens)}
            description={groupBreakdown.length ? content.breakdownGroupNote : content.breakdownLegacyNote}
            tone="reminder"
            marker="debt-summary"
          />
          {groupBreakdown.length ? (
            <GroupDebtSections groups={groupBreakdown} appUrl={appUrl} />
          ) : (
            <LegacyDebtList debts={debtBreakdown} />
          )}
        </>
      ) : null}
    </FairPayShell>
  );
}

DebtReminderEmail.PreviewProps = {
  userName: "Thành Long",
  title: "Bạn còn nợ nhóm chưa thanh toán",
  message: "Vui lòng thanh toán để cân bằng số dư với bạn bè.",
  totalAmount: 850000,
  hasAuthAccount: true,
  appUrl: DEFAULT_APP_URL,
  link: "/balances",
  groupBreakdown: [
    {
      groupId: "trip-da-nang-2026",
      groupName: "Chuyến Đà Nẵng 2026",
      subtotalAmount: 600000,
      currency: "VND",
      counterparties: [
        {
          counterpartyName: "Minh Tuấn",
          counterpartyEmail: "minhtuan@example.com",
          amount: 350000,
          currency: "VND",
          transactions: [
            { description: "Khách sạn Mường Thanh", amount: 200000, currency: "VND", expenseDate: "2026-06-20" },
            { description: "Bữa tối hải sản", amount: 150000, currency: "VND", expenseDate: "2026-06-21" },
          ],
        },
        {
          counterpartyName: "Lan Anh",
          amount: 250000,
          currency: "VND",
          transactions: [{ description: "Thuê xe máy 2 ngày", amount: 250000, currency: "VND", expenseDate: "2026-06-20" }],
        },
      ],
    },
    {
      groupId: "living-expenses-q2",
      groupName: "Chi phí sinh hoạt Q2",
      subtotalAmount: 250000,
      currency: "VND",
      counterparties: [
        {
          counterpartyName: "Quang Huy",
          amount: 250000,
          currency: "VND",
          transactions: [{ description: "Điện + nước tháng 6", amount: 250000, currency: "VND", expenseDate: "2026-06-15" }],
        },
      ],
    },
  ],
} satisfies DebtReminderEmailInput;
