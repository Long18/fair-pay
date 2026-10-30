import { Heading, Section, Text } from "react-email";
import { FairPayShell, TransactionalFooter } from "./components/fairpay-shell";
import { sampleReminderInput } from "./fixtures";
import { buildReminderViewModel } from "./reminder-view-model";
import { TRANSACTIONAL_COLORS as colors } from "./tokens";
import type { DebtReminderEmailInput, ReminderViewModel } from "./types";

export function DebtReminderEmail(input: DebtReminderEmailInput) {
  return <DebtReminderEmailView vm={buildReminderViewModel(input)} />;
}

export function DebtReminderEmailView({ vm }: { vm: ReminderViewModel }) {
  return (
    <FairPayShell
      title={vm.subject}
      previewText={vm.preheader}
      ctaHref={vm.cta.href}
      ctaLabel={vm.cta.label}
      footer={<TransactionalFooter lines={[vm.footer, vm.copyright]} />}
    >
      <Text data-email-block="greeting" style={{ margin: 0, fontSize: "15px", lineHeight: "22px", color: colors.text }}>
        {vm.greeting}
      </Text>
      {vm.trustLine ? (
        <Text data-email-block="trust-line" style={{ margin: "6px 0 0", fontSize: "14px", lineHeight: "21px", color: colors.secondary }}>
          {vm.trustLine}
        </Text>
      ) : null}

      <Section data-email-block="total" style={{ marginTop: "20px" }}>
        <Text style={{ margin: 0, fontSize: "13px", lineHeight: "18px", color: colors.secondary }}>{vm.totalHeading}</Text>
        <Heading as="h1" style={{ margin: "4px 0 0", fontSize: "32px", lineHeight: "38px", fontWeight: 700, color: colors.text }}>
          {vm.totalLabel}
        </Heading>
        <Text style={{ margin: "4px 0 0", fontSize: "13px", lineHeight: "18px", color: colors.secondary }}>{vm.totalMeta}</Text>
      </Section>

      <table
        data-email-block="counterparty-list"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
        style={{ marginTop: "16px", borderTop: `1px solid ${colors.border}` }}
      >
        <tbody>
          {vm.lines.map((line, index) => (
            <tr key={line.key}>
              <td valign="top" style={{ padding: "12px 12px 12px 0", borderTop: index ? `1px solid ${colors.border}` : undefined }}>
                <div style={{ fontSize: "15px", lineHeight: "21px", fontWeight: 500, color: colors.text }}>{line.name}</div>
                {line.groupHint ? (
                  <div style={{ marginTop: "2px", fontSize: "13px", lineHeight: "18px", color: colors.secondary }}>{line.groupHint}</div>
                ) : null}
              </td>
              <td
                align="right"
                valign="top"
                style={{
                  padding: "12px 0",
                  borderTop: index ? `1px solid ${colors.border}` : undefined,
                  whiteSpace: "nowrap",
                  fontSize: "15px",
                  lineHeight: "21px",
                  fontWeight: 600,
                  color: colors.text,
                }}
              >
                {line.amountLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {vm.overflowLabel ? (
        <Text data-email-block="overflow" style={{ margin: "4px 0 0", fontSize: "13px", lineHeight: "18px", color: colors.secondary }}>
          {vm.overflowLabel}
        </Text>
      ) : null}
    </FairPayShell>
  );
}

DebtReminderEmail.PreviewProps = sampleReminderInput;
