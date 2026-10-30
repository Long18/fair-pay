import { render, toPlainText } from "@react-email/render";
import { InviteEmail } from "./invite-email";
import { resolveInviteEmail } from "./resolve-invite";
import type { InviteEmailInput, RenderedEmail } from "./types";

export async function renderInviteEmail(input: InviteEmailInput): Promise<RenderedEmail> {
  const { appUrl, content, subject, previewText, heading, bodyHtml, ctaLabel, footer } = resolveInviteEmail(input);
  const html = await render(<InviteEmail {...input} />);
  const text = [
    heading,
    "",
    toPlainText(bodyHtml, { wordwrap: false }),
    "",
    `${ctaLabel}: ${appUrl}`,
    "",
    footer,
    "",
    content.textSignature,
  ].join("\n");

  return { subject, previewText, html, text };
}
