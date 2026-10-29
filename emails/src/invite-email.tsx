import { Text } from "react-email";
import { EmailPanel } from "./components/email-panel";
import { FairPayShell } from "./components/fairpay-shell";
import { RichText } from "./components/rich-text";
import inviteStatic from "./content/invite.static.json";
import type { InviteEmailContent, InviteEmailInput } from "./types";
import { DEFAULT_APP_URL, fillTemplate } from "./utils";

export const defaultInviteContent: InviteEmailContent = inviteStatic;

export function resolveInviteEmail(input: InviteEmailInput) {
  const inviterName = input.inviterName?.trim() || "Một người bạn";
  const appUrl = input.appUrl || DEFAULT_APP_URL;
  const content: InviteEmailContent = { ...defaultInviteContent, ...input.content };
  const tokens = { inviterName, appUrl };
  return {
    inviterName,
    appUrl,
    content,
    tokens,
    subject: fillTemplate(content.subject, tokens),
    previewText: fillTemplate(content.previewText, tokens),
    bodyHtml: fillTemplate(content.bodyHtml, tokens, { escape: true }),
  };
}

export function InviteEmail(input: InviteEmailInput) {
  const { appUrl, content, tokens, subject, previewText, bodyHtml } = resolveInviteEmail(input);

  return (
    <FairPayShell
      title={subject}
      previewText={previewText}
      eyebrow={fillTemplate(content.eyebrow, tokens)}
      heading={fillTemplate(content.heading, tokens)}
      subheading={fillTemplate(content.subheading, tokens)}
      ctaHref={appUrl}
      ctaLabel={fillTemplate(content.ctaLabel, tokens)}
      footerHtml={fillTemplate(content.footerHtml, tokens, { escape: true })}
      tone="invite"
    >
      <RichText html={bodyHtml} data-email-block="invite-intro" />
      <div style={{ marginTop: "14px" }}>
        <EmailPanel
          label={fillTemplate(content.panelLabel, tokens)}
          title={fillTemplate(content.panelTitle, tokens)}
          description={fillTemplate(content.panelDescription, tokens)}
          tone="invite"
          marker="invite-benefits"
        />
      </div>
      <Text style={{ margin: "18px 0 0", fontSize: "12px", lineHeight: 1.7, color: "#94a3b8", textAlign: "center" }}>
        {fillTemplate(content.fallbackLinkLabel, tokens)}{" "}
        <a href={appUrl} style={{ color: "#4f46e5", textDecoration: "none" }}>
          {appUrl}
        </a>
      </Text>
    </FairPayShell>
  );
}

InviteEmail.PreviewProps = {
  inviterName: "Long",
  appUrl: DEFAULT_APP_URL,
} satisfies InviteEmailInput;
