import { Heading, Text } from "react-email";
import { FairPayShell, TransactionalFooter } from "./components/fairpay-shell";
import { RichText } from "./components/rich-text";
import { resolveInviteEmail } from "./resolve-invite";
import { TRANSACTIONAL_COLORS as colors } from "./tokens";
import type { InviteEmailInput } from "./types";
import { DEFAULT_APP_URL } from "./utils";

const bodyTagStyles = { p: `margin:0 0 10px;font-size:15px;line-height:1.7;color:${colors.text};` };

export function InviteEmail(input: InviteEmailInput) {
  const { appUrl, subject, previewText, heading, bodyHtml, ctaLabel, fallbackLinkLabel, footer, copyright } = resolveInviteEmail(input);

  return (
    <FairPayShell
      title={subject}
      previewText={previewText}
      ctaHref={appUrl}
      ctaLabel={ctaLabel}
      footer={<TransactionalFooter lines={[footer, copyright]} />}
      afterCta={
        <Text style={{ margin: "12px 0 0", fontSize: "12px", lineHeight: "18px", color: colors.secondary }}>
          {fallbackLinkLabel}{" "}
          <a href={appUrl} style={{ color: colors.brand, textDecoration: "none" }}>
            {appUrl}
          </a>
        </Text>
      }
    >
      <Heading as="h1" style={{ margin: "0 0 12px", fontSize: "22px", lineHeight: "28px", fontWeight: 700, color: colors.text }}>
        {heading}
      </Heading>
      <RichText html={bodyHtml} tagStyles={bodyTagStyles} data-email-block="invite-body" />
    </FairPayShell>
  );
}

InviteEmail.PreviewProps = {
  inviterName: "Long",
  appUrl: DEFAULT_APP_URL,
} satisfies InviteEmailInput;
