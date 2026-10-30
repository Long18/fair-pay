import inviteStatic from "./content/invite.static.json";
import { formatAsOf } from "./reminder-view-model";
import type { InviteEmailContent, InviteEmailInput } from "./types";
import { DEFAULT_APP_URL, fillTemplate } from "./utils";

export const defaultInviteContent: InviteEmailContent = inviteStatic;

export function resolveInviteEmail(input: InviteEmailInput) {
  const inviterName = input.inviterName?.trim() || "Một người bạn";
  const appUrl = input.appUrl || DEFAULT_APP_URL;
  const content: InviteEmailContent = { ...defaultInviteContent, ...input.content };
  const tokens = { inviterName, appUrl, year: formatAsOf(input.now ?? new Date()).year };
  return {
    inviterName,
    appUrl,
    content,
    tokens,
    subject: fillTemplate(content.subject, tokens),
    previewText: fillTemplate(content.previewText, tokens),
    heading: fillTemplate(content.heading, tokens),
    bodyHtml: fillTemplate(content.bodyHtml, tokens, { escape: true }),
    ctaLabel: fillTemplate(content.ctaLabel, tokens),
    fallbackLinkLabel: fillTemplate(content.fallbackLinkLabel, tokens),
    footer: fillTemplate(content.footer, tokens),
    copyright: fillTemplate(content.copyright, tokens),
  };
}
