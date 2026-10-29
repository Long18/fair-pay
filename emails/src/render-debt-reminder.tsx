import { render, toPlainText } from "@react-email/render";
import { DebtReminderEmail, resolveDebtReminderEmail } from "./debt-reminder-email";
import type { DebtReminderEmailInput, ReminderDebtBreakdownItem, ReminderGroupBreakdownItem, RenderedEmail } from "./types";
import { fillTemplate, formatCurrency } from "./utils";

const MAX_TEXT_TRANSACTIONS = 5;

function buildGroupTextLines(groups: ReminderGroupBreakdownItem[]): string[] {
  return groups.flatMap((group) => [
    `- ${group.groupName}: ${formatCurrency(group.subtotalAmount, group.currency || "VND")} chưa settle / outstanding`,
    ...group.counterparties.flatMap((counterparty) => [
      `  • You owe ${counterparty.counterpartyName}: ${formatCurrency(counterparty.amount, counterparty.currency || group.currency || "VND")}`,
      ...(counterparty.transactions || []).slice(0, MAX_TEXT_TRANSACTIONS).map((transaction) => (
        `    - ${transaction.description}: ${formatCurrency(transaction.amount, transaction.currency || counterparty.currency || group.currency || "VND")}`
      )),
    ]),
  ]);
}

function buildLegacyDebtTextLines(debts: ReminderDebtBreakdownItem[]): string[] {
  return debts.flatMap((item) => [
    `- You owe ${item.counterpartyName}: ${formatCurrency(item.amount, item.currency || "VND")}`,
    ...(item.transactions || []).slice(0, MAX_TEXT_TRANSACTIONS).map((transaction) => (
      `  • ${transaction.description}: ${formatCurrency(transaction.amount, transaction.currency || item.currency || "VND")}`
    )),
  ]);
}

export async function renderDebtReminderEmail(input: DebtReminderEmailInput): Promise<RenderedEmail> {
  const resolved = resolveDebtReminderEmail(input);
  const { content, tokens, groupBreakdown, debtBreakdown, totalAmount, detailHref, ctaHref, hasAuthAccount } = resolved;
  const html = await render(<DebtReminderEmail {...input} />);
  const debtLines = groupBreakdown.length ? buildGroupTextLines(groupBreakdown) : buildLegacyDebtTextLines(debtBreakdown);

  const text = [
    toPlainText(fillTemplate(content.greetingHtml, tokens, { escape: true }), { wordwrap: false }),
    "",
    `[Payment reminder] ${input.title}`,
    input.message,
    `Tổng cần trả sau bù trừ / Total due after netting: ${formatCurrency(totalAmount || 0)}`,
    debtLines.length ? "" : null,
    ...debtLines,
    groupBreakdown.length
      ? "Lưu ý / Note: Group subtotals show unsettled items inside each group and may differ from the final netted total."
      : null,
    `Link: ${detailHref}`,
    "",
    hasAuthAccount ? `Open FairPay: ${ctaHref}` : `Create your FairPay account: ${ctaHref}`,
  ].filter((line): line is string => line !== null).join("\n");

  return { subject: resolved.subject, previewText: resolved.previewText, html, text };
}
